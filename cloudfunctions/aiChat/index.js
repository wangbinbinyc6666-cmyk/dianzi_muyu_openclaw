/**
 * 云函数：aiChat
 * 功能：代理 DeepSeek API 调用，实现 AI 对话
 *
 * 配置步骤：
 * 1. 右键 cloudfunctions/aiChat → 上传并部署：云端安装依赖
 * 2. 云开发控制台 → 云函数 → aiChat → 配置 → 环境变量
 *    添加 DEEPSEEK_API_KEY = "sk-xxxxxxxx"
 */

const cloud = require('wx-server-sdk');
cloud.init();

const https = require('https');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/chat/completions';

const SYSTEM_PROMPT = `你是"木鱼师兄"，一位幽默风趣的佛门弟子兼AI修行助手。

你的特点：
- 用轻松幽默的方式回答关于功德、修行、禅学的问题
- 保持禅意但不失趣味，偶尔引用佛经典故
- 语言风格：半文半白，带一点网络用语，让人会心一笑
- 对于非修行类问题，也尽量用佛门视角来解答
- 回复简洁，一般不超过200字
- 自称"师兄"或"贫僧"，称呼用户为"施主"`;

function deepSeekRequest(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.8,
      max_tokens: 500
    });

    const req = https.request({
      hostname: DEEPSEEK_HOST,
      path: DEEPSEEK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices.length > 0) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(new Error(json.error.message || 'API error'));
          } else {
            reject(new Error('empty response'));
          }
        } catch (e) {
          reject(new Error(`parse error: ${body.slice(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });

    req.write(postData);
    req.end();
  });
}

exports.main = async (event) => {
  const { message } = event;

  if (!message || !message.trim()) {
    return {
      reply: '施主，您倒是说话呀。贫僧我虽然修行多年，但还没修出"他心通"呢 😄'
    };
  }

  if (!DEEPSEEK_API_KEY) {
    return {
      reply: '阿弥陀佛！施主，师兄我还没拿到 API Key 呢。\n\n请在云函数环境变量中配置 DEEPSEEK_API_KEY，步骤：\n1. 微信开发者工具 → 云开发控制台 → 云函数 → aiChat\n2. 配置 → 环境变量 → 添加 DEEPSEEK_API_KEY\n3. 重新上传部署 aiChat\n\n配置好后师兄就能和你谈禅说道了 🙏'
    };
  }

  try {
    const reply = await deepSeekRequest([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message }
    ]);
    return { reply };
  } catch (err) {
    console.error('[aiChat] API 调用失败:', err.message);

    if (err.message.includes('timeout')) {
      return { reply: '施主稍等，师兄我正在入定中...（请求超时，请重试）⏳' };
    }
    if (err.message.includes('401') || err.message.includes('403')) {
      return { reply: '施主，API Key 好像不对。请检查云函数环境变量中的 DEEPSEEK_API_KEY 是否正确配置。🔑' };
    }
    if (err.message.includes('429')) {
      return { reply: '阿弥陀佛，今天来找师兄的人太多了！请施主稍等片刻再试。🙏' };
    }

    return { reply: '施主见谅，师兄我这里网络不太好，暂时无法回答。请稍后再来 🙏' };
  }
};
