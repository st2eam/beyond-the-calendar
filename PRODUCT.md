# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React + TypeScript PWA, with Sites for static hosting and Cloudflare Worker services planned for sync.

## Users

个人长期记录者：希望保存每天发生的事，并在多年后通过一张人生地图回看自己的时间。

## Product Purpose

“日历之外 Beyond the Calendar”把出生日起的每一天变成一个可回望的生命格点，让记录、人生章节和重要日子存在于同一张地图上。

## Positioning

它不是按月切分的日历，而是一张以人生为尺度、以每一天为最小单位的个人时间地图。

## Operating Context

移动端优先，支持在 iPhone 主屏幕作为 PWA 使用；记录需要在离线时仍可完成，并在联网后同步。

## Capabilities and Constraints

- 第一版使用简体中文。
- 人生地图固定覆盖出生日起 100 年。
- MVP 包含日点记录、照片、人生章节、重要日子和提醒。
- IndexedDB 作为当前设备的主要数据源。
- 后续同步数据在设备端加密，服务端不保存日记和照片明文。
- 第一版面向单用户，不包含公开分享、社交和协作。

## Brand Commitments

- 品牌名：日历之外 Beyond the Calendar。
- 核心文案：记录你走过的每一天，也看见尚未抵达的日子。
- 视觉主题：旅行者时间手册。
- 语气温暖、克制、有日记感，不使用营销式首页。

## Evidence on Hand

当前仓库有一份早期 Vite React 界面草稿，作为功能线索和反参考；视觉重做不直接沿用其页面结构。

## Product Principles

1. 记录应该比整理更快。
2. 时间地图首先服务于回望，而不是统计。
3. 离线时仍然属于用户的数据必须可用。
4. 重要记忆应由用户掌握，而不是被平台锁定。

## Accessibility & Inclusion

人生格点地图提供 Canvas 之外的日期列表视图；所有关键操作提供可聚焦的原生控件、中文标签和清晰的状态反馈。
