# 电子木鱼微信小程序 - 完整开发 Prompt

## 项目概述

创建一个名为「电子木鱼」的微信小程序，核心功能是模拟敲击木鱼积攒功德，结合社交排行榜和AI助手功能。

## 技术栈

- 前端：微信小程序原生开发（不使用框架）
- 后端：微信云开发（免费额度）
- AI对话：DeepSeek API
- 数据库：微信云数据库
- 存储：微信云存储

---

## 一、页面结构（共4个页面）

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | pages/index/index | 木鱼敲击、功德计数器、震动音效 |
| 排行榜 | pages/ranking/ranking | 好友功德排名 |
| AI助手 | pages/ai-chat/chat | AI对话功能 |
| 我的 | pages/my/my | 个人中心、分享 |

---

## 二、首页功能详细说明

### 2.1 页面布局（WXML）

```
┌────────────────────────────────┐
│        顶部粉色渐变横幅          │  ~60px
├────────────────────────────────┤
│                                │
│         [木鱼图标]              │  约占屏幕60%宽
│         可点击敲击              │
│                                │
├────────────────────────────────┤
│   功德: 999999    念力: 99999   │  两个计数器并排
├────────────────────────────────┤
│   [AI助手]      [排行榜]        │  两个功能按钮
├────────────────────────────────┤
│        底部Tab导航               │
│   [木鱼]  [排行榜]  [我的]       │
└────────────────────────────────┘
```

### 2.2 交互逻辑

**木鱼敲击：**
- 点击木鱼 → 触发敲击动画（木鱼下沉10px，100ms后弹回）
- 同时播放音效（/audio/tap.mp3）
- 同时触发短震动 wx.vibrateShort()
- 功德+1，念力+1

**动画效果：**
- 木鱼按下：transform: translateY(10px)
- 木鱼弹起：transform: translateY(0)，配合 ease-out
- 功德数字变化时：轻微放大再恢复

**数据存储：**
- localStorage 存储本地计数
- 云数据库同步用户数据

---

## 三、云开发数据库设计

### 3.1 数据库集合

**集合名：users**
| 字段 | 类型 | 说明 |
|------|------|------|
| _openid | string | 用户唯一标识 |
| merit | number | 功德值 |
| power | number | 念力值 |
| nickName | string | 昵称 |
| avatarUrl | string | 头像URL |
| updateTime | number | 更新时间戳 |

### 3.2 云函数

**addMerit（增加功德）：**
```
输入：{ merit: number, power: number }
逻辑：在数据库中累加用户功德和念力
返回：{ success: true, newMerit: number }
```

**getRanking（获取排行榜）：**
```
输入：{ limit: number }（默认100）
逻辑：按功德倒序查询用户列表
返回：{ list: Array<{nickName, merit, rank}> }
```

---

## 四、AI助手功能（DeepSeek API）

### 4.1 云函数：aiChat

```javascript
// 云函数入口
exports.main = async (event, context) => {
  const { message } = event
  
  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是佛教小助手"木鱼师兄"，用轻松幽默的方式回答关于功德修行的问题。保持禅意但不失趣味。' },
        { role: 'user', content: message }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer 环境变量中的DEEPSEEK_API_KEY`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  return {
    reply: response.data.choices[0].message.content
  }
}
```

### 4.2 前端页面

- 聊天界面：消息列表 + 输入框
- 用户发送的消息在右侧
- AI回复在左侧，带"木鱼师兄"头像
- 接入中显示"思考中..."动画

---

## 五、排行榜页面

- 显示功德排名前100的用户
- 自己的排名高亮显示
- 显示：排名、头像、昵称、功德值
- 点击可查看他人资料

---

## 六、「我的」页面

- 用户头像和昵称
- 我的功德/念力统计
- 分享按钮（生成分享海报）
- 关于我们

---

## 七、视觉风格

### 7.1 配色方案

| 用途 | 颜色 |
|------|------|
| 主色（功德） | #FFD700（金色） |
| 辅色（念力） | #FF69B4（粉色） |
| 背景色 | #1a1a2e（深紫黑） |
| 文字色 | #FFFFFF（白色） |
| 顶部渐变 | #FF69B4 → #FFD700 |

### 7.2 字体

- 数字：大号无衬线粗体
- 标题：无衬线常规
- 使用微信原生字体栈

### 7.3 间距

- 页面边距：20rpx
- 组件间距：20rpx
- 圆角：20rpx（卡片）、50%（圆形按钮）

---

## 八、音效和资源

### 8.1 需要准备的资源

| 文件 | 说明 |
|------|------|
| woodfish.png | 木鱼图片（约400x400px） |
| tap.mp3 | 敲击木鱼的音效（约100KB） |
| icon_ranking.png | 排行榜tab图标 |
| icon_my.png | 我的tab图标 |
| icon_woodfish.png | 木鱼tab图标 |

### 8.2 音效播放

```javascript
const audioContext = wx.createInnerAudioContext()
audioContext.src = '/audio/tap.mp3'
audioContext.play()
```

---

## 九、项目文件结构

```
electronic-wood-fish/
├── cloudfunctions/              # 云函数目录
│   ├── addMerit/
│   │   ├── index.js
│   │   └── package.json
│   ├── getRanking/
│   │   ├── index.js
│   │   └── package.json
│   └── aiChat/
│       ├── index.js
│       └── package.json
├── miniprogram/                  # 小程序主体
│   ├── pages/
│   │   ├── index/
│   │   │   ├── index.wxml
│   │   │   ├── index.wxss
│   │   │   └── index.js
│   │   ├── ranking/
│   │   │   ├── ranking.wxml
│   │   │   ├── ranking.wxss
│   │   │   └── ranking.js
│   │   ├── ai-chat/
│   │   │   ├── chat.wxml
│   │   │   ├── chat.wxss
│   │   │   └── chat.js
│   │   └── my/
│   │       ├── my.wxml
│   │       ├── my.wxss
│   │       └── my.js
│   ├── images/
│   │   ├── woodfish.png
│   │   ├── icon_woodfish.png
│   │   ├── icon_ranking.png
│   │   └── icon_my.png
│   ├── audio/
│   │   └── tap.mp3
│   ├── app.js
│   ├── app.json
│   └── app.wxss
└── README.md
```

---

## 十、核心代码要求

### 10.1 首页 WXML

```xml
<view class="container">
  <!-- 顶部渐变横幅 -->
  <view class="header-banner"></view>
  
  <!-- 木鱼区域 -->
  <view class="woodfish-container" bindtap="onTapWoodfish">
    <image 
      src="/images/woodfish.png" 
      class="woodfish {{isTapping ? 'tapping' : ''}}" 
      mode="aspectFit"
    />
    <view class="tap-hint">点击敲击</view>
  </view>
  
  <!-- 计数器 -->
  <view class="counters">
    <view class="counter merit-counter">
      <text class="counter-label">功德</text>
      <text class="counter-value">{{merit}}</text>
    </view>
    <view class="counter power-counter">
      <text class="counter-label">念力</text>
      <text class="counter-value">{{power}}</text>
    </view>
  </view>
  
  <!-- 功能按钮 -->
  <view class="action-buttons">
    <button class="btn-ai" bindtap="goToAI">AI助手</button>
    <button class="btn-share" bindtap="onShare">分享</button>
  </view>
  
  <!-- 底部Tab -->
  <view class="tab-bar">
    <view class="tab-item {{currentTab === 'index' ? 'active' : ''}}" bindtap="switchTab" data-tab="index">
      <image src="/images/icon_woodfish.png" class="tab-icon" />
      <text>木鱼</text>
    </view>
    <view class="tab-item {{currentTab === 'ranking' ? 'active' : ''}}" bindtap="switchTab" data-tab="ranking">
      <image src="/images/icon_ranking.png" class="tab-icon" />
      <text>排行榜</text>
    </view>
    <view class="tab-item {{currentTab === 'my' ? 'active' : ''}}" bindtap="switchTab" data-tab="my">
      <image src="/images/icon_my.png" class="tab-icon" />
      <text>我的</text>
    </view>
  </view>
</view>
```

### 10.2 首页 JS

```javascript
// app.js
App({
  data: {
    merit: 0,
    power: 0,
    isTapping: false
  },
  
  onLaunch() {
    // 加载本地存储的功德值
    const merit = wx.getStorageSync('merit') || 0
    const power = wx.getStorageSync('power') || 0
    this.setData({ merit, power })
    
    // 初始化音频
    this.audioContext = wx.createInnerAudioContext()
    this.audioContext.src = '/audio/tap.mp3'
  },
  
  onTapWoodfish() {
    // 动画状态
    this.setData({ isTapping: true })
    
    // 播放音效
    this.audioContext.play()
    
    // 震动
    wx.vibrateShort()
    
    // 更新计数
    const newMerit = this.data.merit + 1
    const newPower = this.data.power + 1
    this.setData({ merit: newMerit, power: newPower })
    
    // 保存本地
    wx.setStorageSync('merit', newMerit)
    wx.setStorageSync('power', newPower)
    
    // 上报云数据库
    wx.cloud.callFunction({
      name: 'addMerit',
      data: { merit: 1, power: 1 }
    })
    
    // 动画复位
    setTimeout(() => {
      this.setData({ isTapping: false })
    }, 100)
  },
  
  goToAI() {
    wx.navigateTo({ url: '/pages/ai-chat/chat' })
  },
  
  onShare() {
    wx.showShareMenu({
      withShareTicket: true
    })
  },
  
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === 'index') {
      // 已在本页
    } else if (tab === 'ranking') {
      wx.redirectTo({ url: '/pages/ranking/ranking' })
    } else if (tab === 'my') {
      wx.redirectTo({ url: '/pages/my/my' })
    }
  }
})
```

### 10.3 首页 WXSS

```css
.container {
  min-height: 100vh;
  background-color: #1a1a2e;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 120rpx;
}

.header-banner {
  width: 100%;
  height: 60rpx;
  background: linear-gradient(90deg, #FF69B4, #FFD700);
}

.woodfish-container {
  margin-top: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.woodfish {
  width: 400rpx;
  height: 400rpx;
  transition: transform 0.1s ease-out;
}

.woodfish.tapping {
  transform: translateY(10rpx);
}

.tap-hint {
  margin-top: 20rpx;
  color: #888;
  font-size: 24rpx;
}

.counters {
  display: flex;
  margin-top: 60rpx;
  gap: 80rpx;
}

.counter {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.counter-label {
  color: #888;
  font-size: 28rpx;
}

.counter-value {
  color: #FFD700;
  font-size: 48rpx;
  font-weight: bold;
  margin-top: 10rpx;
}

.power-counter .counter-value {
  color: #FF69B4;
}

.action-buttons {
  display: flex;
  gap: 30rpx;
  margin-top: 60rpx;
}

.btn-ai, .btn-share {
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.btn-ai {
  background: linear-gradient(90deg, #FF69B4, #FFD700);
  color: #fff;
}

.btn-share {
  background: #333;
  color: #fff;
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: #1a1a2e;
  border-top: 1rpx solid #333;
  display: flex;
  justify-content: space-around;
  padding-top: 10rpx;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #888;
}

.tab-item.active {
  color: #FFD700;
}

.tab-icon {
  width: 50rpx;
  height: 50rpx;
}
```

### 10.4 AI聊天页面 JS

```javascript
// pages/ai-chat/chat.js
const app = getApp()

Page({
  data: {
    messages: [],
    inputValue: '',
    loading: false
  },
  
  onLoad() {
    // 欢迎消息
    this.setData({
      messages: [{
        role: 'assistant',
        content: '阿弥陀佛，我是木鱼师兄。有什么修行上的困惑，尽管问我。'
      }]
    })
  },
  
  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },
  
  async onSend() {
    const message = this.data.inputValue.trim()
    if (!message) return
    
    // 添加用户消息
    const messages = this.data.messages
    messages.push({ role: 'user', content: message })
    this.setData({ 
      messages,
      inputValue: '',
      loading: true 
    })
    
    // 调用云函数
    try {
      const res = await wx.cloud.callFunction({
        name: 'aiChat',
        data: { message }
      })
      
      messages.push({ role: 'assistant', content: res.result.reply })
      this.setData({ messages, loading: false })
    } catch (e) {
      messages.push({ role: 'assistant', content: '抱歉，师兄我刚才走神了...' })
      this.setData({ messages, loading: false })
    }
  }
})
```

### 10.5 排行榜页面 JS

```javascript
// pages/ranking/ranking.js
Page({
  data: {
    rankingList: [],
    myRank: null,
    loading: true
  },
  
  onShow() {
    this.loadRanking()
  },
  
  async loadRanking() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getRanking',
        data: { limit: 100 }
      })
      
      this.setData({
        rankingList: res.result.list,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})
```

### 10.6 云函数 addMerit

```javascript
// cloudfunctions/addMerit/index.js
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { merit = 0, power = 0 } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  const db = cloud.database()
  
  // 查询用户是否存在
  const user = await db.collection('users').where({
    _openid: openid
  }).get()
  
  if (user.data.length > 0) {
    // 更新现有用户
    await db.collection('users').where({
      _openid: openid
    }).update({
      data: {
        merit: db.command.inc(merit),
        power: db.command.inc(power),
        updateTime: Date.now()
      }
    })
  } else {
    // 创建新用户
    await db.collection('users').add({
      data: {
        _openid: openid,
        merit,
        power,
        updateTime: Date.now()
      }
    })
  }
  
  return { success: true }
}
```

### 10.7 云函数 getRanking

```javascript
// cloudfunctions/getRanking/index.js
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { limit = 100 } = event
  
  const db = cloud.database()
  
  const result = await db.collection('users')
    .orderBy('merit', 'desc')
    .limit(limit)
    .get()
  
  // 补充排名
  const list = result.data.map((item, index) => ({
    rank: index + 1,
    nickName: item.nickName || '匿名施主',
    merit: item.merit || 0
  }))
  
  return { list }
}
```

---

## 十一、app.json 配置

```json
{
  "pages": [
    "pages/index/index",
    "pages/ranking/ranking",
    "pages/ai-chat/chat",
    "pages/my/my"
  ],
  "window": {
    "backgroundTextStyle": "dark",
    "navigationBarBackgroundColor": "#1a1a2e",
    "navigationBarTitleText": "电子木鱼",
    "navigationBarTextStyle": "white"
  },
  "tabBar": {
    "color": "#888888",
    "selectedColor": "#FFD700",
    "backgroundColor": "#1a1a2e",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "木鱼"
      },
      {
        "pagePath": "pages/ranking/ranking",
        "text": "排行榜"
      },
      {
        "pagePath": "pages/my/my",
        "text": "我的"
      }
    ]
  }
}
```

---

## 十二、开发注意事项

1. **资源准备**：木鱼图片和音效需要自己准备，或使用占位符
2. **云开发开通**：在微信开发者工具中开通云开发，创建环境
3. **DeepSeek API Key**：配置到云函数的环境变量中
4. **数据库权限**：设置 users 集合的读写权限为 "仅创建者可读写"
5. **域名白名单**：DeepSeek API 需要在小程序后台配置 request 域名白名单

---

## 十三、生成要求

请生成完整可运行的代码，包括：
- 所有 WXML、WXSS、JS 文件
- 所有云函数代码
- app.js、app.json、app.wxss
- 完整的目录结构

代码需要能够直接在微信开发者工具中打开运行。