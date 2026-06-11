/**
 * 首页 - 木鱼敲击
 * 低延迟音效 + 即时计数 + 云端同步
 */

const app = getApp();

Page({
  data: {
    merit: 0,
    power: 0,
    todayMerit: 0,
    tapping: false,
    autoTapping: false
  },

  _autoTapSession: 0,

  onLoad() {
    this.syncFromGlobal();
    this.checkPrivacy();
    this.loadTodayMerit();
    this._autoTapSession = 0;
  },

  checkPrivacy() {
    // 检查隐私授权状态（微信审核必须）
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res) => {
          if (res.needAuthorization) {
            console.log('[隐私] 需要用户授权隐私协议');
          }
        },
        fail: () => {}
      });
    }
  },

  loadTodayMerit() {
    const todayMerit = wx.getStorageSync('todayMerit') || 0;
    const todayDate = wx.getStorageSync('todayDate') || '';
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    if (todayDate !== dateStr) {
      wx.setStorageSync('todayMerit', 0);
      wx.setStorageSync('todayDate', dateStr);
      this.setData({ todayMerit: 0 });
    } else {
      this.setData({ todayMerit });
    }
  },

  onShow() {
    this.syncFromGlobal();
  },

  onHide() {
    this.stopAutoTap();
  },

  syncFromGlobal() {
    this.setData({
      merit: app.globalData.merit,
      power: app.globalData.power
    });
  },

  onTapWoodfish() {
    // 自动敲击防刷榜：单次开启最多 100 次
    if (this.data.autoTapping) {
      this._autoTapSession++;
      if (this._autoTapSession > 100) {
        this.stopAutoTap();
        wx.showToast({ title: '本轮自动积累已达上限', icon: 'none' });
        return;
      }
    }

    // 按压反馈：瞬时亮度变化（不涉及布局偏移）
    this.setData({ tapping: true });
    setTimeout(() => this.setData({ tapping: false }), 120);

    // 低延迟音效（预加载音效池，首次已解码）
    app.playTapSound();

    // 计数更新
    const result = app.addMeritAndPower(1, 1);
    this.setData({
      merit: result.merit,
      power: result.power
    });

    const todayMerit = (wx.getStorageSync('todayMerit') || 0) + 1;
    wx.setStorageSync('todayMerit', todayMerit);
    this.setData({ todayMerit });

    // 云同步：增量累积，由 app.syncToCloud 控制批量上报
    app.syncToCloud();
  },

  toggleAutoTap() {
    if (this.data.autoTapping) {
      this.stopAutoTap();
    } else {
      this.startAutoTap();
    }
  },

  startAutoTap() {
    this._autoTapSession = 0;
    this.setData({ autoTapping: true });
    this._autoTimer = setInterval(() => {
      this.onTapWoodfish();
    }, 800);
  },

  stopAutoTap() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
    this.setData({ autoTapping: false });
  },

  goToRanking() {
    wx.switchTab({ url: '/pages/ranking/ranking' });
  },

  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onShareAppMessage() {
    return {
      title: `我已积攒 ${this.data.merit} 点功德，一起来敲木鱼吧！`,
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: `功德 ${this.data.merit} | 念力 ${this.data.power}`
    };
  }
});
