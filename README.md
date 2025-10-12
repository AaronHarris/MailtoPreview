# 📧 MailToWith — Smart Mailto Link Redirector for Webmail Clients

MailToWith is a lightweight Chrome Extension that **intercepts `mailto:` links** on websites and opens them directly in your preferred **webmail client** — such as Gmail, Outlook, Yahoo, or ProtonMail — instead of launching the system’s default mail app.

---

## 🌟 Features
✅ Redirects all `mailto:` link clicks to your configured webmail client  
✅ Supports **Gmail, Outlook, Yahoo Mail, and ProtonMail** out of the box  
✅ Add **custom email clients** using flexible URL templates  
✅ Persists and syncs settings across all Chrome devices via `chrome.storage.sync`  
✅ Built with **Manifest V3** — secure, fast, and future-ready

---

## 🧩 How It Works
1. When you click a `mailto:` link on a webpage,
2. The content script intercepts it and sends it to the background service worker,
3. The background script builds a URL for your preferred webmail service,
4. The link automatically opens in a **new browser tab** with fields (To, Subject, Body) pre-filled.

---

## ⚙️ Installation Guide

### 🧱 Option 1: Developer Mode (Local Installation)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/Zaldor/MailToWith.git
   ```
2. Go to `chrome://extensions` in your browser.
3. Enable **Developer mode** (top-right corner).
4. Click **Load unpacked**.
5. Select the `MailToWith/` directory.
6. The extension will install and become active immediately.

### 🛍️ Option 2: Chrome Web Store *(Coming Soon)*
Once published, you will be able to add it directly from the Chrome Web Store.

---

## 🧠 Configuration

### Open the Options Page:
1. Right-click the MailToWith icon → “Options”, or  
   Go to: `chrome://extensions` → Details → “Extension Options”

### From the Options UI:
- Choose your default mail client (Gmail, Outlook, Yahoo, ProtonMail)
- Add a **Custom Webmail Template**
  ```
  Example:
  https://webmail.myservice.com/compose?to={{to}}&subject={{subject}}&body={{body}}
  ```
- Click **Save**, and MailToWith will remember your choice!

---

## 🔗 Default Supported Providers

| Provider | Compose URL Template |
|-----------|----------------------|
| **Gmail** | `https://mail.google.com/mail/?extsrc=mailto&url=mailto:{{to}}?subject={{subject}}&body={{body}}` |
| **Outlook** | `https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&subject={{subject}}&body={{body}}` |
| **Yahoo Mail** | `https://compose.mail.yahoo.com/?to={{to}}&subject={{subject}}&body={{body}}` |
| **ProtonMail** | `https://mail.proton.me/u/0/compose?to={{to}}&subject={{subject}}&body={{body}}` |

---

## 🗂️ Project Structure

```
MailToWith/
├── manifest.json              # Manifest V3 configuration
├── src/
│   ├── background.js          # Handles mailto interception & redirect
│   ├── content.js             # Monitors and intercepts mailto links
│   ├── options.html           # Options page UI
│   ├── options.js             # Logic for storing/syncing preferences
│   └── popup.html (optional)  # Placeholder for future quick-access settings
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 🧩 Development Notes
Built using:
- **Chrome Manifest Version 3**
- `chrome.storage.sync` API for persistent settings
- `chrome.runtime` messaging for content ↔ background interaction

---

## 🧪 Future Roadmap
🚀 Add support for multiple profiles per domain  
💬 Add a popup selector to change provider on the fly  
🧱 Create localization support for multi-language UI  
☁️ Add import/export configuration feature  
🌐 Publish on Chrome Web Store  

---

## 🧑‍💻 Contributing
Pull requests are welcome!  
If you’d like to support more mail clients or features, open an issue or PR on GitHub:
👉 [https://github.com/Zaldor/MailToWith](https://github.com/Zaldor/MailToWith)

---

## 🪪 License
Released under the **MIT License**.  
Feel free to use, modify, and distribute this project as long as attribution is maintained.

📍 Created with ❤️ by [Zaldor](https://github.com/Zaldor)