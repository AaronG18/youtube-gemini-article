const styles = `
:root{color-scheme:dark;--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--accent:#2f81f7;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,sans-serif;line-height:1.65}
main{max-width:860px;margin:0 auto;padding:32px 20px 80px}h1{font-size:1.9rem;margin-bottom:4px}
p.intro{color:var(--muted);margin-top:0}form{display:grid;gap:12px;margin:28px 0}
input,textarea,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:var(--fg)}
textarea{min-height:88px}button{cursor:pointer;background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
button:disabled{opacity:.5;cursor:wait}#live{white-space:pre-wrap;color:var(--muted);font-family:ui-monospace,monospace;font-size:.82rem;max-height:180px;overflow:auto;border-left:2px solid #30363d;padding-left:12px}
article h2{margin-top:2em}.fivew{border:1px solid #30363d;background:#161b22;border-radius:999px;font-size:.75rem;padding:2px 8px;margin-left:8px;cursor:pointer;color:var(--accent)}
#summary{border:1px solid #30363d;border-radius:8px;padding:12px 16px;margin-top:12px;background:#161b22}
`;

const script = `
const form = document.getElementById('generate-form');
const live = document.getElementById('live');
const article = document.getElementById('article');
const summary = document.getElementById('summary');

function sanitize(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const allowed = new Set(['h1','h2','h3','p','blockquote','strong','em','ul','ol','li','br']);
  const walk = (node) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') { child.remove(); continue; }
      if (!allowed.has(tag)) { child.replaceWith.apply(child, Array.from(child.childNodes)); continue; }
      for (const attr of Array.from(child.attributes)) { child.removeAttribute(attr.name); }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

function renderChapters() {
  const headings = Array.from(article.querySelectorAll('h2'));
  headings.forEach((heading, index) => {
    const id = 'chapter-' + (index + 1);
    heading.id = id;
    const button = document.createElement('button');
    button.className = 'fivew';
    button.textContent = '[5W1H]';
    button.onclick = () => ask5w1h(id);
    heading.appendChild(button);
  });
}

async function ask5w1h(chapterId) {
  summary.textContent = 'Loading...';
  const response = await fetch('/api/5w1h', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionId: window.currentSessionId, chapterId})
  });
  if (!response.ok) { summary.textContent = 'Summary unavailable'; return; }
  const data = await response.json();
  summary.textContent = Object.entries(data).map((e) => e[0] + ': ' + e[1]).join('\\n');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true; live.textContent = ''; article.innerHTML = ''; summary.textContent = '';
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        url: document.getElementById('video-url').value,
        requirements: document.getElementById('requirements').value
      })
    });
    if (!response.ok) { live.textContent = 'Error ' + response.status; return; }
    window.currentSessionId = response.headers.get('X-Session-Id');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let raw = '';
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      buffer += decoder.decode(part.value, {stream: true});
      const frames = buffer.split('\\n\\n');
      buffer = frames.pop() || '';
      for (const frame of frames) {
        const line = frame.split('\\n').find((x) => x.startsWith('data: '));
        if (!line) continue;
        const eventData = JSON.parse(line.slice(6));
        if (eventData.delta) { raw += eventData.delta; live.textContent = raw.slice(-1200); }
        if (eventData.error) { live.textContent = eventData.error; }
      }
    }
    article.innerHTML = sanitize(raw);
    renderChapters();
    live.textContent = '';
  } catch (error) {
    live.textContent = String(error);
  } finally {
    button.disabled = false;
  }
});
`;

/** Render the single-page application served by the Worker. */
export const renderPage = (): string =>
  `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>YouTube → Gemini 中文对话文章</title><style>${styles}</style></head>
<body><main>
<h1>YouTube → 中文对话文章</h1>
<p class="intro">输入带字幕的视频链接，Gemini 会边生成边展示一篇按章节组织的中文文章。</p>
<form id="generate-form">
<input id="video-url" type="url" required placeholder="https://www.youtube.com/watch?v=xRh2sVcNXQ8" value="https://www.youtube.com/watch?v=xRh2sVcNXQ8"/>
<textarea id="requirements" placeholder="可选：目标受众、输出风格、约束条件……"></textarea>
<button type="submit">生成文章</button>
</form>
<pre id="live"></pre>
<article id="article"></article>
<div id="summary"></div>
</main><script>${script}</script></body></html>`;
