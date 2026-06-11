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
    myRank: '--',
    loading: true
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
      nickName: (userInfo && userInfo.nickName) || wx.getStorageSync('nickName') || '',
      loading: false
    });

    this.loadMyRank();
  },

  /**
   * 获取我的排名：复用排行榜页面的缓存数据，不再单独调用云函数
   */
  async loadMyRank() {
    try {
      const cache = wx.getStorageSync('rankingCache');
      if (cache) {
        const data = JSON.parse(cache);
        if (data.myRank) {
          this.setData({ myRank: data.myRank.rank });
        } else if (data.list && data.list.length > 0) {
          this.setData({ myRank: `${data.list.length}+` });
        }
      }
    } catch (e) {
      // 缓存不存在或解析失败，保持默认显示
    }
  },

  /**
   * 选择头像后，同步到云端
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
    app.updateUserProfile('avatarUrl', avatarUrl);
  },

  /**
   * 设置昵称后，同步到云端
   */
  onNicknameBlur(e) {
    const nickName = e.detail.value;
    if (!nickName) return;
    this.setData({ nickName });
    app.updateUserProfile('nickName', nickName);
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
