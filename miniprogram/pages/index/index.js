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
    tapping: false
  },

  onLoad() {
    this.syncFromGlobal();

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

  syncFromGlobal() {
    this.setData({
      merit: app.globalData.merit,
      power: app.globalData.power
    });
  },

  onTapWoodfish() {
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

    if (result.merit % 10 === 0) {
      app.syncToCloud();
    }
  },

  goToAI() {
    wx.navigateTo({ url: '/pages/ai-chat/chat' });
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
