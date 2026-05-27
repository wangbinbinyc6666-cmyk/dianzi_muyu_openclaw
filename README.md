# 电子木鱼 - 微信小程序

模拟敲击木鱼积攒功德的禅意小程序，结合社交排行榜和 AI 助手功能。

## 项目结构

```
├── cloudfunctions/          # 云函数
│   ├── addMerit/            # 增加功德
│   ├── getMeritRanking/          # 获取排行榜
│   └── aiChat/              # AI 对话（DeepSeek）
├── miniprogram/             # 小程序主体
│   ├── pages/
│   │   ├── index/           # 首页 - 木鱼敲击
│   │   ├── ranking/         # 排行榜
│   │   ├── ai-chat/         # AI 师兄对话
│   │   └── my/              # 我的
│   ├── images/              # 图片资源（需自行准备）
│   ├── audio/               # 音效资源（需自行准备）
│   ├── app.js               # 小程序入口
│   ├── app.json             # 小程序配置
│   └── app.wxss             # 全局样式
└── project.config.json      # 项目配置
```

## 快速开始

### 1. 准备工作

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序（[mp.weixin.qq.com](https://mp.weixin.qq.com/)）获取 AppID
- 申请 [DeepSeek API Key](https://platform.deepseek.com/)（用于 AI 对话功能）

### 2. 打开项目

1. 启动微信开发者工具
2. 选择「导入项目」
3. 目录选择本项目根目录
4. AppID 填写你的小程序 AppID
5. 点击「确定」

### 3. 开通云开发

1. 在开发者工具中点击「云开发」按钮
2. 开通云开发环境（选择免费额度即可）
3. 记录环境 ID

### 4. 配置环境 ID

编辑 `miniprogram/app.js` 第 18 行：
```javascript
envId: 'your-env-id'  // 替换为你的云开发环境ID
```

### 5. 创建数据库集合

在云开发控制台 → 数据库 → 添加集合：

| 集合名 | 权限设置 |
|--------|---------|
| users  | 仅创建者可读写 |

### 6. 部署云函数

在开发者工具中，依次右键以下目录 → 「上传并部署：云端安装依赖」：
- `cloudfunctions/addMerit`
- `cloudfunctions/getMeritRanking`
- `cloudfunctions/aiChat`

### 7. 配置 AI 对话（可选）

1. 云开发控制台 → 云函数 → aiChat → 配置 → 环境变量
2. 添加变量：`DEEPSEEK_API_KEY` = `sk-xxxxxxxx`
3. 重新部署 aiChat 云函数

### 8. 准备资源文件（可选）

将图片和音效放入对应目录（详见 `miniprogram/images/README.md` 和 `miniprogram/audio/README.md`）。

未准备资源时，小程序将以占位符样式正常运行。

## 技术栈

- **前端**：微信小程序原生开发
- **后端**：微信云开发（云函数 + 云数据库）
- **AI 对话**：DeepSeek API
- **无需自建服务器**，全部使用微信云开发免费额度

## 功能特性

- 🪵 **木鱼敲击**：点击动画 + 音效 + 震动反馈
- ⚜️ **功德计数**：本地持久化 + 云端同步
- 🏆 **排行榜**：好友功德排名
- 🤖 **AI 师兄**：DeepSeek 驱动的禅意对话
- 📤 **社交分享**：分享功德到微信好友/朋友圈

## License

MIT
