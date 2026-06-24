/**
 * 电子木鱼 - 小程序入口
 * 初始化云开发环境、全局音频池、本地数据加载
 *
 * v3.0 变更（阶段3 云架构优化）：
 *   - callCloudFn 新增自动重试（1 次重试，指数退避）
 *   - syncToCloud 新增离线队列（失败数据暂存 localStorage，下次启动补发）
 *   - onLaunch/onShow 自动补发离线队列
 */

App({
  globalData: {
    merit: 0,
    power: 0,
    userInfo: null,
    cloudReady: false,
    audioReady: false,
    envId: 'cloud1-d1g4xxsut33977fca',
    pendingSyncMerit: 0,
    pendingSyncPower: 0
  },

  _audioPool: [],
  _audioIndex: 0,

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({ env: this.globalData.envId });
      this.globalData.cloudReady = true;
      console.log('[云开发] 初始化完成');
    }

    const merit = wx.getStorageSync('merit') || 0;
    const power = wx.getStorageSync('power') || 0;
    this.globalData.merit = merit;
    this.globalData.power = power;

    this.getUserProfile();

    // 隐私授权监听（微信审核必须）
    // 不自动 resolve，由微信原生隐私弹窗让用户自主选择
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve, event) => {
        // 微信会自动弹出内置隐私授权弹窗，用户自主选择同意或拒绝
        // 此处不做任何操作，避免绕过用户选择
        console.log('[隐私] 收到授权请求');
      });
    }

    // 预加载音效池：解决手机上首次敲击声音延迟大的问题
    this._initAudioPool();

    // 启动时补发离线队列中未成功同步的数据
    this._flushOfflineQueue();
  },

  /**
   * 音效池：3 个预加载的 InnerAudioContext 实例
   * 敲击时轮换使用，避免 seek(0) 的异步延迟
   */
  _initAudioPool() {
    const POOL_SIZE = 3;
    let loaded = 0;

    for (let i = 0; i < POOL_SIZE; i++) {
      const ctx = wx.createInnerAudioContext();
      ctx.src = '/audio/tap.mp3';
      ctx.autoplay = false;
      ctx.obeyMuteSwitch = false;

      ctx.onCanplay(() => {
        loaded++;
        if (loaded === 1) {
          this.globalData.audioReady = true;
        }
      });

      ctx.onError((err) => {
        console.warn('[音效] 加载失败:', err.message);
      });

      this._audioPool.push(ctx);
    }
  },

  /**
   * 播放敲击音效（低延迟）
   * 从音效池中取下一个实例播放，避免单实例 seek 等待
   */
  playTapSound() {
    if (this._audioPool.length === 0) return;
    const ctx = this._audioPool[this._audioIndex];
    this._audioIndex = (this._audioIndex + 1) % this._audioPool.length;
    ctx.seek(0);
    ctx.play();
  },

  /**
   * 云函数调用封装（带自动重试）
   *
   * 特性：
   *   - 超时控制（默认 8s）
   *   - 自动重试 1 次（指数退避，首次失败后等 1s 再试）
   *   - 结构化错误日志
   *
   * @param {string} name 云函数名称
   * @param {object} data 调用参数
   * @param {number} timeout 超时时间（ms）
   * @param {number} retries 重试次数（默认 1）
   */
  callCloudFn(name, data = {}, timeout = 8000, retries = 1) {
    if (!this.globalData.cloudReady) {
      return Promise.reject(new Error('云开发未初始化'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`云函数 ${name} 调用超时（${timeout}ms），请确认已部署`));
      }, timeout);

      wx.cloud.callFunction({ name, data })
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          if (retries > 0) {
            console.warn(`[云函数] ${name} 调用失败，${retries} 次重试中...`, err.message || err);
            // 指数退避：1s 后重试
            setTimeout(() => {
              this.callCloudFn(name, data, timeout, retries - 1)
                .then(resolve)
                .catch(reject);
            }, 1000);
          } else {
            console.error(`[云函数] ${name} 调用失败（已耗尽重试）:`, err.message || err);
            reject(err);
          }
        });
    });
  },

  getUserProfile() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  /**
   * 检查是否已设置昵称
   * @returns {boolean} 是否已设置昵称
   */
  checkNicknameSet() {
    const nickName = wx.getStorageSync('nickName');
    return nickName && nickName.length > 0;
  },

  /**
   * 更新用户头像和昵称，并同步到云端
   */
  updateUserProfile(field, value) {
    if (!this.globalData.userInfo) {
      this.globalData.userInfo = {};
    }
    this.globalData.userInfo[field] = value;
    wx.setStorageSync(field, value);
    // 强制立即同步到云端，确保排行榜显示最新昵称
    this.syncToCloud(true);
  },

  /**
   * 小程序切入后台时，强制同步未上报的数据
   */
  onHide() {
    if (this.globalData.pendingSyncMerit > 0 || this.globalData.pendingSyncPower > 0) {
      this.syncToCloud(true);
    }
  },

  /**
   * 小程序从后台切回前台时，补发离线队列
   */
  onShow() {
    this._flushOfflineQueue();
  },

  addMeritAndPower(m = 1, p = 1) {
    this.globalData.merit += m;
    this.globalData.power += p;
    wx.setStorageSync('merit', this.globalData.merit);
    wx.setStorageSync('power', this.globalData.power);
    return {
      merit: this.globalData.merit,
      power: this.globalData.power
    };
  },

  /**
   * 云同步：累积增量，每 20 次敲击批量上报一次
   * 小程序切入后台时强制 flush（force=true）
   *
   * v3.0 变更：
   *   - 重试失败后将数据存入离线队列（localStorage 持久化）
   *   - 离线队列上限 50 条，超出丢弃最旧的
   *
   * 修复说明：之前直接发送 globalData 累计值，但云函数用 _.inc() 做增量累加，
   * 导致云端数据膨胀。现改为发送增量 delta，保持语义一致。
   */
  syncToCloud(force = false) {
    this.globalData.pendingSyncMerit += 1;
    this.globalData.pendingSyncPower += 1;

    if (force || this.globalData.pendingSyncMerit >= 20) {
      const merit = this.globalData.pendingSyncMerit;
      const power = this.globalData.pendingSyncPower;
      this.globalData.pendingSyncMerit = 0;
      this.globalData.pendingSyncPower = 0;

      const data = { merit, power };

      // 附带头像和昵称（如果有变更）
      const userInfo = this.globalData.userInfo;
      if (userInfo) {
        if (userInfo.avatarUrl) data.avatarUrl = userInfo.avatarUrl;
        if (userInfo.nickName) data.nickName = userInfo.nickName;
      }

      // 确保昵称从本地存储同步（兼容旧版本）
      const localNickName = wx.getStorageSync('nickName');
      if (localNickName && !data.nickName) {
        data.nickName = localNickName;
      }

      this.callCloudFn('addMerit', data).catch(err => {
        console.warn('[云同步] 同步失败（含重试）:', err.message || err);
        // 回滚增量到 pending 队列，下次敲击时会重新累积
        this.globalData.pendingSyncMerit += merit;
        this.globalData.pendingSyncPower += power;
        // 同时存入离线队列持久化，防止小程序被杀后数据丢失
        this._saveToOfflineQueue(data);
      });
    }
  },

  // ──────────────────────────────────────────
  // 离线队列：localStorage 持久化，启动/回前台时补发
  // ──────────────────────────────────────────

  /**
   * 将同步失败的数据存入离线队列
   * @param {object} data 待同步的数据 { merit, power, avatarUrl?, nickName? }
   */
  _saveToOfflineQueue(data) {
    try {
      const queue = wx.getStorageSync('offlineSyncQueue') || [];
      queue.push({ ...data, timestamp: Date.now() });
      // 队列上限 50 条，超出丢弃最旧的
      if (queue.length > 50) {
        queue.shift();
        console.warn('[离线队列] 已满 50 条，丢弃最旧记录');
      }
      wx.setStorageSync('offlineSyncQueue', queue);
      console.log(`[离线队列] 已暂存，当前 ${queue.length} 条待同步`);
    } catch (e) {
      console.error('[离线队列] 存储失败:', e.message);
    }
  },

  /**
   * 补发离线队列中所有待同步数据
   * 合并所有待同步条目为一次调用，减少云函数调用次数
   */
  _flushOfflineQueue() {
    if (!this.globalData.cloudReady) return;

    try {
      const queue = wx.getStorageSync('offlineSyncQueue');
      if (!queue || queue.length === 0) return;

      console.log(`[离线队列] 开始补发 ${queue.length} 条待同步数据`);

      // 合并所有条目的 merit 和 power
      let totalMerit = 0;
      let totalPower = 0;
      let latestAvatarUrl = '';
      let latestNickName = '';

      for (const item of queue) {
        totalMerit += item.merit || 0;
        totalPower += item.power || 0;
        if (item.avatarUrl) latestAvatarUrl = item.avatarUrl;
        if (item.nickName) latestNickName = item.nickName;
      }

      // 清空队列（先清再发，如果发送失败会重新由 syncToCloud 存回）
      wx.setStorageSync('offlineSyncQueue', []);

      const data = { merit: totalMerit, power: totalPower };
      if (latestAvatarUrl) data.avatarUrl = latestAvatarUrl;
      if (latestNickName) data.nickName = latestNickName;

      this.callCloudFn('addMerit', data).then(() => {
        console.log(`[离线队列] 补发成功: merit=${totalMerit}, power=${totalPower}`);
      }).catch(err => {
        console.warn('[离线队列] 补发失败，重新暂存:', err.message || err);
        this._saveToOfflineQueue(data);
      });
    } catch (e) {
      console.error('[离线队列] 读取失败:', e.message);
    }
  }
});
