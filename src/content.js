// MailToWith - Content Script
// Intercepts clicks on mailto links and sends them to the background script

const port = chrome.runtime.connect({ name: 'mailto' });

function interceptMailtoLinks() {
  const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
  for (const link of mailtoLinks) {
    if (!link.dataset.mailtowithBound) {
      link.dataset.mailtowithBound = 'true';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('href');
        try {
          port.postMessage({ type: 'MAILTO_CLICK', mailto: href });
        } catch (err) {
          console.warn('MailToWith: unable to send message - reconnecting');
          const newPort = chrome.runtime.connect({ name: 'mailto' });
          newPort.postMessage({ type: 'MAILTO_CLICK', mailto: href });
        }
      });
    }
  }
}

// Observe DOM changes for dynamically loaded mailto links
const observer = new MutationObserver(() => interceptMailtoLinks());
observer.observe(document.body, { childList: true, subtree: true });

// Initial scan
interceptMailtoLinks();