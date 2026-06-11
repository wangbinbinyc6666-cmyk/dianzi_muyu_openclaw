/**
 * ⚠️ AI 助手聊天页面 — 当前已下线
 *
 * 下线原因：个人主体小程序审核要求，AI 对话功能需额外资质。
 * 参见 commit: 1b08159 "移除 AI 对话功能入口以满足个人主体审核要求"
 *
 * 当前状态：
 * - 代码保留但无任何入口可访问（已从 tabBar 移除，无页面跳转链接）
 * - 如未来取得相关资质或审核政策放宽，可恢复：
 *   1. 在 app.json tabBar.list 中添加 ai-chat 入口
 *   2. 或在首页添加跳转按钮
 *
 * 前置条件（恢复时需要）：
 * 1. 右键 cloudfunctions/aiChat → 上传并部署：云端安装依赖
 * 2. 云开发控制台 → 云函数 → aiChat → 配置 → 环境变量
 *    添加 DEEPSEEK_API_KEY = "sk-xxxxxxxx"
 */

const app = getApp();

Page({
  data: {
    messages: [],
    inputValue: '',
    loading: false,
    scrollToId: ''
  },

  onLoad() {},

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  async onSend() {
    const message = this.data.inputValue.trim();
    if (!message || this.data.loading) return;

    const messages = [...this.data.messages, { role: 'user', content: message }];
    this.setData({
      messages,
      inputValue: '',
      loading: true,
      scrollToId: `msg-${messages.length - 1}`
    });

    let reply;
    try {
      const res = await app.callCloudFn('aiChat', { message });
      reply = res.result.reply || '阿弥陀佛，师兄我刚才走神了，请再说一遍...';
    } catch (err) {
      console.error('[AI聊天] 请求失败:', err.message);

      // 根据错误类型给出不同提示
      if (err.message.includes('超时') || err.message.includes('部署')) {
        reply = '🙏 师兄我还没准备好！\n\n请先部署 aiChat 云函数：\n1. 右键 cloudfunctions/aiChat 目录\n2. 选择"上传并部署：云端安装依赖"\n3. 在云开发控制台配置 DEEPSEEK_API_KEY 环境变量';
      } else if (err.message.includes('未初始化')) {
        reply = '云开发环境未连接，请检查 cloud1-d1g4xxsut33977fca 环境是否开通。';
      } else {
        reply = '抱歉，师兄我暂时无法回答。请检查网络后重试 🙏';
      }
    }

    const newMessages = [...this.data.messages, { role: 'assistant', content: reply }];
    this.setData({
      messages: newMessages,
      loading: false,
      scrollToId: `msg-${newMessages.length - 1}`
    });
  },

  quickAsk(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputValue: question }, () => {
      this.onSend();
    });
  },

  onShareAppMessage() {
    return {
      title: '向木鱼师兄请教修行之道',
      path: '/pages/ai-chat/chat'
    };
  }
});
