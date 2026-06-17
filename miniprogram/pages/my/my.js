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
    showDedicatePopup: false,
    dedicateInputValue: '',
    // 每日签到
    todayCheckedIn: false
  },

  onShow() {
    this.loadUserData();
    this._setupShareMenu();
    this._checkTodayStatus();
    this._autoSyncNickname();  // 新增：自动同步昵称
  },

  // 自动同步昵称到云端
  _autoSyncNickname() {
    const app = getApp();
    const nickName = this.data.nickName;
    if (nickName && nickName.length > 0) {
      // 延迟执行，避免阻塞UI
      setTimeout(() => {
        app.updateUserProfile('nickName', nickName);
      }, 1000);
    }
  },

  // 检查今日签到状态
  _checkTodayStatus() {
    const today = new Date().toDateString();
    const lastCheckIn = wx.getStorageSync('lastCheckInDate');
    const todayCheckedIn = (lastCheckIn === today);
    this.setData({ todayCheckedIn });
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

  // 每日签到
  onDailyCheckIn() {
    const today = new Date().toDateString();
    const lastCheckIn = wx.getStorageSync('lastCheckInDate');

    if (lastCheckIn === today) {
      wx.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }

    // 计算连续签到天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const lastCheckInStr = wx.getStorageSync('lastCheckInDate');

    let streakDays = wx.getStorageSync('checkInStreak') || 0;
    if (lastCheckInStr === yesterdayStr) {
      // 连续签到
      streakDays += 1;
    } else {
      // 断签，重新开始
      streakDays = 1;
    }

    // 计算奖励
    const reward = 2 + (streakDays > 20 ? 20 : streakDays);

    // 更新本地存储
    wx.setStorageSync('lastCheckInDate', today);
    wx.setStorageSync('checkInStreak', streakDays);

    // 更新功德
    const app = getApp();
    const newMerit = (app.globalData.merit || 0) + reward;
    app.globalData.merit = newMerit;
    wx.setStorageSync('merit', newMerit);

    // 更新UI
    this.setData({
      todayCheckedIn: true,
      streakDays: streakDays,
      merit: newMerit
    });

    wx.showToast({
      title: `签到成功！+${reward}功德`,
      icon: 'success'
    });
  },

  // 同步资料到排行榜
  onSyncProfile() {
    const app = getApp();
    const nickName = this.data.nickName;
    const avatarUrl = this.data.avatarUrl;

    if (!nickName) {
      wx.showToast({ title: '请先设置昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '同步中...' });

    // 强制同步到云端
    app.updateUserProfile('nickName', nickName);
    if (avatarUrl) {
      app.updateUserProfile('avatarUrl', avatarUrl);
    }

    // 额外调用一次云函数确保同步
    app.callCloudFn('addMerit', {
      merit: 0,
      power: 0,
      nickName: nickName,
      avatarUrl: avatarUrl
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '同步成功', icon: 'success' });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '同步失败', icon: 'none' });
      console.error('[同步] 失败:', err);
    });
  },

  // ──────────────────────────────────────────
  // 分享菜单启用
  // ──────────────────────────────────────────

  _setupShareMenu() {
    try {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    } catch (e) { /* 兼容旧版本 */ }
    try {
      wx.updateShareMenu({
        withShareTicket: true,
        isUpdatableMessage: false,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    } catch (e) { /* 兼容旧版本 */ }
  },

  // ──────────────────────────────────────────
  // 功德回向弹窗
  // ──────────────────────────────────────────

  showDedicatePopup() {
    this.setData({ showDedicatePopup: true, dedicateInputValue: '' });
  },

  closeDedicatePopup() {
    this.setData({ showDedicatePopup: false, dedicateInputValue: '' });
  },

  onDedicateInput(e) {
    this.setData({ dedicateInputValue: e.detail.value });
  },

  onDedicateMeritSubmit() {
    const target = (this.data.dedicateInputValue || '').trim();
    if (!target) {
      wx.showToast({ title: '请输入回向对象', icon: 'none' });
      return;
    }

    // 保存回向记录到 localStorage
    const records = wx.getStorageSync('dedicateRecords') || [];
    records.unshift({
      target,
      time: Date.now(),
      merit: this.data.merit
    });
    if (records.length > 50) records.length = 50;
    wx.setStorageSync('dedicateRecords', records);

    this.setData({
      dedicateTarget: target,
      showDedicatePopup: false,
      dedicateInputValue: ''
    });

    wx.showToast({
      title: `已回向给 ${target} 🙏`,
      icon: 'none',
      duration: 2000
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
