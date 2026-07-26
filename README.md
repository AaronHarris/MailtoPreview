# 📧 MailtoChoose — Preview `mailto:` Links and Choose Your Webmail Client

MailtoChoose is a lightweight Chrome Extension that **intercepts `mailto:` links** on websites, shows you a **preview of the message** before anything is sent, and then opens it in the **webmail client of your choice** — Gmail, Outlook, Yahoo, ProtonMail, or your own — instead of launching the system’s default mail app.

> Formerly **MailToWith**, created by [Zaldor](https://github.com/Zaldor). See [Credits](#-credits).

---

## 🌟 Features
✅ **Previews `mailto:` links** in a compose-style window before opening anything
✅ Shows To, Cc, Bcc, Subject, and the message body, with bare URLs turned into links
✅ Preview window can be switched off to go straight to webmail
✅ Redirects all `mailto:` link clicks to your configured webmail client
✅ Supports **Gmail, Outlook, Yahoo Mail, and ProtonMail** out of the box
✅ Add **custom email clients** using flexible URL templates
✅ Persists and syncs settings across all Chrome devices via `chrome.storage.sync`
✅ Built with **Manifest V3** — secure, fast, and future-ready

---

## 🧩 How It Works
1. When you click a `mailto:` link on a webpage,
2. The content script intercepts it and sends it to the background service worker,
3. The preview window opens and shows the message exactly as the link described it,
4. Clicking **Open in …** builds a compose URL for that webmail service,
5. The link opens in a **new browser tab** with the fields (To, Cc, Bcc, Subject, Body) pre-filled.

Prefer the old behaviour? Turn off the preview in the toolbar popup and clicks go straight to your webmail client.

---

## ⚙️ Installation Guide

### 🧱 Option 1: Developer Mode (Local Installation)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/AaronHarris/MailtoChoose.git
   ```
2. Go to `chrome://extensions` in your browser.
3. Enable **Developer mode** (top-right corner).
4. Click **Load unpacked**.
5. Select the `MailtoChoose/` directory.
6. The extension will install and become active immediately.

### 🛍️ Option 2: Chrome Web Store *(Coming Soon)*
Once published, you will be able to add it directly from the Chrome Web Store.

---

## 🧠 Configuration

### Open the Options Page:
1. Right-click the MailtoChoose icon → “Options”, or
   Go to: `chrome://extensions` → Details → “Extension Options”

### From the Options UI:
- Add, edit, or delete webmail profiles
- Add a **Custom Webmail Template**
  ```
  Example:
  https://webmail.myservice.com/compose?to={{to}}&subject={{subject}}&body={{body}}
  ```
- Click **Save**, and MailtoChoose will remember your choice!

### From the Toolbar Popup:
Click the MailtoChoose icon to pick your **default mail client** and to turn the **preview window** on or off. The default client is the one the preview window’s main button opens, and it is marked `default` in the drawer.

---

## 🔗 Default Supported Providers

| Provider | Compose URL Template |
|-----------|----------------------|
| **Gmail** | `https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}` |
| **Outlook** | `https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}` |
| **Yahoo Mail** | `https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}` |
| **ProtonMail** | `https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}` |

---

## 🗂️ Project Structure

```
MailtoChoose/
├── manifest.json              # Manifest V3 configuration
├── src/
│   ├── background.js          # Handles mailto parsing, preview, & redirect
│   ├── content.js             # Monitors and intercepts mailto links
│   ├── preview.html           # Compose preview window
│   ├── preview.js             # Renders the message & the client picker
│   ├── options.html           # Options page UI
│   ├── options.js             # Logic for storing/syncing preferences
│   ├── popup.html             # Toolbar popup for the default client
│   └── popup.js               # Popup logic
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── Letter.svg
├── test-mailto.html           # Sample mailto links for manual testing
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

## 🧩 Development Notes
Built using:
- **Chrome Manifest Version 3**
- `chrome.storage.sync` API for persistent settings
- `chrome.runtime` messaging for content ↔ background ↔ preview interaction
- `chrome.windows` API for the preview popup

Per [RFC 6068](https://www.rfc-editor.org/rfc/rfc6068), `mailto:` bodies are plain text, so the preview renders them as text and only linkifies bare URLs — any HTML in a link’s body is shown literally rather than rendered.

---

## 🧪 Future Roadmap
🚀 Add support for multiple profiles per domain
🧱 Create localization support for multi-language UI
☁️ Add import/export configuration feature
🌐 Publish on Chrome Web Store

---

## 🧑‍💻 Contributing
Pull requests are welcome!
If you’d like to support more mail clients or features, open an issue or PR on GitHub:
👉 [https://github.com/AaronHarris/MailtoChoose](https://github.com/AaronHarris/MailtoChoose)

---

## 🪪 License
Released under the **MIT License** — see [LICENSE](LICENSE).
Feel free to use, modify, and distribute this project as long as attribution is maintained.

---

## 🙏 Credits

MailtoChoose began life as **MailToWith**, created with ❤️ by [Zaldor](https://github.com/Zaldor), whose original work is the foundation this project is built on — the mailto parsing, the webmail profile system, and the extension’s overall design are all his.

Currently maintained by [AaronHarris](https://github.com/AaronHarris).
