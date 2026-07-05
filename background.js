let cachedKeywords = []; // [{ kw: string, incognito: boolean }]
let settingsReady;

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalise(raw) {
  return (raw || []).map((k) =>
    typeof k === "string"
      ? { kw: k.toLowerCase(), incognito: false }
      : { ...k, kw: k.kw.toLowerCase() }
  );
}

// Build a haystack from the raw URL, percent-decoded URL, each query param
// value, and the page title — ensures keywords in search queries are caught
function buildHaystack(url, title) {
  const raw = (url || "").toLowerCase();
  let haystack = raw;

  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) haystack += " " + decoded;
  } catch (_) {}

  try {
    new URL(url).searchParams.forEach((val) => {
      haystack += " " + val.toLowerCase();
    });
  } catch (_) {}

  haystack += " " + (title || "").toLowerCase();
  return haystack;
}

// For domain keywords like "facebook.com", also match just "facebook"
// so search queries like ?q=facebook are caught too
function keywordVariants(kw) {
  const variants = [kw];
  const dot = kw.lastIndexOf(".");
  if (dot > 0) variants.push(kw.slice(0, dot));
  return variants;
}

function matchesAnyKeyword(url, title) {
  const haystack = buildHaystack(url, title);
  return cachedKeywords.some(({ kw }) => keywordVariants(kw).some((v) => haystack.includes(v)));
}

// ── Settings ──────────────────────────────────────────────────────────────────
function loadSettings() {
  const p = new Promise((resolve) => {
    chrome.storage.sync.get({ keywords: [] }, (data) => {
      cachedKeywords = normalise(data.keywords);
      resolve(cachedKeywords);
    });
  });
  if (!settingsReady) settingsReady = p;
  return p;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.keywords) {
    cachedKeywords = normalise(changes.keywords.newValue);
  }
});

// ── Tab navigation — history deletion + incognito redirect ────────────────────
// Two signals per navigation for reliability:
//   changeInfo.url  — earliest possible moment (URL may not be in history yet)
//   status=complete — page fully loaded; URL is guaranteed to be in history
const pendingClean = new Set();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await settingsReady;

  if (changeInfo.url) {
    // Per-keyword incognito redirect
    if (!tab.incognito) {
      const match = cachedKeywords.find(
        (k) => k.incognito && keywordVariants(k.kw).some((v) => buildHaystack(changeInfo.url, "").includes(v))
      );
      if (match) {
        chrome.windows.create({ url: changeInfo.url, incognito: true });
        chrome.tabs.remove(tabId);
        return;
      }
    }

    if (!tab.incognito && matchesAnyKeyword(changeInfo.url, "")) {
      pendingClean.add(tabId);
    }
  }

  if (changeInfo.status === "complete" && !tab.incognito && tab.url) {
    const shouldClean = pendingClean.has(tabId) || matchesAnyKeyword(tab.url, tab.title);
    pendingClean.delete(tabId);
    if (shouldClean) await chrome.history.deleteUrl({ url: tab.url });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => pendingClean.delete(tabId));

// ── onVisited: fallback for any navigation not caught by tabs.onUpdated ───────
chrome.history.onVisited.addListener(async (item) => {
  await settingsReady;
  if (!cachedKeywords.length) return;
  if (matchesAnyKeyword(item.url, item.title)) {
    await chrome.history.deleteUrl({ url: item.url });
  }
});

// ── Bulk scan ─────────────────────────────────────────────────────────────────
async function scanAndClean(keywords) {
  if (!keywords.length) return 0;

  const toDelete = new Set();

  await new Promise((resolve) => {
    chrome.history.search({ text: "", startTime: 0, maxResults: 100000 }, (items) => {
      for (const item of items) {
        const haystack = buildHaystack(item.url, item.title);
        if (keywords.some(({ kw }) => keywordVariants(kw).some((v) => haystack.includes(v)))) {
          toDelete.add(item.url);
        }
      }
      resolve();
    });
  });

  await Promise.all([...toDelete].map((url) => chrome.history.deleteUrl({ url })));
  chrome.storage.local.set({ lastRun: Date.now(), lastDeleted: toDelete.size });
  return toDelete.size;
}

// ── Startup ───────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  const keywords = await loadSettings();
  if (details.reason === "install") await scanAndClean(keywords);
});

loadSettings();

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "runNow") {
    loadSettings()
      .then((keywords) => scanAndClean(keywords))
      .then((deleted) => sendResponse({ ok: true, deleted }));
    return true;
  }

  if (msg.action === "keywordAdded") {
    const kw = msg.keyword.toLowerCase();
    const toDelete = new Set();
    chrome.history.search({ text: "", startTime: 0, maxResults: 100000 }, async (items) => {
      for (const item of items) {
        if (keywordVariants(kw).some((v) => buildHaystack(item.url, item.title).includes(v))) {
          toDelete.add(item.url);
        }
      }
      await Promise.all([...toDelete].map((url) => chrome.history.deleteUrl({ url })));
      chrome.storage.local.set({ lastRun: Date.now(), lastDeleted: toDelete.size });
      sendResponse({ ok: true, deleted: toDelete.size });
    });
    return true;
  }
});
