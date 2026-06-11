## 任务：新增「自动敲击木鱼」功能

在首页新增一个自动敲击开关，用户点击后可自动连续敲击木鱼（每 800ms 敲一次），声音和计数正常。

### 改动 1：miniprogram/pages/index/index.wxml

在「计数器」和「功能按钮」之间插入自动敲击开关：

```html
  <!-- 自动敲击开关 -->
  <view class="auto-tap-bar">
    <view class="auto-tap-btn {{autoTapping ? 'active' : ''}}" bindtap="toggleAutoTap">
      <text class="auto-tap-icon">{{autoTapping ? '⏸' : '▶'}}</text>
      <text class="auto-tap-label">{{autoTapping ? '停止自动敲击' : '自动敲击'}}</text>
    </view>
    <text class="auto-tap-speed" wx:if="{{autoTapping}}">自动敲击中...</text>
  </view>
```

插入位置：`</view>`（counters 结束）之后，`<view class="action-buttons">` 之前。

### 改动 2：miniprogram/pages/index/index.js

#### 2a：data 新增状态
```js
    autoTapping: false
```

插入到 data 对象中，与 `tapping` 并列。

#### 2b：新增 toggleAutoTap 方法
```js
  toggleAutoTap() {
    if (this.data.autoTapping) {
      this.stopAutoTap();
    } else {
      this.startAutoTap();
    }
  },

  startAutoTap() {
    this.setData({ autoTapping: true });
    this._autoTimer = setInterval(() => {
      this.onTapWoodfish();
    }, 800);
  },

  stopAutoTap() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
    this.setData({ autoTapping: false });
  },
```

插入到 `onTapWoodfish()` 方法之后（即 `goToRanking` 之前）。

#### 2c：onHide 生命周期清除定时器
```js
  onHide() {
    this.stopAutoTap();
  },
```

插入到 `onShow()` 后面。

### 改动 3：miniprogram/pages/index/index.wxss

在「今日提示」样式之前插入自动敲击样式：

```css
/* ── 自动敲击开关 ── */
.auto-tap-bar {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.auto-tap-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 48rpx;
  border-radius: 48rpx;
  background: #2a2a40;
  border: 2rpx solid #444;
  transition: all 0.3s;
}

.auto-tap-btn.active {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border-color: #FFD700;
}

.auto-tap-icon {
  font-size: 28rpx;
}

.auto-tap-label {
  font-size: 26rpx;
  color: #ccc;
}

.auto-tap-btn.active .auto-tap-label {
  color: #1a1a2e;
  font-weight: 600;
}

.auto-tap-speed {
  font-size: 22rpx;
  color: #FFD700;
  opacity: 0.8;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

### 原则
- 不改动其他功能代码
- 页面隐藏（切 tab）时自动停止定时器，回来需重新开启
- 自动敲击复用 `onTapWoodfish` 全部逻辑（音效、计数、云同步）

### 验证
1. 点击「自动敲击」按钮开始自动击打
2. 音效和功德计数正常递增
3. 按钮变为金色「停止自动敲击」
4. 切换到排行榜再回来，自动敲击停止
5. 再次点击可重新开始
