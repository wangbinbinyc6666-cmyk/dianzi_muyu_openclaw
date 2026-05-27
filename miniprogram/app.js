/**
 * 电子木鱼 - 小程序入口
 * 初始化云开发环境、全局音频、本地数据加载
 */

App({
  globalData: {
    merit: 0,        // 功德值
    power: 0,        // 念力值
    userInfo: null,  // 用户信息（头像、昵称）
    audioContext: null,
    cloudReady: false,
    // 云开发环境ID
    envId: 'cloud1-d1g4xxsut33977fca'
  },

  onLaunch() {
    // ── 初始化云开发 ──
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.globalData.envId
      });
      this.globalData.cloudReady = true;
      console.log('[云开发] 初始化完成');
    }

    // ── 加载本地功德数据 ──
    const merit = wx.getStorageSync('merit') || 0;
    const power = wx.getStorageSync('power') || 0;
    this.globalData.merit = merit;
    this.globalData.power = power;

    // ── 获取用户信息（可选） ──
    this.getUserProfile();
  },

  /**
   * 带超时的云函数调用
   * 避免云函数未部署时长时间阻塞（默认15秒 → 缩短为3秒）
   */
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

  /**
   * 获取用户头像和昵称
   */
  getUserProfile() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  /**
   * 获取音频上下文（懒初始化，首次敲击时才加载）
   */
  getAudioContext() {
    if (!this.globalData.audioContext) {
      this.globalData.audioContext = wx.createInnerAudioContext();
      this.globalData.audioContext.src = '/audio/tap.mp3';
      this.globalData.audioContext.onError((err) => {
        console.warn('[音效] 加载失败，请检查 /audio/tap.mp3 是否存在', err);
      });
    }
    return this.globalData.audioContext;
  },

  /**
   * 更新全局功德/念力值，并同步到本地存储
   */
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
   * 同步功德数据到云数据库（带超时保护）
   */
  syncToCloud() {
    this.callCloudFn('addMerit', {
      merit: this.globalData.merit,
      power: this.globalData.power
    }).catch(err => {
      console.warn('[云同步] 后台同步失败:', err.message || err);
    });
  }
});
