/**
 * 我的页面
 * 展示用户信息、功德统计、功能入口
 */

const app = getApp();

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    merit: 0,
    power: 0,
    myRank: '--'
  },

  onShow() {
    this.loadUserData();
  },

  loadUserData() {
    const { merit, power, userInfo } = app.globalData;

    this.setData({
      merit,
      power,
      avatarUrl: (userInfo && userInfo.avatarUrl) || wx.getStorageSync('avatarUrl') || '',
      nickName: (userInfo && userInfo.nickName) || wx.getStorageSync('nickName') || ''
    });

    this.loadMyRank();
  },

  async loadMyRank() {
    try {
      const res = await app.callCloudFn('getMeritRanking', { limit: 100 });

      const list = res.result.list || [];
      const currentOpenId = res.result.currentOpenId || '';
      const myItem = list.find(item => item._openid === currentOpenId);

      if (myItem) {
        this.setData({ myRank: myItem.rank });
      } else if (list.length > 0) {
        this.setData({ myRank: `${list.length}+` });
      }
    } catch (e) {
      // 云函数未部署时保持默认显示
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    wx.setStorageSync('avatarUrl', avatarUrl);

    if (app.globalData.userInfo) {
      app.globalData.userInfo.avatarUrl = avatarUrl;
    } else {
      app.globalData.userInfo = { avatarUrl };
    }

    this.setData({ avatarUrl });
  },

  onNicknameBlur(e) {
    const nickName = e.detail.value;
    if (!nickName) return;

    wx.setStorageSync('nickName', nickName);

    if (app.globalData.userInfo) {
      app.globalData.userInfo.nickName = nickName;
    } else {
      app.globalData.userInfo = { nickName };
    }

    this.setData({ nickName });
  },

  goToAI() {
    wx.navigateTo({ url: '/pages/ai-chat/chat' });
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  goToAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement' });
  },

  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  showAbout() {
    wx.showModal({
      title: '关于电子木鱼',
      content: '电子木鱼 v1.0.0\n\n一款模拟敲击木鱼积攒功德的禅意小程序。\n\n一敲一功德，心诚则灵。\n\n🙏 愿世界和平，众生安康 🙏',
      showCancel: false,
      confirmText: '阿弥陀佛',
      confirmColor: '#FFD700'
    });
  },

  onShareAppMessage() {
    return {
      title: `我已积攒 ${this.data.merit} 点功德，一起来修行吧！`,
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: `功德 ${this.data.merit} | 念力 ${this.data.power} | 排名 ${this.data.myRank}`
    };
  }
});
