const keywordInput = document.getElementById("keyword-input");
const addBtn       = document.getElementById("add-btn");
const chipContainer= document.getElementById("chip-container");
const keywordCount = document.getElementById("keyword-count");
const emptyMsg     = document.getElementById("empty-msg");
const runBtn       = document.getElementById("run-btn");
const runIcon      = document.getElementById("run-icon");
const runLabel     = document.getElementById("run-label");
const statusLine   = document.getElementById("status-line");
const resultBadge      = document.getElementById("result-badge");

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// keywords: [{ kw: string, incognito: boolean }]
let keywords = [];

function normalise(raw) {
  return (raw || []).map((k) =>
    typeof k === "string" ? { kw: k, incognito: false } : k
  );
}

// ── Load ──────────────────────────────────────────────────────────────────────
chrome.storage.sync.get({ keywords: [] }, (data) => {
  keywords = normalise(data.keywords);
  renderChips();
});

chrome.storage.local.get({ lastRun: null, lastDeleted: null }, ({ lastRun, lastDeleted }) => {
  if (lastRun) setStatus(`Last cleaned ${timeSince(lastRun)} · ${lastDeleted} removed`);
});

function save() {
  chrome.storage.sync.set({ keywords });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderChips() {
  chipContainer.innerHTML = "";
  keywordCount.textContent = keywords.length;

  if (!keywords.length) {
    chipContainer.appendChild(emptyMsg);
    return;
  }

  for (const { kw, incognito } of keywords) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.kw = kw;
    chip.innerHTML = `
      <span class="chip-label">${escapeHtml(kw)}</span>
      <button class="chip-incognito ${incognito ? "active" : ""}" data-kw="${escapeHtml(kw)}" aria-label="Toggle incognito for ${escapeHtml(kw)}" title="${incognito ? "Incognito redirect on" : "Incognito redirect off"}">
        ${incognito ? `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>` : `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>`}
      </button>
      <button class="chip-remove" data-kw="${escapeHtml(kw)}" aria-label="Remove ${escapeHtml(kw)}">
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
        </svg>
      </button>`;
    chipContainer.appendChild(chip);
  }
}

chipContainer.addEventListener("click", (e) => {
  // Remove
  const removeBtn = e.target.closest(".chip-remove");
  if (removeBtn) {
    const chip = removeBtn.closest(".chip");
    const kw = chip.dataset.kw;
    chip.classList.add("removing");
    chip.addEventListener("animationend", () => {
      keywords = keywords.filter((k) => k.kw !== kw);
      save();
      renderChips();
    }, { once: true });
    return;
  }

  // Toggle incognito
  const incogBtn = e.target.closest(".chip-incognito");
  if (incogBtn) {
    const kw = incogBtn.dataset.kw;
    const entry = keywords.find((k) => k.kw === kw);
    if (!entry) return;
    entry.incognito = !entry.incognito;
    save();
    renderChips();
  }
});

// ── Add ───────────────────────────────────────────────────────────────────────
function addKeyword() {
  const value = keywordInput.value.trim().toLowerCase();
  if (!value) return;
  if (keywords.some((k) => k.kw === value)) {
    keywordInput.select();
    showResult(`"${value}" already exists`, "bad");
    return;
  }

  keywords.push({ kw: value, incognito: false });
  keywordInput.value = "";
  save();
  renderChips();

  setStatus("Scanning existing history…");
  chrome.runtime.sendMessage({ action: "keywordAdded", keyword: value }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      setStatus("Scan failed — try again");
      return;
    }
    setStatus(`Cleaned ${resp.deleted} item(s) for "${value}"`);
    showResult(`${resp.deleted} removed`, resp.deleted === 0 ? "bad" : "good");
  });
}

addBtn.addEventListener("click", addKeyword);
keywordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addKeyword(); });

// ── Scan all ──────────────────────────────────────────────────────────────────
runBtn.addEventListener("click", () => {
  runBtn.disabled = true;
  runIcon.classList.add("spinning");
  runLabel.textContent = "Scanning…";
  setStatus("Scanning all history…");

  chrome.runtime.sendMessage({ action: "runNow" }, (resp) => {
    runBtn.disabled = false;
    runIcon.classList.remove("spinning");
    runLabel.textContent = "Scan all history";
    if (chrome.runtime.lastError || !resp) {
      setStatus("Scan failed — try again");
      return;
    }
    setStatus(`Done · ${resp.deleted} item(s) removed`);
    showResult(`${resp.deleted} removed`, resp.deleted === 0 ? "bad" : "good");
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(text) { statusLine.textContent = text; }

let _badgeTimer;
function showResult(text, type = "good") {
  resultBadge.textContent = text;
  resultBadge.className = type;
  clearTimeout(_badgeTimer);
  _badgeTimer = setTimeout(() => { resultBadge.className = "hidden"; }, 3000);
}

function timeSince(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
