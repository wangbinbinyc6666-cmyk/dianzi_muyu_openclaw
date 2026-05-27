/**
 * 首页 - 木鱼敲击逻辑
 *
 * 交互流程：
 * 1. 点击木鱼 → 触发动画 class toggle
 * 2. 播放音效（/audio/tap.mp3）
 * 3. 触发短震动
 * 4. 功德+1、念力+1
 * 5. 本地存储 + 云端同步
 */

const app = getApp();

Page({
  data: {
    merit: 0,
    power: 0,
    todayMerit: 0,
    isTapping: false,
    meritAnimating: false,
    powerAnimating: false
  },

  onLoad() {
    this.syncFromGlobal();

    // 读取今日功德
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

  /**
   * 敲击木鱼 - 核心交互
   */
  onTapWoodfish() {
    // 1. 触发敲击动画
    this.setData({ isTapping: true });
    setTimeout(() => {
      this.setData({ isTapping: false });
    }, 100);

    // 2. 播放音效（懒加载，首次敲击时才初始化音频）
    try {
      const audioCtx = app.getAudioContext();
      audioCtx.seek(0);
      audioCtx.play();
    } catch (e) {
      // 音效文件不存在时静默处理
    }

    // 3. 触发短震动
    try {
      wx.vibrateShort({ type: 'light' });
    } catch (e) {
      // 部分设备不支持
    }

    // 4. 更新计数
    const result = app.addMeritAndPower(1, 1);
    this.setData({
      merit: result.merit,
      power: result.power,
      meritAnimating: true,
      powerAnimating: true
    });

    // 更新今日功德
    const todayMerit = (wx.getStorageSync('todayMerit') || 0) + 1;
    wx.setStorageSync('todayMerit', todayMerit);
    this.setData({ todayMerit });

    // 计数器动画复位
    setTimeout(() => {
      this.setData({ meritAnimating: false, powerAnimating: false });
    }, 200);

    // 5. 每10次敲击后台同步一次到云数据库
    if (result.merit % 10 === 0) {
      app.syncToCloud();
    }
  },

  goToAI() {
    wx.navigateTo({
      url: '/pages/ai-chat/chat'
    });
  },

  goToRanking() {
    wx.switchTab({
      url: '/pages/ranking/ranking'
    });
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
