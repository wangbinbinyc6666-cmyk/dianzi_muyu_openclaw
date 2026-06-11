/**
 * 云函数：addMerit
 * 功能：增加用户功德值和念力值，同时更新可选的用户资料字段
 *
 * v2.0 变更：
 *   - 新增输入校验（单次 merit/power 上限 100）
 *   - 新增频率限制（同一用户 500ms 内不可重复调用）
 *   - 优化 DB 操作：从 3 次降为 2 次（update → 判断 updated 数 → 必要时 add）
 *   - 增加结构化错误日志
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'addMerit',
 *     data: {
 *       merit: 1,         // 增量（非累计值！），范围 0~100
 *       power: 1,         // 增量，范围 0~100
 *       avatarUrl: '...', // 可选，用户头像
 *       nickName: '...'   // 可选，用户昵称
 *     }
 *   })
 *
 * 数据库集合：users
 * 权限设置：在云开发控制台 → 数据库 → users → 权限设置
 *          设置为"仅创建者可读写"
 * 索引建议：merit 降序（用于排行榜排序）
 */

const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

// ── 安全阈值 ──
const MAX_SINGLE_INCREMENT = 100;  // 单次调用 merit/power 上限
const MIN_CALL_INTERVAL = 500;     // 同一用户最小调用间隔（ms）

// ── 频率限制（内存级，云函数实例复用时有效）──
const _rateLimitMap = new Map();

function checkRateLimit(openid) {
  const now = Date.now();
  const lastCall = _rateLimitMap.get(openid) || 0;
  if (now - lastCall < MIN_CALL_INTERVAL) {
    return false;
  }
  _rateLimitMap.set(openid, now);
  return true;
}

// 定期清理过期记录，防止内存泄漏（每 10 分钟清理一次超过 5 分钟的记录）
setInterval(() => {
  const threshold = Date.now() - 5 * 60 * 1000;
  for (const [key, time] of _rateLimitMap) {
    if (time < threshold) _rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000);

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const startTime = Date.now();

  try {
    // ── 1. 频率限制 ──
    if (!checkRateLimit(openid)) {
      console.warn(`[addMerit] 频率限制触发: ${openid}, 间隔 < ${MIN_CALL_INTERVAL}ms`);
      return {
        success: false,
        error: '操作过于频繁，请稍后再试'
      };
    }

    // ── 2. 输入校验与归一化 ──
    let { merit = 1, power = 1 } = event;
    const { avatarUrl, nickName } = event;

    // 类型校验：必须是有限数字
    if (typeof merit !== 'number' || !isFinite(merit)) merit = 1;
    if (typeof power !== 'number' || !isFinite(power)) power = 1;

    // 范围校验：下限 0，上限 MAX_SINGLE_INCREMENT
    merit = Math.max(0, Math.min(Math.floor(merit), MAX_SINGLE_INCREMENT));
    power = Math.max(0, Math.min(Math.floor(power), MAX_SINGLE_INCREMENT));

    // 校验后如果 merit 和 power 都是 0 且没有资料字段更新，直接返回
    if (merit === 0 && power === 0 && !avatarUrl && !nickName) {
      return { success: true, newMerit: 0, newPower: 0, skipped: true };
    }

    // ── 3. 构建更新数据 ──
    const updateData = { updateTime: Date.now() };
    if (merit > 0) updateData.merit = _.inc(merit);
    if (power > 0) updateData.power = _.inc(power);
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (nickName) updateData.nickName = nickName;

    // ── 4. 尝试更新（优化：省略先查询是否存在，直接 update）──
    const updateResult = await db.collection('users')
      .where({ _openid: openid })
      .update({ data: updateData });

    let newMerit = 0;
    let newPower = 0;

    if (updateResult.stats.updated > 0) {
      // ── 用户已存在：获取更新后的值 ──
      const updatedUser = await db.collection('users')
        .where({ _openid: openid })
        .field({ merit: true, power: true })
        .get();

      const userData = updatedUser.data[0] || {};
      newMerit = userData.merit || merit;
      newPower = userData.power || power;
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
      newMerit = merit;
      newPower = power;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 500) {
      console.warn(`[addMerit] 慢请求: ${openid}, 耗时 ${elapsed}ms`);
    }

    return { success: true, newMerit, newPower };
  } catch (err) {
    console.error('[addMerit] 执行失败:', {
      openid,
      error: err.message,
      code: err.errCode,
      stack: err.stack
    });
    return { success: false, error: err.message };
  }
};
