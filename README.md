# 日历之外 · Beyond the Calendar

一个本地优先的 PWA，把人生的每一天保存成可以回望的格点。

## 本地运行

```bash
npm install
npm run dev
```

## 网站部署

线上版本由 Sites 托管，生产地址为：

<https://beyond-the-calendar.stream1013.chatgpt.site>

项目源码仓库为：

<https://github.com/st2eam/beyond-the-calendar>

Sites 只托管前端静态文件，不保存用户日记、照片或其他个人数据。当前 MVP 使用浏览器 IndexedDB 本地存储，离线时也可以继续记录；后续同步能力将由独立的 Cloudflare Worker、D1 和 R2 提供。

部署配置位于 `.openai/hosting.json`，静态输出目录为 `dist`。发布前先完成生产构建：

```bash
npm run build
```

正式发布时，将同一个 Git 提交分别推送到 GitHub 和 Sites 源仓库，再使用 Sites 保存版本并部署。项目不使用 GitHub Pages，也不使用 GitHub Actions 部署。不要把 `.env`、恢复码、密钥或其他生产凭据提交到仓库。

## 当前 MVP

- 设置出生日期后生成 100 年人生格点地图
- Canvas 绘制约 36,500 个生命格点，并提供日期列表视图
- 点击格点记录文字、心情、地点、人物、标签和重要标记
- 照片在本地压缩后保存，单日最多 9 张
- 创建可重叠的人生章节
- 创建单次、周年和经过天数三类重要日子
- IndexedDB 本地优先存储，支持离线记录
- 支持安装到手机主屏幕

## 设计与架构

这个项目使用“旅行者时间手册”作为视觉方向：暖纸色、墨水绿、旧红和日期印章，首屏直接进入人生地图，而不是营销首页。

Sites 负责静态 PWA 部署；未来的端到端加密同步、D1/R2 和 Web Push 定时任务由独立 Cloudflare Worker 承担。当前 MVP 完全可以不依赖后端运行。

产品真相和视觉约束分别记录在 `PRODUCT.md` 与 `DESIGN.md`，开发说明见 `docs/`。
