# Veil

A Chrome extension that silently removes matching entries from your browsing history in real time, and optionally redirects sensitive sites to an incognito window — with no cloud sync, no accounts, and no data leaving your browser.

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/ceppnmfofaalcepfpohalgdfcofhflgc">
    <img src="https://img.shields.io/chrome-web-store/v/ceppnmfofaalcepfpohalgdfcofhflgc?label=Chrome%20Web%20Store&logo=google-chrome&logoColor=white&color=4285F4" alt="Chrome Web Store" />
  </a>
  <a href="https://chrome.google.com/webstore/detail/ceppnmfofaalcepfpohalgdfcofhflgc">
    <img src="https://img.shields.io/chrome-web-store/users/ceppnmfofaalcepfpohalgdfcofhflgc?label=users&color=a855f7" alt="Chrome Web Store Users" />
  </a>
</p>

---

## Features

- **Real-time history deletion** — as soon as you visit a URL matching a keyword, it is removed from history automatically
- **Per-keyword incognito redirect** — choose which keywords open in a private incognito window instead of your normal browser
- **Backfill scan on add** — when you add a new keyword, Veil immediately scans and cleans your existing history
- **Smart domain matching** — adding `facebook.com` also catches search queries like `?q=facebook` on Google, Presearch, and others
- **Manual scan** — trigger a full history scan at any time with one click

---

## Installation

**[Install from the Chrome Web Store](https://chrome.google.com/webstore/detail/ceppnmfofaalcepfpohalgdfcofhflgc)**

Or install manually:

**1. Download the extension**

Go to [Releases](../../releases) and download `veil-extension.zip`. Extract the folder somewhere permanent on your computer.

**2. Open Chrome Extensions**

Go to `chrome://extensions` in your address bar.

**3. Enable Developer Mode**

Toggle **Developer mode** on using the switch in the top-right corner.

**4. Load the extension**

Click **Load unpacked** and select the folder you extracted.

**5. Pin it**

Click the puzzle piece icon in the Chrome toolbar and pin **Veil** so it's always one click away.

---

## How to use

### Adding keywords

Type a keyword or domain into the input field and press **Enter** or click **+**.

- Use a full domain like `facebook.com` to block visits to the site and catch any search engine query containing the site name
- Use a plain word like `facebook` to catch any URL or page title containing that word
- Keywords are case-insensitive

When you add a keyword, Veil immediately scans your existing history and removes any matching entries.

### Per-keyword incognito redirect

Each keyword chip has an eye icon. Click it to toggle incognito redirect for that keyword.

- **Eye open (glowing)** — when you navigate to a URL matching this keyword, it automatically reopens in a new incognito window and the original tab is closed
- **Eye slashed (dim)** — history deletion only, no redirect

> No extension permissions are required for incognito windows. Veil opens them on your behalf without needing the "Allow in Incognito" setting.

### Manual scan

Click **Scan all history** to immediately run a full scan of your entire Chrome history against all keywords. Useful after adding several keywords at once, or if you suspect something was missed.

### Removing a keyword

Click the **×** button on any keyword chip to remove it. Veil will no longer clean or redirect URLs matching that keyword. Past history that was already deleted is not restored.

---

## Privacy

- All data (keywords, settings) is stored in `chrome.storage.sync` — synced across your signed-in Chrome browsers, never sent anywhere else
- No analytics, no tracking, no external servers
- The extension requires the following Chrome permissions:
  - `history` — to search and delete history entries
  - `storage` — to save your keywords and settings
  - `tabs` — to detect navigation and redirect to incognito

---

## Notes

- History synced from your Android device via Google account will also be cleaned once it arrives on desktop Chrome, since `onVisited` fires for synced entries
- Incognito pages are never added to Chrome history so they are not scanned
- The extension does not run on Android Chrome as Chrome for Android does not support extensions

---

## License

MIT — do whatever you like with it.

---

<p align="center">Built by <a href="https://github.com/yeetlabz">YeetLabs</a></p>
