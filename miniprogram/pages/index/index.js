/**
 * 首页 - 木鱼敲击
 * 低延迟音效 + 即时计数 + 云端同步
 *
 * v4.0 增长功能：
 *   - 每日签到 + 连续签到奖励
 *   - 每日目标进度
 *   - 修行里程碑庆祝
 *   - 修行称号体系
 *   - 功德回向
 *   - 动态分享标题（社交货币驱动传播）
 *   - 分享来源追踪
 */

const app = getApp();

// ── 修行称号 ──
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

// ── 修行里程碑（功德值达到时庆祝）──
const MILESTONES = [
  { merit: 10000, label: '万德庄严', emoji: '🌟' },
  { merit: 5000,  label: '功德圆满半', emoji: '✨' },
  { merit: 2000,  label: '两千功德', emoji: '🎊' },
  { merit: 1000,  label: '千功圆满', emoji: '🎉' },
  { merit: 500,   label: '五百功德', emoji: '🏆' },
  { merit: 200,   label: '两百功德', emoji: '🔥' },
  { merit: 100,   label: '百功达成', emoji: '💫' },
  { merit: 50,    label: '五十功德', emoji: '⭐' }
];

// ── 每日目标（基于当前功德等级，保持挑战感）──
function getDailyGoal(merit) {
  if (merit >= 5000) return 500;
  if (merit >= 2000) return 300;
  if (merit >= 1000) return 200;
  if (merit >= 500) return 100;
  if (merit >= 100) return 50;
  return 30;
}

Page({
  data: {
    merit: 0,
    power: 0,
    todayMerit: 0,
    tapping: false,
    autoTapping: false,
    // 增长功能
    checkedIn: false,
    showCheckIn: false,
    streakDays: 0,
    dailyGoal: 30,
    rankTitle: '初来乍到',
    dedicateTarget: '',
    showShareSheet: false
  },

  _autoTapSession: 0,
  _fromShare: false,

  onLoad(options) {
    this.syncFromGlobal();
    this.checkPrivacy();
    this.loadTodayMerit();
    this._autoTapSession = 0;
    this.loadCheckInState();
    this.updateRankTitle();

    // 追踪分享来源
    if (options && options.from) {
      this._fromShare = true;
    }
  },

  onShow() {
    this.syncFromGlobal();
    this.updateRankTitle();
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

  // ──────────────────────────────────────────
  // 签到系统
  // ──────────────────────────────────────────

  loadCheckInState() {
    const lastCheckInDate = wx.getStorageSync('lastCheckInDate') || '';
    const streakDays = wx.getStorageSync('checkInStreak') || 0;
    const today = this._getTodayStr();

    if (lastCheckInDate === today) {
      this.setData({ checkedIn: true, streakDays });
      return;
    }

    // 判断连续签到：昨天签到了就算连续
    const yesterday = this._getYesterdayStr();
    const newStreak = (lastCheckInDate === yesterday) ? streakDays : 0;

    this.setData({
      checkedIn: false,
      streakDays: newStreak,
      dailyGoal: getDailyGoal(this.data.merit),
      showCheckIn: true
    });
  },

  onCheckInTap() {
    if (this.data.checkedIn) {
      wx.showToast({
        title: `今日已签到，连续 ${this.data.streakDays} 天`,
        icon: 'none'
      });
      return;
    }
    this.performCheckIn();
  },

  performCheckIn() {
    const newStreak = this.data.streakDays + 1;
    const today = this._getTodayStr();

    // 签到奖励 = 基础 2 + 连续天数奖励（上限 20）
    const streakBonus = Math.min(newStreak, 20);
    const totalMerit = 2 + streakBonus;
    const totalPower = Math.max(1, Math.floor(streakBonus / 2));

    // 持久化签到状态
    wx.setStorageSync('lastCheckInDate', today);
    wx.setStorageSync('checkInStreak', newStreak);

    // 更新功德
    const result = app.addMeritAndPower(totalMerit, totalPower);
    app.syncToCloud();

    // 今日功德统计
    const todayMerit = (wx.getStorageSync('todayMerit') || 0) + totalMerit;
    wx.setStorageSync('todayMerit', todayMerit);

    this.updateRankTitle();

    this.setData({
      checkedIn: true,
      streakDays: newStreak,
      merit: result.merit,
      power: result.power,
      todayMerit,
      showCheckIn: true
    });

    wx.showToast({
      title: `签到成功 +${totalMerit} 功德`,
      icon: 'success'
    });
  },

  closeCheckIn() {
    this.setData({ showCheckIn: false });
  },

  // ──────────────────────────────────────────
  // 修行称号
  // ──────────────────────────────────────────

  updateRankTitle() {
    const merit = this.data.merit;
    let title = '初来乍到';
    for (const r of RANK_TITLES) {
      if (merit >= r.min) {
        title = r.title;
        break;
      }
    }
    this.setData({ rankTitle: title });
  },

  // ──────────────────────────────────────────
  // 日期工具
  // ──────────────────────────────────────────

  _getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  },

  _getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  },

  // ──────────────────────────────────────────
  // 木鱼敲击
  // ──────────────────────────────────────────

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

    this.setData({ dailyGoal: getDailyGoal(this.data.merit) });
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

    // 按压反馈
    this.setData({ tapping: true });
    setTimeout(() => this.setData({ tapping: false }), 120);

    // 低延迟音效
    app.playTapSound();

    // 计数更新
    const oldMerit = this.data.merit;
    const result = app.addMeritAndPower(1, 1);
    this.setData({
      merit: result.merit,
      power: result.power
    });

    const todayMerit = (wx.getStorageSync('todayMerit') || 0) + 1;
    wx.setStorageSync('todayMerit', todayMerit);
    this.setData({ todayMerit });

    // 里程碑检测
    this._checkMilestone(oldMerit, result.merit);

    // 每日目标检测
    if (todayMerit === this.data.dailyGoal) {
      wx.showToast({
        title: `今日目标达成！+5 念力奖励`,
        icon: 'none',
        duration: 2000
      });
      app.addMeritAndPower(0, 5);
    }

    // 更新称号
    this.updateRankTitle();

    // 云同步
    app.syncToCloud();
  },

  _checkMilestone(oldMerit, newMerit) {
    for (const m of MILESTONES) {
      if (oldMerit < m.merit && newMerit >= m.merit) {
        // 延迟弹出，避免和每日目标 toast 冲突
        setTimeout(() => {
          wx.showModal({
            title: `${m.emoji} 修行里程碑`,
            content: `恭喜达成「${m.label}」！\n累计功德 ${m.merit} 点\n\n分享此成就，广结善缘 🙏`,
            confirmText: '分享',
            cancelText: '继续修行',
            confirmColor: '#FFD700',
            success: (res) => {
              if (res.confirm) this.onShare();
            }
          });
        }, 500);
        break;
      }
    }
  },

  // ──────────────────────────────────────────
  // 自动敲击
  // ──────────────────────────────────────────

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

  // ──────────────────────────────────────────
  // 导航
  // ──────────────────────────────────────────

  goToRanking() {
    wx.switchTab({ url: '/pages/ranking/ranking' });
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

  /**
   * 动态分享标题 —— 社交货币驱动传播
   *
   * 设计原则：
   * 1. 回向 > 里程碑 > 连续签到 > 高功德 > 每日目标 > 修行称号 > 默认
   * 2. 每个标题都是「社交货币」：展示成就、引发好奇、传递情感
   * 3. 回向分享带情感钩子，是最强传播场景
   */
  onShareAppMessage() {
    const { merit, power, streakDays, dailyGoal, todayMerit, rankTitle, dedicateTarget } = this.data;
    let title;

    if (dedicateTarget) {
      title = `我为${dedicateTarget}敲了 ${merit} 下木鱼，愿功德回向 TA 🙏`;
    } else if (merit >= 1000) {
      title = `功德 ${merit} | ${rankTitle} —— 这个木鱼有点灵`;
    } else if (streakDays >= 7) {
      title = `我连续 ${streakDays} 天敲木鱼了，功德 ${merit}，你要不要一起？`;
    } else if (merit >= 100) {
      title = `我已积攒 ${merit} 点功德，修行境界：${rankTitle}`;
    } else if (todayMerit >= dailyGoal) {
      title = `今日功德圆满！敲了 ${todayMerit} 下木鱼，一起来试试？`;
    } else if (rankTitle !== '初来乍到') {
      title = `我的修行境界：${rankTitle}，功德 ${merit}，你也来试试？`;
    } else {
      title = '一起来敲电子木鱼，积攒功德吧 🙏';
    }

    return {
      title,
      path: '/pages/index/index?from=share'
    };
  },

  /**
   * 朋友圈分享 —— 展示型社交货币
   */
  onShareTimeline() {
    const { merit, power, streakDays, rankTitle, dedicateTarget } = this.data;
    let title;

    if (dedicateTarget) {
      title = `为${dedicateTarget}积攒功德 ${merit} 🙏`;
    } else if (streakDays >= 3) {
      title = `连续 ${streakDays} 天修行 | ${rankTitle} | 功德 ${merit}`;
    } else {
      title = `${rankTitle} | 功德 ${merit} | 念力 ${power}`;
    }

    return { title };
  }
});
