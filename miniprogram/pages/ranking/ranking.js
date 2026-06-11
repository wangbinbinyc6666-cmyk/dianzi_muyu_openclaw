/**
 * 排行榜页面
 * 从云数据库获取功德排名前100的用户
 */

const app = getApp();

Page({
  data: {
    rankingList: [],
    myRank: null,
    loading: true,
    loadError: false,
    refreshing: false
  },

  onShow() {
    this.loadRanking();
  },

  async loadRanking() {
    this.setData({ loading: true, refreshing: true });

    try {
      const res = await app.callCloudFn('getMeritRanking', { limit: 100 });

      const list = res.result.list || [];
      const currentOpenId = res.result.currentOpenId || '';

      const rankingList = list.map(item => ({
        ...item,
        isMe: item._openid === currentOpenId
      }));

      const myItem = rankingList.find(item => item.isMe);

      this.setData({
        rankingList,
        myRank: myItem ? {
          rank: myItem.rank,
          merit: myItem.merit,
          power: myItem.power || 0
        } : null,
        loading: false,
        loadError: false,
        refreshing: false
      });

      // 缓存排行榜数据到本地，供「我的」页面复用（避免重复调用云函数）
      wx.setStorageSync('rankingCache', JSON.stringify({
        list: rankingList,
        myRank: this.data.myRank,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('[排行榜] 加载失败:', err.message);
      this.setData({ loading: false, loadError: true, refreshing: false });
      // 尝试从缓存恢复，缓存可用时隐藏错误态
      const hasCache = this._loadFromCache();
      if (hasCache) {
        this.setData({ loadError: false });
      }
    }
  },

  /**
   * 从本地缓存加载排行榜数据（云函数不可用时的降级方案）
   */
  _loadFromCache() {
    try {
      const cache = wx.getStorageSync('rankingCache');
      if (cache) {
        const data = JSON.parse(cache);
        this.setData({
          rankingList: data.list || [],
          myRank: data.myRank || null
        });
        return true;
      }
    } catch (e) {
      // 缓存解析失败，继续走 fallback
    }
    this.fallbackToLocal();
    return true; // fallback 也有数据
  },

  fallbackToLocal() {
    this.setData({
      rankingList: [{
        rank: 1,
        nickName: '你（本地模式）',
        merit: app.globalData.merit,
        power: app.globalData.power,
        isMe: true
      }],
      myRank: {
        rank: 1,
        merit: app.globalData.merit,
        power: app.globalData.power
      }
    });
  },

  onPullDownRefresh() {
    this.loadRanking().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: '功德排行榜，看看谁修行最精进！',
      path: '/pages/ranking/ranking'
    };
  }
});
