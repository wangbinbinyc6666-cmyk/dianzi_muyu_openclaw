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
   * 获取我的排名：优先使用排行榜缓存中云端返回的精确排名
   *
   * v2.0：
   *   - 缓存中包含云端返回的 userRank（即使不在前100也有精确排名）
   *   - 缓存为空时，主动调用云函数获取排名（不依赖用户先访问排行榜）
   */
  async loadMyRank() {
    // 1. 先尝试从缓存读取
    try {
      const cache = wx.getStorageSync('rankingCache');
      if (cache) {
        const data = JSON.parse(cache);
        if (data.myRank) {
          this.setData({ myRank: data.myRank.rank });
          return;
        }
        if (data.list && data.list.length > 0) {
          this.setData({ myRank: `${data.list.length}+` });
          return;
        }
      }
    } catch (e) {
      // 缓存不存在或解析失败
    }

    // 2. 缓存为空 → 主动调用云函数获取排名
    try {
      const res = await app.callCloudFn('getMeritRanking', { limit: 1 });
      const userRank = res.result.userRank;
      if (userRank) {
        this.setData({ myRank: userRank.rank });
      }
    } catch (err) {
      console.warn('[我的] 获取排名失败:', err.message || err);
      // 保持默认 '--'
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
