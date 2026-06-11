/**
 * 云函数：addMerit
 * 功能：增加用户功德值和念力值，同时更新可选的用户资料字段
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'addMerit',
 *     data: {
 *       merit: 1,         // 增量（非累计值！）
 *       power: 1,         // 增量
 *       avatarUrl: '...', // 可选，用户头像
 *       nickName: '...'   // 可选，用户昵称
 *     }
 *   })
 *
 * 数据库集合：users
 * 权限设置：在云开发控制台 → 数据库 → users → 权限设置
 *          设置为"仅创建者可读写"
 */

const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 增量值（默认为1）
  const { merit = 1, power = 1 } = event;
  // 可选的用户资料字段
  const { avatarUrl, nickName } = event;

  // 构建更新数据：始终包含增量字段
  const updateData = {
    merit: _.inc(merit),
    power: _.inc(power),
    updateTime: Date.now()
  };

  // 如果有头像/昵称变更，附加到更新数据
  if (avatarUrl) updateData.avatarUrl = avatarUrl;
  if (nickName) updateData.nickName = nickName;

  try {
    // 查询用户是否已在数据库中存在
    const userResult = await db.collection('users')
      .where({ _openid: openid })
      .get();

    if (userResult.data.length > 0) {
      // ── 用户已存在：累加功德和念力，更新可选字段 ──
      await db.collection('users')
        .where({ _openid: openid })
        .update({ data: updateData });
    } else {
      // ── 新用户：创建记录 ──
      await db.collection('users').add({
        data: {
          _openid: openid,
          merit: merit,
          power: power,
          nickName: nickName || '',
          avatarUrl: avatarUrl || '',
          createTime: Date.now(),
          updateTime: Date.now()
        }
      });
    }

    // 返回更新后的功德值（用于前端确认）
    const updatedUser = await db.collection('users')
      .where({ _openid: openid })
      .field({ merit: true, power: true })
      .get();

    const userData = updatedUser.data[0] || {};

    return {
      success: true,
      newMerit: userData.merit || merit,
      newPower: userData.power || power
    };
  } catch (err) {
    console.error('[addMerit] 执行失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
