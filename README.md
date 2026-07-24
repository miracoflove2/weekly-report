# 业务开发一部周报

一个部署在 Cloudflare Pages、使用 Pages Functions 与 Workers KV 保存数据的共享周报网站。

## 功能

- 按自然周填写本周总结、下周计划及其他事项
- 项目进度表、固定执行人、截止日期与自动状态计算
- 手动选择“未启动、进行中、已暂停、已延期”，并随时恢复自动判断
- 自动保存、移动端适配、Cloudflare KV 跨设备共享
- 服务端密码认证、HttpOnly 会话 Cookie 与 API 访问保护

## 本地开发

要求 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

需要联调 Pages Functions 与本地 KV 时：

```bash
npm run build
npm run pages:dev
```

`wrangler pages dev` 会为 `WEEKLY_REPORTS` 创建本地 KV 存储，不会写入生产数据。
本地认证变量放在不会提交到 Git 的 `.dev.vars` 中；可复制 `.dev.vars.example` 创建。

## 部署到 Cloudflare Pages

1. 将代码推送到 GitHub 或 GitLab，并在 Cloudflare 控制台创建 Pages 项目。
2. 构建命令填写 `npm run build`，构建输出目录填写 `dist`。
3. 创建一个 Workers KV Namespace。
4. 在 Pages 项目的 **Settings → Bindings** 中添加 KV Namespace，变量名必须为 `WEEKLY_REPORTS`。
5. 分别为 Production 和 Preview 环境配置 KV。建议使用两个独立 Namespace，避免预览环境修改生产数据。
6. 重新部署项目，使绑定生效。

### 配置认证变量

在 Pages 项目的 **Settings → Environment variables** 中，为 Production 和 Preview 添加：

```text
APP_PASSWORD = 9527
SESSION_SECRET = 一段至少32字符的随机字符串
```

建议将两项都设置为 Secret。可用密码管理器生成 `SESSION_SECRET`；不要与访问密码相同。配置后重新部署项目。

项目不会在仓库中保存 Namespace ID、API Token 或其他 Cloudflare 凭据。

## 数据说明

数据按周和内容类型拆分为多个 KV 键。KV 是最终一致性存储，同一字段被多人同时编辑时以最后一次写入为准，其他地区的读取可能短时间看到旧值。页面提供“刷新最新数据”按钮。

未登录访问会跳转到登录页，登录会话有效期为 7 天。当前为共享密码模式，不区分具体成员，也不记录每次修改的操作者。
