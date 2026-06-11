/**
 * 云函数：getMeritRanking
 * 功能：获取功德排行榜（前100名）+ 当前用户的排名信息
 *
 * v2.0 变更：
 *   - 新增当前用户排名查询（即使不在前100也能获取）
 *   - 新增总用户数统计
 *   - 排名算法：merit 高于当前用户的人数 + 1
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'getMeritRanking',
 *     data: { limit: 100 }  // limit 可选，默认 100，最大 100
 *   })
 *
 * 返回结构：
 *   {
 *     list: [...],           // 排行榜前N名
 *     currentOpenId: '...',  // 当前用户 openId
 *     totalUsers: 256,       // 参与排行的总人数
 *     userRank: {            // 当前用户的排名信息（始终返回）
 *       rank: 156,
 *       merit: 42,
 *       power: 42
 *     }
 *   }
 *
 * 数据库索引建议（在云开发控制台配置）：
 *   - 集合: users
 *   - 索引1: merit DESC（排行榜核心排序）
 *   - 索引2: merit DESC + updateTime ASC（同功德值排序）
 *   - _openid 字段有内置索引，无需额外配置
 */

const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const MAX_LIMIT = 100; // 微信云数据库单次查询最大条数

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const currentOpenId = wxContext.OPENID;

  // 查询条数限制，最大 100
  const limit = Math.min(Math.max(1, event.limit || 100), MAX_LIMIT);

  try {
    // ── 并行查询：排行榜 + 当前用户 + 总人数 ──
    // 三个查询相互独立，并行执行减少总耗时
    const [rankingResult, myResult, countResult] = await Promise.all([
      // 1. 排行榜：按功德降序取前 N 名
      db.collection('users')
        .field({
          _openid: true,
          merit: true,
          power: true,
          nickName: true,
          avatarUrl: true
        })
        .orderBy('merit', 'desc')
        .orderBy('updateTime', 'asc')
        .limit(limit)
        .get(),

      // 2. 当前用户数据
      db.collection('users')
        .where({ _openid: currentOpenId })
        .field({ merit: true, power: true })
        .get(),

      // 3. 总用户数
      db.collection('users').count()
    ]);

    // ── 处理排行榜 ──
    const list = rankingResult.data.map((item, index) => ({
      rank: index + 1,
      _openid: item._openid,
      nickName: item.nickName || '匿名施主',
      avatarUrl: item.avatarUrl || '',
      merit: item.merit || 0,
      power: item.power || 0
    }));

    // ── 计算当前用户排名 ──
    let userRank = null;
    const myData = myResult.data[0];

    if (myData) {
      // 检查是否在前 N 名中
      const topNItem = list.find(item => item._openid === currentOpenId);

      let rank;
      if (topNItem) {
        // 在前 N 名中，直接使用列表中的排名
        rank = topNItem.rank;
      } else {
        // 不在前 N 名中：统计功德值严格高于当前用户的人数
        const higherCountResult = await db.collection('users')
          .where({ merit: _.gt(myData.merit) })
          .count();
        rank = higherCountResult.total + 1;
      }

      userRank = {
        rank,
        merit: myData.merit || 0,
        power: myData.power || 0
      };
    }

    return {
      list,
      currentOpenId,
      totalUsers: countResult.total,
      userRank
    };
  } catch (err) {
    console.error('[getMeritRanking] 查询失败:', {
      error: err.message,
      code: err.errCode
    });

    // 如果 users 集合不存在，返回空列表（避免前端报错）
    return {
      list: [],
      currentOpenId,
      totalUsers: 0,
      userRank: null,
      error: err.message
    };
  }
};
