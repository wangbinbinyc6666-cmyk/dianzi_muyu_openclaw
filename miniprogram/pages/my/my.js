/**
 * 我的页面
 * 展示用户信息、功德统计、功能入口
 *
 * v4.0 增长功能：
 *   - 修行称号展示
 *   - 连续签到天数
 *   - 功德回向（为他人敲木鱼）
 *   - 动态分享标题
 */

const app = getApp();

// 修行称号（与首页保持一致）
const RANK_TITLES = [
  { min: 10000, title: '大彻大悟' },
  { min: 5000,  title: '菩萨心肠' },
  { min: 2000,  title: '得道高僧' },
  { min: 1000,  title: '佛心初现' },
  { min: 500,   title: '渐入佳境' },
  { min: 200,   title: '诚心向佛' },
  { min: 100,   title: '初窥门径' },
  { min: 50,    title: '心有所悟' },
  { min: 10,    title: '小有功德' },
  { min: 0,     title: '初来乍到' }
];

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    merit: 0,
    power: 0,
    myRank: '--',
    loading: true,
    // 增长功能
    streakDays: 0,
    rankTitle: '初来乍到',
    dedicateTarget: '',
    showShareSheet: false
  },

  onShow() {
    this.loadUserData();
  },

  loadUserData() {
    const { merit, power, userInfo } = app.globalData;

    // 计算修行称号
    let rankTitle = '初来乍到';
    for (const r of RANK_TITLES) {
      if (merit >= r.min) {
        rankTitle = r.title;
        break;
      }
    }

    // 加载签到天数
    const streakDays = wx.getStorageSync('checkInStreak') || 0;

    this.setData({
      merit,
      power,
      rankTitle,
      streakDays,
      avatarUrl: (userInfo && userInfo.avatarUrl) || wx.getStorageSync('avatarUrl') || '',
      nickName: (userInfo && userInfo.nickName) || wx.getStorageSync('nickName') || '',
      loading: false
    });

    this.loadMyRank();
  },

  /**
   * 获取我的排名
   */
  async loadMyRank() {
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
      // 缓存不存在
    }

    try {
      const res = await app.callCloudFn('getMeritRanking', { limit: 1 });
      const userRank = res.result.userRank;
      if (userRank) {
        this.setData({ myRank: userRank.rank });
      }
    } catch (err) {
      console.warn('[我的] 获取排名失败:', err.message || err);
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
    app.updateUserProfile('avatarUrl', avatarUrl);
  },

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

  showAbout() {
    wx.showModal({
      title: '关于电子木鱼',
      content: '电子木鱼 v2.0.0\n\n一款模拟敲击木鱼积攒功德的禅意小程序。\n\n🙏 每日签到 · 功德回向 · 修行排行\n\n一敲一功德，心诚则灵。\n\n🙏 愿世界和平，众生安康 🙏',
      showCancel: false,
      confirmText: '阿弥陀佛',
      confirmColor: '#FFD700'
    });
  },

  // ──────────────────────────────────────────
  // 分享（增强版）
  // ──────────────────────────────────────────

  onShare() {
    this.setData({ showShareSheet: true });
  },

  closeShareSheet() {
    this.setData({ showShareSheet: false });
  },

  onNativeShare() {
    this.setData({ showShareSheet: false, dedicateTarget: '' });
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onShareTimelineClick() {
    this.setData({ showShareSheet: false, dedicateTarget: '' });
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline']
    });
  },

  onDedicateMerit() {
    this.setData({ showShareSheet: false });
    wx.showModal({
      title: '功德回向',
      content: '为他人敲木鱼，将功德回向给TA 🙏\n\n请输入回向对象的名字',
      placeholderText: '例如：父母、朋友',
      confirmText: '生成回向卡片',
      confirmColor: '#FFD700',
      success: (res) => {
        if (res.confirm && res.content) {
          const target = res.content.replace('为他人敲木鱼，将功德回向给TA 🙏\n\n请输入回向对象的名字', '').trim();
          if (target) {
            this.setData({ dedicateTarget: target });
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage', 'shareTimeline']
            });
          }
        }
      }
    });
  },

  onShareAppMessage() {
    const { merit, power, streakDays, rankTitle, dedicateTarget } = this.data;
    let title;

    if (dedicateTarget) {
      title = `我为${dedicateTarget}积攒了 ${merit} 功德，愿 TA 平安喜乐 🙏`;
    } else if (merit >= 1000) {
      title = `功德 ${merit} | ${rankTitle} —— 一起来修行吧`;
    } else if (streakDays >= 7) {
      title = `我已连续修行 ${streakDays} 天，功德 ${merit}，你要不要一起？`;
    } else if (merit >= 100) {
      title = `我已积攒 ${merit} 点功德，境界：${rankTitle}`;
    } else if (rankTitle !== '初来乍到') {
      title = `我的修行境界：${rankTitle}，功德 ${merit}`;
    } else {
      title = '一起来敲电子木鱼，积攒功德吧 🙏';
    }

    return {
      title,
      path: '/pages/index/index?from=share'
    };
  },

  onShareTimeline() {
    const { merit, power, streakDays, rankTitle, dedicateTarget } = this.data;
    let title;

    if (dedicateTarget) {
      title = `为${dedicateTarget}积攒功德 ${merit} 🙏`;
    } else if (streakDays >= 3) {
      title = `连续修行 ${streakDays} 天 | ${rankTitle} | 功德 ${merit}`;
    } else {
      title = `${rankTitle} | 功德 ${merit} | 念力 ${power}`;
    }

    return { title };
  }
});
