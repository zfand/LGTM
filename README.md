# LGTM ✅

> *Looks Good To Me* — but make it a gif. 🎬

A tiny, single-file gif picker for code reviews. Roll a random **thumbs up / ship it / approved** gif, click it, and paste ready-made markdown straight into your PR. That's it. That's the app.

![vibe](https://img.shields.io/badge/vibe-immaculate-brightgreen) ![build](https://img.shields.io/badge/build-none%20needed-blue) ![frameworks](https://img.shields.io/badge/frameworks-0-orange)

## ✨ Features

- 🎲 **Random gif on every roll** — pulled from Giphy using your own tag list
- 📅 **A fresh set every day** — the slice of Giphy results you draw from is seeded by today's date, and a viewing history avoids repeats, so your approvals stay fresh for months
- 📋 **One-click copy** — as a raw gif URL or as `![LGTM](url)` markdown (clicking the gif copies markdown)
- 🚫 **Never again** — banish a gif forever with the denylist
- 🏷️ **Custom tags** — comma-separated, saved automatically (default: `thumbs up, lgtm, ship it, approved`)
- 💾 **Export / import** — move your denylist & tags between machines as JSON
- 🧼 **SFW only** — every API call is pinned to `rating=g`
- 🪶 **Zero everything** — no build step, no frameworks, no external CSS. One `index.html`.

## 🚀 Getting started

1. **Get a free Giphy API key** (takes ~2 minutes):
   go to [developers.giphy.com](https://developers.giphy.com/dashboard/), create an app, pick **API**.
2. **Open the page.** It'll ask for your key on first visit and stash it in `localStorage` — your key stays on your machine and is never committed to this repo. 🔐
3. **Roll, click, paste, approve.** 🚢

## 🌐 Hosting

It's just a static file. Drop `index.html` anywhere — GitHub Pages, Netlify, a USB stick, whatever. For GitHub Pages: **Settings → Pages → Deploy from branch**, done.

## 🧪 Tests

The pure logic (tag parsing, daily-window math, denylist merging…) lives in a marked, DOM-free block inside `index.html` and is unit-tested with Node's built-in runner — still zero dependencies:

```sh
node --test
```

They also run in CI on every push. ✅

## 🧠 FAQ

**Why do *I* have to bring the API key?**
Because this repo is public and hardcoding a key into a GitHub Pages site means donating your rate limit to the internet. Bring your own — it's free.

**Where does my data live?**
Entirely in your browser's `localStorage`: the API key, your tags, and your denylist. Nothing is sent anywhere except to Giphy itself.

**A cursed gif keeps haunting me.**
Smash **🚫 Never show this again**. It's gone. Check *Settings → Denylist* to review your graveyard 🪦 or grant pardons.

---

Powered by [GIPHY](https://giphy.com). Ship it! 🚢
