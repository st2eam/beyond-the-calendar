# Agent guidance

- 产品真相以 `PRODUCT.md` 为准，视觉系统以 `DESIGN.md` 为准。
- `.agents/skills/` 只保留项目要求的 `impeccable` 技能。
- 修改 UI 后，使用 Impeccable detector 做一次机械检查。
- 不把个人数据、密钥、恢复码、`.env` 或生产凭据提交到 Git。
- 本地数据优先使用 IndexedDB；不要将 localStorage 作为用户记录的最终数据源。
- 保持简体中文文案和“旅行者时间手册”视觉方向。
