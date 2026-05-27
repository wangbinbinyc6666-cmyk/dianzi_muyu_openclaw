/**
 * 排行榜页面
 * 从云数据库获取功德排名前100的用户
 */

const app = getApp();

Page({
  data: {
    rankingList: [],
    myRank: null,
    loading: true
  },

  onShow() {
    this.loadRanking();
  },

  async loadRanking() {
    this.setData({ loading: true });

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
        loading: false
      });
    } catch (err) {
      console.error('[排行榜] 加载失败:', err.message);
      this.setData({ loading: false });
      this.fallbackToLocal();
    }
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

    // 不再弹 toast，改为在页面内显示本地模式
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
