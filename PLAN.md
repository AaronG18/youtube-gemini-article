# AI 全栈开发笔试题 — 需求分析与开发计划

## 1. 需求拆解

### 1.1 基础要求（必须全部满足）

| 编号 | 需求 | 可验证的验收标准 |
|---|---|---|
| B1 | Node.js / TypeScript，部署到 Cloudflare Worker，公开 URL | `wrangler deploy` 成功；`https://<worker>.workers.dev` 可访问 |
| B2 | 输入 YouTube 链接 + 字幕 | 校验 `youtube.com/watch?v=` / `youtu.be/`；内置演示字幕兜底 |
| B3 | 调用 Gemini AI Studio 免费 API 生成中文对话文章 | 使用 `generativelanguage.googleapis.com` 的 `streamGenerateContent` |
| B4 | 流式输出：生成一点展示一点 | 后端 SSE/NDJSON 逐块推送，前端 `ReadableStream` 增量渲染 |
| B5 | 文章 HTML 排版 | 章节标题 + 段落 + 对话样式，避免用户文章内容被当作 HTML 注入 |
| B6 | 验证码场景 | 字幕抓取失败时给出明确错误；预留 webshare.io 代理 + Cloudflare TCP Socket 的适配点 |

### 1.2 提升要求

| 编号 | 需求 | 验收标准 |
|---|---|---|
| A1 | 自然语言生成约束 | 可选输入；解析为任务类型 / 风格 / 受众 / 约束 / 5W1H，注入 system prompt |
| A2 | 章节级 5W1H | 每章节有 `[5W1H]` 按钮；返回固定结构的 Who/What/When/Where/Why/How |
| A3 | 服务端上下文 | 前端只传 `sessionId + chapterId`；不得回传整篇文章 |
| A4 | 结构可校验 | 5W1H 响应用 Zod 校验，失败返回稳定错误 |

### 1.3 明确不做（工程判断）

- 不实现通用 YouTube 验证码破解；代理只是可配置能力，默认使用内置字幕兜底。
- 不引入 React 等前端框架：单页原生 ES Module 足够，减少 Worker 包体与构建复杂度。
- 不把 API Key 放到前端；所有 Gemini 调用都经 Worker。
- 不把生成内容直接 `innerHTML` 注入：先结构化再转义渲染。

## 2. 架构决策

- **运行时**：Cloudflare Workers + Hono。Hono 的类型化 Context、Zod validator、流式 Response 与 Workers 原生契合。
- **目录**：遵循 `hono-typescript` skill 的 `routes / services / types / utils` 分层；每个资源一个目录。
- **数据**：
  - `transcript`：内置演示字幕（题目给出的视频）+ 可替换的 fetcher 接口。
  - `session`：生成上下文存 `ARTICLE_CONTEXT` KV；未绑定 KV 时退化为进程内 Map（文档写明限制）。
- **流式协议**：Worker → 浏览器 `text/event-stream`；Gemini → Worker 也是 stream，逐块解析 `candidates[].content.parts[].text`。
- **安全**：Zod 校验所有输入；`secureHeaders`；错误统一 JSON；5W1H 不接收文章内容。

## 3. 开发顺序（每步 = 1 Issue + 1 PR + CI）

| Step | Issue / PR | 产出 | 自动化测试 |
|---|---|---|---|
| 1 | #1 / #1 | 仓库骨架、Hono app、`/api/health`、CI、本分析文档 | health 路由测试 + typecheck |
| 2 | #2 / #2 | YouTube URL 解析、字幕获取接口、内置演示字幕 | URL/解析/兜底单测 |
| 3 | #3 / #3 | Gemini 流式服务、`/api/generate` SSE | mock fetch 的流式分块测试 |
| 4 | #4 / #4 | 静态前端页面、表单、流式渲染、章节渲染 | DOM/流解析单测 |
| 5 | #5 / #5 | 约束解析、服务端 session、章节级 5W1H | 约束解析 + 5W1H 结构测试 |
| 6 | #6 / #6 | README 说明、部署配置、端到端自检脚本 | 全套回归 + 构建验证 |

## 4. 关键风险

1. Gemini 免费额度与 key 配置：没有 key 时返回明确错误，不应前端白屏。
2. YouTube 字幕接口不稳定：兜底字幕保证演示链路可用；真实抓取作为可替换模块。
3. Worker 单 isolate 内存不适合长期会话：KV 为正式方案，内存 Map 仅用于本地/无 KV 演示。

## 5. 使用的 Skill / Rule

- **Skill**: `hono-typescript`（Mindrally）— Hono + TypeScript + Cloudflare Workers 的目录、类型、Zod、测试规范。
- **Rule**: 仓库 HARNESS 的 “one issue → one PR → CI with automated tests” 流程，以及禁止 heredoc / force push 等命令安全规则。
