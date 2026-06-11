/**
 * 电子木鱼 - 小程序入口
 * 初始化云开发环境、全局音频池、本地数据加载
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

  callCloudFn(name, data = {}, timeout = 8000) {
    if (!this.globalData.cloudReady) {
      return Promise.reject(new Error('云开发未初始化'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('云函数调用超时，请确认已部署'));
      }, timeout);

      wx.cloud.callFunction({ name, data })
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
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
   * 更新用户头像和昵称，并同步到云端
   */
  updateUserProfile(field, value) {
    if (!this.globalData.userInfo) {
      this.globalData.userInfo = {};
    }
    this.globalData.userInfo[field] = value;
    wx.setStorageSync(field, value);
    // 触发云同步，头像/昵称会随 syncToCloud 一起上传
    this.syncToCloud();
  },

  /**
   * 小程序切入后台时，强制同步未上报的数据
   */
  onHide() {
    if (this.globalData.pendingSyncMerit > 0 || this.globalData.pendingSyncPower > 0) {
      this.syncToCloud(true);
    }
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

      this.callCloudFn('addMerit', data).catch(err => {
        console.warn('[云同步] 后台同步失败:', err.message || err);
        // 失败时回滚增量，下次重试
        this.globalData.pendingSyncMerit += merit;
        this.globalData.pendingSyncPower += power;
      });
    }
  }
});
