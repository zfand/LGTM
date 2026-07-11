# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

**LGTM** — a single-file static gif picker for code reviews, hosted on GitHub Pages. The user supplies their own Giphy API key at runtime (stored in `localStorage`), rolls a random SFW gif from a configurable tag list, and copies it as a URL or `![LGTM](url)` markdown.

## Layout

- `index.html` — the entire app: markup, CSS, and vanilla JS in one file. This is intentional; keep it that way.
- `og-image.png`, `apple-touch-icon.png` — static link-preview images (Open Graph tags in the head point at them; iMessage/Slack can't read data URIs). The only non-HTML assets allowed.
- `tests/lgtm.test.mjs` — unit tests for the pure-logic core (see below). Run with `node --test`.
- `.github/workflows/test.yml` — runs the tests on every push.
- `README.md` — user-facing docs.

There is no build step, no package.json, and no dependencies (tests use only Node built-ins). Don't add any.

## Hard rules

- **Single file.** All new UI/logic goes into `index.html`. No frameworks, no external CSS/JS, no CDN imports.
- **No secrets in the repo.** The Giphy API key is user-supplied and lives only in `localStorage` (`lgtm.apiKey`). Never hardcode a key.
- **SFW.** Every Giphy call must keep `rating=g`.
- **Light mode, clean, fast.** Match the existing visual style.

## Conventions in index.html

- The script starts with a marked block (`// ==== LGTM core` … `// ==== end LGTM core`) holding all pure, DOM-free logic as the `LGTM` object. The tests extract this block by its markers and eval it in Node, so: keep the markers intact, keep the block free of DOM/`fetch`/`localStorage` references, and put any new testable logic inside it.
- localStorage keys are namespaced `lgtm.*` (`lgtm.apiKey`, `lgtm.tags`, `lgtm.denylist`, `lgtm.seen`, `lgtm.cache`, `lgtm.depths`, `lgtm.motion`) and read/written through the `store` helper.
- Giphy's `total_count` overstates how deep results actually go — deep offsets return **200 with empty `data`**. The believed depth per tag only ratchets down (`LGTM.updateDepth`), persists across days in `lgtm.depths`, and `growPool` always falls back to offset 0 before giving up. Don't trust `total_count` directly.
- Pools hold **slim** gif objects (`LGTM.slimGif`: `{id, title, url, preview}`), never raw Giphy API objects.
- Fetched pools are persisted to a day-scoped cache (`lgtm.cache`, validated by `LGTM.sanitizeCache`) so extra tabs and reloads reuse them instead of spending API quota — free Giphy keys are rate-limited per hour and the quota is shared across tabs. Don't remove this cache.
- Denylist entries are `{id, title, preview}` objects, not bare IDs — the preview/title make the settings list readable.
- API responses are cached per tag in the `pools` Map. Fetch offsets are **seeded by the local date** (`LGTM.windowOffset`): same day + tag → same slice of Giphy results, next day → a different slice. A capped viewing history (`lgtm.seen`, `LGTM.preferUnseen`) avoids repeats across days. Don't regress this to always fetching offset 0 — variety over months of reviews is a core requirement.
- Never inject API-sourced strings via `innerHTML` — use `textContent` / `createElement` (gif titles are untrusted).

## Tests

`node --test` (zero deps, Node ≥ 20). Tests live in `tests/lgtm.test.mjs` and cover only the `LGTM` core object. When you change core behavior, update/add tests in the same commit.

## Verifying changes

Serve locally (`python3 -m http.server`) and open the page. Without a key you should see the setup card; with a valid key, a gif should load and all buttons (copy ×2, reroll, deny) should work. `fetch` to Giphy won't work from `file://` in some browsers, so use a local server.
