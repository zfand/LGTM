// Unit tests for the pure-logic core of index.html.
// Run with:  node --test
// No dependencies — the core block is extracted from index.html by its
// markers and evaluated standalone (it is deliberately DOM-free).

import { readFileSync } from "node:fs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const START = "// ==== LGTM core";
const END = "// ==== end LGTM core";
const start = html.indexOf(START);
const end = html.indexOf(END);
assert.ok(start !== -1 && end > start, "core markers missing from index.html");
const src = html.slice(html.indexOf("\n", start), end);
const LGTM = new Function(`"use strict"; ${src}; return LGTM;`)();

describe("parseTags", () => {
  test("splits on commas and trims", () => {
    assert.deepEqual(LGTM.parseTags(" ship it , lgtm ,approved", ["x"]), ["ship it", "lgtm", "approved"]);
  });
  test("drops empty segments", () => {
    assert.deepEqual(LGTM.parseTags("a,,  ,b", ["x"]), ["a", "b"]);
  });
  test("falls back to defaults on blank input", () => {
    assert.deepEqual(LGTM.parseTags("   ", ["thumbs up", "lgtm"]), ["thumbs up", "lgtm"]);
  });
  test("fallback is a copy, not the defaults array itself", () => {
    const defaults = ["a"];
    const out = LGTM.parseTags("", defaults);
    out.push("b");
    assert.deepEqual(defaults, ["a"]);
  });
});

describe("sanitizeTags", () => {
  test("keeps only non-empty trimmed strings", () => {
    assert.deepEqual(LGTM.sanitizeTags([" a ", "", 42, "b"]), ["a", "42", "b"]);
  });
  test("non-array input yields empty list", () => {
    assert.deepEqual(LGTM.sanitizeTags("nope"), []);
    assert.deepEqual(LGTM.sanitizeTags(null), []);
  });
});

describe("gifUrl", () => {
  test("prefers downsized_medium, then downsized, then original", () => {
    const gif = { images: {
      original: { url: "orig" },
      downsized: { url: "down" },
      downsized_medium: { url: "med" },
    } };
    assert.equal(LGTM.gifUrl(gif), "med");
    delete gif.images.downsized_medium;
    assert.equal(LGTM.gifUrl(gif), "down");
    delete gif.images.downsized;
    assert.equal(LGTM.gifUrl(gif), "orig");
  });
  test("returns empty string when nothing usable", () => {
    assert.equal(LGTM.gifUrl({}), "");
    assert.equal(LGTM.gifUrl(null), "");
  });
});

describe("stillUrl", () => {
  test("prefers fixed_height_small_still, falls back to fixed_width_small_still", () => {
    const gif = { images: {
      fixed_width_small_still: { url: "w" },
      fixed_height_small_still: { url: "h" },
    } };
    assert.equal(LGTM.stillUrl(gif), "h");
    delete gif.images.fixed_height_small_still;
    assert.equal(LGTM.stillUrl(gif), "w");
    assert.equal(LGTM.stillUrl({}), "");
  });
});

describe("slimGif", () => {
  test("keeps only the fields the app needs", () => {
    const slim = LGTM.slimGif({
      id: "x1",
      title: "Nice",
      rating: "g",
      images: {
        downsized_medium: { url: "big.gif", width: "480" },
        fixed_height_small_still: { url: "small.gif" },
      },
      user: { huge: "object" },
    });
    assert.deepEqual(slim, { id: "x1", title: "Nice", url: "big.gif", preview: "small.gif" });
  });
  test("missing optional fields become empty strings", () => {
    assert.deepEqual(LGTM.slimGif({ id: "x2", images: { original: { url: "o" } } }),
      { id: "x2", title: "", url: "o", preview: "" });
  });
});

describe("sanitizeCache", () => {
  const day = "2026-07-10";
  const goodPool = { gifs: [{ id: "a", url: "u", title: "", preview: "" }], offsets: [50, 100], total: 3000, step: 2 };

  test("passes through a valid same-day cache", () => {
    const out = LGTM.sanitizeCache({ day, pools: { lgtm: goodPool } }, day);
    assert.deepEqual(out.pools.lgtm.gifs.map((g) => g.id), ["a"]);
    assert.deepEqual(out.pools.lgtm.offsets, [50, 100]);
    assert.equal(out.pools.lgtm.total, 3000);
    assert.equal(out.pools.lgtm.step, 2);
  });
  test("a cache from another day is discarded", () => {
    const out = LGTM.sanitizeCache({ day: "2026-07-09", pools: { lgtm: goodPool } }, day);
    assert.deepEqual(out, { day, pools: {} });
  });
  test("null / garbage input yields an empty cache", () => {
    assert.deepEqual(LGTM.sanitizeCache(null, day), { day, pools: {} });
    assert.deepEqual(LGTM.sanitizeCache("junk", day), { day, pools: {} });
    assert.deepEqual(LGTM.sanitizeCache({ day, pools: "junk" }, day), { day, pools: {} });
  });
  test("malformed pools and entries are dropped, valid ones kept", () => {
    const out = LGTM.sanitizeCache({ day, pools: {
      bad1: null,
      bad2: { gifs: "nope", offsets: [] },
      ok: { gifs: [null, { id: 5 }, { id: "a" }, { id: "b", url: "u" }], offsets: [1, "x", 2], total: "many", step: "x" },
    } }, day);
    assert.deepEqual(Object.keys(out.pools), ["ok"]);
    assert.deepEqual(out.pools.ok.gifs.map((g) => g.id), ["b"]);
    assert.deepEqual(out.pools.ok.offsets, [1, 2]);
    assert.equal(out.pools.ok.total, null);
    assert.equal(out.pools.ok.step, 0);
  });
});

describe("markdownFor", () => {
  test("wraps the url in LGTM image markdown", () => {
    assert.equal(LGTM.markdownFor("https://x/y.gif"), "![LGTM](https://x/y.gif)");
  });
});

describe("offsetCeiling", () => {
  test("unknown total uses the max offset", () => {
    assert.equal(LGTM.offsetCeiling(null, 50, 4949), 4949);
  });
  test("small result sets clamp to zero", () => {
    assert.equal(LGTM.offsetCeiling(30, 50, 4949), 0);
  });
  test("mid-size result sets leave room for one batch", () => {
    assert.equal(LGTM.offsetCeiling(120, 50, 4949), 70);
  });
  test("huge result sets cap at the max offset", () => {
    assert.equal(LGTM.offsetCeiling(100000, 50, 4949), 4949);
  });
});

describe("hashString", () => {
  test("is deterministic", () => {
    assert.equal(LGTM.hashString("lgtm"), LGTM.hashString("lgtm"));
  });
  test("distinguishes inputs", () => {
    assert.notEqual(LGTM.hashString("2026-07-08|lgtm"), LGTM.hashString("2026-07-09|lgtm"));
    assert.notEqual(LGTM.hashString("2026-07-08|lgtm"), LGTM.hashString("2026-07-08|ship it"));
  });
  test("returns an unsigned 32-bit int", () => {
    const h = LGTM.hashString("anything at all");
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
  });
});

describe("todayKey", () => {
  test("formats local date as YYYY-MM-DD with zero padding", () => {
    assert.equal(LGTM.todayKey(new Date(2026, 6, 8)), "2026-07-08");
    assert.equal(LGTM.todayKey(new Date(2026, 0, 1)), "2026-01-01");
  });
});

describe("windowOffset", () => {
  test("same day + tag gives the same offset", () => {
    const a = LGTM.windowOffset("lgtm", "2026-07-08", 0, 3000, 50, 4949);
    const b = LGTM.windowOffset("lgtm", "2026-07-08", 0, 3000, 50, 4949);
    assert.equal(a, b);
  });
  test("different days give different windows", () => {
    const days = new Set();
    for (let d = 1; d <= 20; d++) {
      days.add(LGTM.windowOffset("lgtm", `2026-07-${String(d).padStart(2, "0")}`, 0, 3000, 50, 4949));
    }
    // With a ~3000-wide range, 20 days landing on one offset would mean the seed is broken
    assert.ok(days.size > 15, `expected variety across days, got ${days.size} distinct offsets`);
  });
  test("step walks forward by one batch", () => {
    const base = LGTM.windowOffset("lgtm", "2026-07-08", 0, 3000, 50, 4949);
    const next = LGTM.windowOffset("lgtm", "2026-07-08", 1, 3000, 50, 4949);
    assert.equal(next, (base + 50) % (LGTM.offsetCeiling(3000, 50, 4949) + 1));
  });
  test("stays within the valid range and wraps", () => {
    const ceiling = LGTM.offsetCeiling(3000, 50, 4949);
    for (let step = 0; step < 200; step++) {
      const off = LGTM.windowOffset("ship it", "2026-07-08", step, 3000, 50, 4949);
      assert.ok(off >= 0 && off <= ceiling, `offset ${off} out of [0, ${ceiling}]`);
    }
  });
  test("tiny result sets always start at zero", () => {
    assert.equal(LGTM.windowOffset("lgtm", "2026-07-08", 0, 12, 50, 4949), 0);
    assert.equal(LGTM.windowOffset("lgtm", "2026-07-08", 7, 12, 50, 4949), 0);
  });
});

describe("filterCandidates", () => {
  const gifs = [{ id: "a" }, { id: "b" }, { id: "c" }];
  test("removes denied ids and the current gif", () => {
    assert.deepEqual(LGTM.filterCandidates(gifs, new Set(["b"]), "a"), [{ id: "c" }]);
  });
  test("null current keeps everything not denied", () => {
    assert.deepEqual(LGTM.filterCandidates(gifs, new Set(), null), gifs);
  });
});

describe("preferUnseen", () => {
  const gifs = [{ id: "a" }, { id: "b" }];
  test("returns only unseen gifs when some remain", () => {
    assert.deepEqual(LGTM.preferUnseen(gifs, new Set(["a"])), [{ id: "b" }]);
  });
  test("falls back to repeats when everything was seen", () => {
    assert.deepEqual(LGTM.preferUnseen(gifs, new Set(["a", "b"])), gifs);
  });
});

describe("pruneSeen", () => {
  test("keeps the most recent entries", () => {
    assert.deepEqual(LGTM.pruneSeen(["a", "b", "c", "d"], 2), ["c", "d"]);
  });
  test("leaves short lists alone", () => {
    const list = ["a", "b"];
    assert.equal(LGTM.pruneSeen(list, 5), list);
  });
});

describe("mergeDenylist", () => {
  test("appends new entries and dedupes by id", () => {
    const existing = [{ id: "a", title: "A", preview: "" }];
    const merged = LGTM.mergeDenylist(existing, [
      { id: "a", title: "dupe" },
      { id: "b", title: "B", preview: "p" },
    ]);
    assert.deepEqual(merged.map((d) => d.id), ["a", "b"]);
    assert.equal(merged[0].title, "A"); // existing entry wins
  });
  test("drops malformed entries and coerces fields", () => {
    const merged = LGTM.mergeDenylist([], [
      null, {}, { id: 42 }, { id: "" },
      { id: "ok", title: 7, preview: undefined },
    ]);
    assert.deepEqual(merged, [{ id: "ok", title: "7", preview: "" }]);
  });
  test("does not mutate the existing array", () => {
    const existing = [{ id: "a", title: "", preview: "" }];
    LGTM.mergeDenylist(existing, [{ id: "b" }]);
    assert.equal(existing.length, 1);
  });
  test("tolerates a non-array import", () => {
    assert.deepEqual(LGTM.mergeDenylist([], "junk"), []);
  });
});
