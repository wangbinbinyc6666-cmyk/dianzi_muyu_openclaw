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
    envId: 'cloud1-d1g4xxsut33977fca'
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

  syncToCloud() {
    this.callCloudFn('addMerit', {
      merit: this.globalData.merit,
      power: this.globalData.power
    }).catch(err => {
      console.warn('[云同步] 后台同步失败:', err.message || err);
    });
  }
});
