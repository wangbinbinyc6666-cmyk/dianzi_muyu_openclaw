"""
生成电子木鱼微信小程序 tabBar 图标
输出 6 个 81×81px PNG 图标到 miniprogram/images/tab-icons/ 目录
"""

from PIL import Image, ImageDraw
import os
import math

# 输出目录
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'miniprogram', 'images', 'tab-icons')
os.makedirs(OUTPUT_DIR, exist_ok=True)

SIZE = 81
CENTER = SIZE // 2
NORMAL_COLOR = (136, 136, 136, 255)     # #888888
SELECTED_COLOR = (255, 215, 0, 255)     # #FFD700
BG_COLOR = (26, 26, 46, 255)            # #1a1a2e 透明背景


def create_icon(draw_func, filename, color):
    """创建单个图标"""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(draw, color)
    img.save(os.path.join(OUTPUT_DIR, filename), 'PNG')


# ════════════════════════════════════════════════════════════
#  木鱼图标：碗形 + 小木鱼棒
# ════════════════════════════════════════════════════════════

def draw_fish(draw, color):
    # 碗体（上半圆）
    bbox = [14, 14, 66, 66]
    draw.arc(bbox, 180, 0, fill=color, width=3)
    # 碗底线
    draw.line([(14, 40), (66, 40)], fill=color, width=3)
    # 木鱼眼（小圆点）
    draw.ellipse([33, 25, 39, 31], fill=color)
    draw.ellipse([42, 25, 48, 31], fill=color)
    # 小木鱼棒（右上方斜线）
    draw.line([(56, 8), (49, 22)], fill=color, width=3)
    draw.ellipse([54, 5, 62, 13], outline=color, width=2)


# ════════════════════════════════════════════════════════════
#  排行榜图标：奖杯
# ════════════════════════════════════════════════════════════

def draw_rank(draw, color):
    # 杯身
    draw.rounded_rectangle([22, 10, 58, 44], radius=5, outline=color, width=3)
    # 左耳
    draw.arc([12, 16, 28, 38], 90, 270, fill=color, width=2)
    # 右耳
    draw.arc([52, 16, 68, 38], 270, 90, fill=color, width=2)
    # 杯柱
    draw.line([(40, 44), (40, 56)], fill=color, width=3)
    # 底座
    draw.line([(27, 57), (53, 57)], fill=color, width=3)
    # 杯中星（小菱形装饰）
    cx, cy = 40, 26
    draw.polygon([(cx, cy - 6), (cx + 5, cy), (cx, cy + 6), (cx - 5, cy)], fill=color)


# ════════════════════════════════════════════════════════════
#  我的图标：人物轮廓
# ════════════════════════════════════════════════════════════

def draw_my(draw, color):
    # 头部
    draw.ellipse([29, 8, 51, 30], outline=color, width=3)
    # 身体（半圆弧）
    draw.arc([15, 34, 65, 74], 0, 180, fill=color, width=3)
    # 肩部连接线
    draw.line([(15, 54), (15, 54)], fill=color, width=3)
    draw.line([(65, 54), (65, 54)], fill=color, width=3)


# ════════════════════════════════════════════════════════════
#  批量生成
# ════════════════════════════════════════════════════════════

icons = [
    (draw_fish, 'tab-fish.png',          'tab-fish-selected.png'),
    (draw_rank, 'tab-rank.png',          'tab-rank-selected.png'),
    (draw_my,   'tab-my.png',            'tab-my-selected.png'),
]

for draw_func, normal_name, selected_name in icons:
    create_icon(draw_func, normal_name, NORMAL_COLOR)
    create_icon(draw_func, selected_name, SELECTED_COLOR)

print(f"OK: generated 6 tabBar icons to: {OUTPUT_DIR}")
for name in ['tab-fish.png', 'tab-fish-selected.png',
             'tab-rank.png', 'tab-rank-selected.png',
             'tab-my.png',   'tab-my-selected.png']:
    path = os.path.join(OUTPUT_DIR, name)
    file_size = os.path.getsize(path)
    print(f"  {name:30s}  {file_size:>5d} bytes")
