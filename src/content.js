// MailToWith - Content Script
// Intercepts clicks on mailto links and sends them to the background script

chrome.runtime.onMessage; // marker line placeholder, we replace persistent port

function interceptMailtoLinks() {
  const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
  for (const link of mailtoLinks) {
    if (!link.dataset.mailtowithBound) {
      link.dataset.mailtowithBound = 'true';
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        const href = link.getAttribute('href');
        try {
          // Verify that the extension context is still valid before messaging
          if (chrome?.runtime?.id) {
            await chrome.runtime.sendMessage({ type: 'MAILTO_CLICK', mailto: href });
          } else {
            console.warn('MailToWith: Extension context invalidated (no runtime id), opening directly.');
            window.open(href, '_blank');
          }
        } catch (error) {
          console.warn('MailToWith: Extension context invalidated, reloading extension...', error);
          // Graceful fallback when background is terminated or reloaded
          window.open(href, '_blank');
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