# Design direction

## Visual world

旅行者时间手册：像一张折叠展开的百年时间地图，带有日期印章、路线、纸张边缘和手写批注。

## Surface mode

Operate. 用户打开后应立即看到自己的人生地图，并能选择一个日点开始记录。

## Direction contract

- 首屏必须直接展示人生格点和今日记录入口，不设置营销 Hero。
- 暖纸色作为环境，墨水绿作为主要操作色，旧红作为今天与行动色，苔藓绿表示已记录。
- 版式使用宽阔留白和不对称的时间手册构图，避免通用 Dashboard 卡片堆叠。
- Canvas 地图是核心视觉与功能，不用大量 DOM 方格模拟。
- 动效只强调格点选择、章节展开和保存反馈，默认内容始终可见。

## Tokens

- paper: #f4eee3
- paper-light: #fbf8f1
- ink: #253d32
- terracotta: #c96f4f
- ochre: #b7a77b
- moss: #728b6d
- plum: #896d80
- border: rgba(37, 61, 50, .14)
- body text: 14–17px
- metadata: 10–12px monospace
- control radius: 0–2px; dialog radius: 0

## Anti-patterns

不要使用大面积渐变、玻璃拟态、纯装饰插图、默认 SaaS 卡片墙、表情符号代替图标或营销式功能介绍。
