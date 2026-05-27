/**
 * 云函数：getMeritRanking
 * 功能：获取功德排行榜（按功德值降序排列）
 *
 * 调用方式：wx.cloud.callFunction({ name: 'getMeritRanking', data: { limit: 100 } })
 */

const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100; // 微信云数据库单次查询最大条数

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const currentOpenId = wxContext.OPENID;

  // 查询条数限制，最大100
  const limit = Math.min(event.limit || 100, MAX_LIMIT);

  try {
    // 按功德值降序查询用户列表
    // 只获取必要字段，减少数据传输量
    const result = await db.collection('users')
      .field({
        _openid: true,
        merit: true,
        power: true,
        nickName: true,
        avatarUrl: true
      })
      .orderBy('merit', 'desc')
      .orderBy('updateTime', 'asc') // 功德相同时，按更新时间升序（先达到的排前面）
      .limit(limit)
      .get();

    // 补充排名序号和默认昵称
    const list = result.data.map((item, index) => ({
      rank: index + 1,
      _openid: item._openid,
      nickName: item.nickName || '匿名施主',
      avatarUrl: item.avatarUrl || '',
      merit: item.merit || 0,
      power: item.power || 0
    }));

    return {
      list,
      currentOpenId,
      total: list.length
    };
  } catch (err) {
    console.error('[getMeritRanking] 查询失败:', err);

    // 如果 users 集合不存在，返回空列表（避免前端报错）
    return {
      list: [],
      currentOpenId,
      total: 0,
      error: err.message
    };
  }
};
