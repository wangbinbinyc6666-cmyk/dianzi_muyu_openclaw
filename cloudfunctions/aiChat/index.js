/**
 * 云函数：aiChat
 * 功能：代理 DeepSeek API 调用，实现 AI 对话
 *
 * 配置步骤：
 * 1. 在微信开发者工具 → 云开发控制台 → 云函数 → aiChat
 * 2. 点击「配置」→「环境变量」
 * 3. 添加变量：DEEPSEEK_API_KEY = "sk-xxxxxxxx"
 * 4. 上传并部署：右键 cloudfunctions/aiChat → 上传并部署：云端安装依赖
 *
 * DeepSeek API 文档：https://platform.deepseek.com/api-docs
 */

const cloud = require('wx-server-sdk');
cloud.init();

// 从环境变量读取 API Key（不要在代码中硬编码！）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// AI 角色设定（系统提示词）
const SYSTEM_PROMPT = `你是"木鱼师兄"，一位幽默风趣的佛门弟子兼AI修行助手。

你的特点：
- 用轻松幽默的方式回答关于功德、修行、禅学的问题
- 保持禅意但不失趣味，偶尔引用佛经典故
- 语言风格：半文半白，带一点网络用语，让人会心一笑
- 对于非修行类问题，也尽量用佛门视角来解答
- 回复简洁，一般不超过200字
- 自称"师兄"或"贫僧"，称呼用户为"施主"

示例回复风格：
"阿弥陀佛，施主这问题问到点子上了！《金刚经》有云：'一切有为法，如梦幻泡影'。修行不在敲多少下，在于心诚不诚。不过嘛，多敲几下发发朋友圈也是可以的，功德+1了解一下？"`;

/**
 * 使用云函数内置的 HTTP 请求（无需额外安装 axios）
 * 微信云开发环境自带 request 能力
 */
exports.main = async (event, context) => {
  const { message } = event;

  // 参数校验
  if (!message || !message.trim()) {
    return {
      reply: '施主，您倒是说话呀。贫僧我虽然修行多年，但还没修出"他心通"呢 😄'
    };
  }

  // 检查 API Key 是否已配置
  if (!DEEPSEEK_API_KEY) {
    console.warn('[aiChat] DEEPSEEK_API_KEY 未配置');
    return {
      reply: '阿弥陀佛！施主，师兄我还没拿到 API Key 呢。\n\n请在云函数环境变量中配置 DEEPSEEK_API_KEY，具体步骤：\n1. 微信开发者工具 → 云开发控制台 → 云函数 → aiChat\n2. 配置 → 环境变量 → 添加 DEEPSEEK_API_KEY\n3. 右键 aiChat 目录 → 上传并部署\n\n配置好后师兄就能和你谈禅说道了 🙏'
    };
  }

  try {
    // 调用 DeepSeek API
    const response = await cloud.openapi.cloudbase.request({
      url: DEEPSEEK_API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      data: {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 500
      }
    });

    // 解析 AI 回复
    if (response && response.choices && response.choices.length > 0) {
      const reply = response.choices[0].message.content;
      return { reply };
    }

    return {
      reply: '施主，师兄我刚才打坐入定了，什么也没听到...要不您再说一遍？🧘'
    };
  } catch (err) {
    console.error('[aiChat] API 调用失败:', err.message);

    // 区分不同错误类型，给出友好提示
    if (err.message.includes('timeout')) {
      return {
        reply: '施主稍等，师兄我正在入定中...（请求超时，请重试）⏳'
      };
    }

    if (err.message.includes('401') || err.message.includes('403')) {
      return {
        reply: '施主，API Key 好像不对。请检查云函数环境变量中的 DEEPSEEK_API_KEY 是否正确配置。🔑'
      };
    }

    if (err.message.includes('429')) {
      return {
        reply: '阿弥陀佛，今天来找师兄的人太多了！请施主稍等片刻再试。🙏'
      };
    }

    return {
      reply: '施主见谅，师兄我这里网络不太好，暂时无法回答。请稍后再来 🙏'
    };
  }
};
