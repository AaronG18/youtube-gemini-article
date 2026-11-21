# youtube-gemini-article

Turn a YouTube video with subtitles into a structured Chinese article, streamed from Gemini on Cloudflare Workers.

- GitHub: <https://github.com/AaronG18/youtube-gemini-article>
- Public preview (temporary Cloudflare account): <https://youtube-gemini-article.mixolydian-hour.workers.dev>
- Claim the preview account (valid ~60 min from deploy): <https://dash.cloudflare.com/claim-preview?claimToken=lo31Z6Mv1JqfNauic71UWGqLNf1VtCoIZB3MNttqA80>

The preview account is temporary. For a permanent URL, run `npm run deploy` with your own Cloudflare account, or add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets and let `.github/workflows/deploy.yml` deploy on every push to `main`.

## What the app does

1. Accepts a YouTube URL and an optional natural-language requirement.
2. Resolves subtitles (built-in demo transcript for `xRh2sVcNXQ8`, or `TRANSCRIPT_ENDPOINT`).
3. Calls Gemini `streamGenerateContent`, forwarding each text delta to the browser over SSE.
4. Renders a sanitized HTML article with chapters.
5. Summarizes any chapter as structured 5W1H, using the article stored on the server.

See [PLAN.md](PLAN.md) for the full requirement analysis and the six-step delivery order.

## Requirement mapping

| Exam requirement | Implementation |
|---|---|
| YouTube URL with subtitles | `src/utils/youtube.ts` + `src/services/transcript.ts`; demo transcript makes the sample deterministic |
| Gemini free API | `src/services/gemini.ts` calls `generativelanguage.googleapis.com/v1beta/...:streamGenerateContent?alt=sse` |
| Stream while generating | `/api/generate` returns `text/event-stream`; the browser reads `response.body.getReader()` and prints deltas live |
| HTML article | `src/ui/page.ts` sanitizes the final HTML with a tag whitelist before rendering |
| Captcha / proxy | `getTranscript()` returns a 502 with a webshare.io + Cloudflare TCP-socket hint; `TRANSCRIPT_ENDPOINT` is the seam for a proxy-backed fetcher |
| Natural-language constraints | `src/services/constraints.ts` maps text to task type, style, audience and prohibitions; `formatConstraints()` injects them into the article prompt |
| Chapter 5W1H | `/api/5w1h` accepts only `sessionId` + `chapterId`; the article and transcript come from `ARTICLE_CONTEXT` KV (in-memory fallback for demo) |
| Structured fixed rendering | `fiveW1HSchema` (Zod) validates Who/What/When/Where/Why/How; the page renders it in `#summary` |

## How each piece works

### YouTube subtitles

`parseYouTubeVideoId()` supports `watch?v=`, `youtu.be/`, `/embed/` and `/shorts/`. For the demo video it returns 8 hardcoded transcript segments, so the demo never depends on YouTube's captcha state. For other videos, set `TRANSCRIPT_ENDPOINT` to a service that accepts `?videoId=` and returns `{ segments: [{ text, start, duration }] }`. Cloudflare Workers `fetch` cannot use an HTTP proxy directly; a real webshare.io path needs a TCP socket implementation, which is deliberately left as a replaceable service rather than a fake claim.

### Gemini streaming

`streamArticle()` posts the transcript prompt to Gemini with `alt=sse`, then parses `data:` frames incrementally (buffering partial frames). Each `candidates[0].content.parts[].text` delta is forwarded as `data: {"delta":"..."}`. The stream ends with `{"done":true, "sessionId":"..."}`.

### User constraints

`parseConstraints()` recognizes Chinese and English cues (总结/分析, 正式/幽默, 开发者/学生, 不要/禁止, 长度). The result becomes prompt lines under "User constraints:". The exam's requirement that output stay inside the user's scope is enforced by the explicit `Honor every explicit prohibition` line when prohibitions are detected.

### Chapter-level 5W1H

After the article stream completes, the Worker saves the transcript, article, constraints and extracted chapters under a UUID session id. The browser only sends `sessionId` and `chapterId`; `/api/5w1h` rebuilds the prompt from the stored article plus the selected chapter title, calls Gemini `generateContent` with `responseMimeType: application/json`, and returns Zod-validated fields. This directly satisfies "不得由前端重新提交整篇文章内容".

## Engineering tradeoffs

- **No frontend framework.** A single self-contained page keeps the Worker bundle small and avoids an asset-binding dependency; the tradeoff is that the browser sanitizer is hand-written.
- **HTML whitelist, not innerHTML of raw model output.** Only `h1/h2/h3/p/blockquote/strong/em/ul/ol/li/br` survive; all attributes are removed.
- **KV for sessions, memory for demos.** A Worker isolate's memory is not durable; production should bind `ARTICLE_CONTEXT`. The in-memory fallback is explicitly documented, not hidden.
- **One bug/feature per PR.** Each of the six steps has its own issue, PR and CI run, with tests written in the same step.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Copy `.dev.vars.example` to `.dev.vars` and set `GEMINI_API_KEY` for real generation. Without it the health endpoint and UI still work, but `/api/generate` returns 503.

## Verification status

At the time of writing: `npm test` **31 passed / 5 files**, `npm run typecheck` passed, `npm run build` (wrangler dry-run) passed, and `wrangler deploy --temporary` reported a successful upload with the public URL above. Direct HTTP checks of that URL from the authoring sandbox were inconclusive (local TLS/DNS interference and a 403 from the web proxy), so please open it in a normal browser to confirm.
