# youtube-gemini-article

Turn a YouTube video with subtitles into a structured Chinese article, streamed from Gemini on Cloudflare Workers.

## Status

Early scaffold. See [PLAN.md](PLAN.md) for the full requirement analysis and the step-by-step delivery order.

## Development

```bash
npm install
npm test
npm run typecheck
npm run dev
```

## Deployment

```bash
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

The public URL is printed by `wrangler deploy` (by default `https://youtube-gemini-article.<subdomain>.workers.dev`).
