/**
 * 排行榜页面
 * 从云数据库获取功德排名前100的用户 + 当前用户排名
 *
 * v2.0 变更：
 *   - 使用云函数返回的 userRank 字段（即使不在前100也有排名）
 *   - 底部提示改为显示总参与人数
 */

const app = getApp();

Page({
  data: {
    rankingList: [],
    myRank: null,
    loading: true,
    loadError: false,
    refreshing: false,
    totalUsers: 0,
    hasNickname: false
  },

  onShow() {
    // 延迟加载，确保昵称同步到云端后再获取排行榜数据
    setTimeout(() => {
      this.loadRanking();
      this._checkNickname();
    }, 500);
  },

  /**
   * 检查是否已设置昵称
   */
  _checkNickname() {
    const nickName = wx.getStorageSync('nickName');
    this.setData({
      hasNickname: nickName && nickName.length > 0
    });
  },

  /**
   * 跳转到设置昵称
   */
  goToSetNickname() {
    wx.switchTab({ url: '/pages/my/my' });
  },

  async loadRanking() {
    this.setData({ loading: true, refreshing: true });

    try {
      const res = await app.callCloudFn('getMeritRanking', { limit: 100 });

      const list = res.result.list || [];
      const currentOpenId = res.result.currentOpenId || '';
      const totalUsers = res.result.totalUsers || 0;
      // v2.0 新增：云函数直接返回当前用户的排名信息
      const userRank = res.result.userRank;

      const rankingList = list.map(item => ({
        ...item,
        isMe: item._openid === currentOpenId
      }));

      // 先尝试从前100名中找到自己
      const myItem = rankingList.find(item => item.isMe);

      // 确定 myRank：优先使用云函数返回的 userRank（即使不在前100也有值）
      let myRank = null;
      if (userRank) {
        // 云函数返回的排名（始终准确）
        myRank = {
          rank: userRank.rank,
          merit: userRank.merit,
          power: userRank.power
        };
      } else if (myItem) {
        // 降级：使用列表中的排名
        myRank = {
          rank: myItem.rank,
          merit: myItem.merit,
          power: myItem.power || 0
        };
      } else {
        // 尝试从缓存恢复（云函数返回了列表但没有 userRank 的兼容情况）
        const cache = wx.getStorageSync('rankingCache');
        if (cache) {
          try {
            const cacheData = JSON.parse(cache);
            if (cacheData.myRank) {
              myRank = cacheData.myRank;
            }
          } catch (e) {
            // 缓存解析失败
          }
        }
      }

      this.setData({
        rankingList,
        myRank,
        totalUsers,
        loading: false,
        loadError: false,
        refreshing: false
      });

      // 缓存排行榜数据到本地，供「我的」页面复用（避免重复调用云函数）
      wx.setStorageSync('rankingCache', JSON.stringify({
        list: rankingList,
        myRank: this.data.myRank,
        totalUsers,
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
          myRank: data.myRank || null,
          totalUsers: data.totalUsers || 0
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
      },
      totalUsers: 1
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
