## 任务：移除小程序 AI 对话功能（应付微信审核）

微信审核被拒原因：个人主体不支持深度合成技术（AI问答）。需要移除 AI 对话入口，保留 木鱼敲击+排行榜+我的。

### 改动清单（共 5 处）

#### 1. miniprogram/app.json — 移除页面路由
删除 pages 数组中的 `"pages/ai-chat/chat"`。

#### 2. miniprogram/pages/index/index.js — 删除 goToAI 方法
删除：
```js
  goToAI() {
    wx.navigateTo({ url: '/pages/ai-chat/chat' });
  }
```

#### 3. miniprogram/pages/index/index.wxml — 删除 AI 按钮
删除 `bindtap="goToAI"` 所在的整行 `<view>` 元素。

#### 4. miniprogram/pages/my/my.js — 删除 goToAI 方法
删除：
```js
  goToAI() {
    wx.navigateTo({ url: '/pages/ai-chat/chat' });
  }
```

#### 5. miniprogram/pages/my/my.wxml — 删除 AI 菜单项
删除 `bindtap="goToAI"` 所在的整个 `menu-item` 元素。

### 原则
- 只删入口和路由，**不删 ai-chat 目录**（方便以后企业主体时恢复）
- 不改动其他功能
- TabBar 保持三个：木鱼、排行榜、我的

### 完成后验证
1. 首页没有 AI 对话按钮
2. "我的"页面没有 AI 对话入口
3. 三个 tab 切换正常
4. 木鱼敲击、排行榜功能不受影响
