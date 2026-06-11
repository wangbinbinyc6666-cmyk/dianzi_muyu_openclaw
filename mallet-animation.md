## 任务：新增木鱼棒敲击动画

在首页木鱼区域新增一根木鱼棒图片，每次敲击时产生挥棒动画。

### 准备工作
将项目根目录的 `木鱼棒.png` 复制到 `miniprogram/images/mallet.png`。

### 改动 1：miniprogram/pages/index/index.wxml

在 `.woodfish-container` 内部，木鱼图片之前插入木鱼棒元素：

```html
    <image
      src="/images/mallet.png"
      mode="aspectFit"
      class="mallet {{tapping ? 'mallet-strike' : ''}}"
    />
```

插入位置：`<view class="woodfish-wrapper" ...>` 之前。

### 改动 2：miniprogram/pages/index/index.wxss

在「木鱼区域」样式块末尾追加木鱼棒样式：

```css
/* ── 木鱼棒 ── */
.mallet {
  position: absolute;
  width: 180rpx;
  height: 260rpx;
  top: 40rpx;
  left: 40rpx;
  transform: rotate(-20deg);
  transform-origin: 90rpx 240rpx;
  transition: transform 0.1s ease-out;
  z-index: 2;
  pointer-events: none;
}

.mallet-strike {
  transform: rotate(5deg);
  transition: transform 0.06s ease-in;
}
```

注意：`transform-origin` 的 `90rpx 240rpx` 是握柄末端位置（图片宽 180rpx × 高 260rpx，支点在底部中心偏下）。Claude Code 可根据实际图片比例微调此值，确保旋转围绕握柄末端。

### 原则
- 木鱼棒不拦截点击事件（`pointer-events: none`），点击穿透到木鱼
- 动画与 onTapWoodfish 的 tapping 状态绑定（复用现有 120ms 逻辑）
- 样式配色（金色/粉色）与现有 UI 统一

### 验证
1. 木鱼棒显示在木鱼左上侧，自然角度
2. 点击/触摸木鱼时，木鱼棒绕握柄快速挥动
3. 松开后木鱼棒回到原位
4. 自动敲击模式下每次都有挥棒动画
