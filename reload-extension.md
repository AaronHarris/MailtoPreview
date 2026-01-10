# How to Test the Fixed Extension

## 1. Reload the Extension
1. Go to `chrome://extensions/`
2. Find "MailToWith - WebMail Handler"
3. Click the **reload** button (circular arrow icon)
4. Check that the errors are cleared

## 2. Test Fresh Installation Behavior
1. **Remove the extension completely** (click "Remove" button)
2. **Reinstall** by clicking "Load unpacked" and selecting the folder
3. **Immediately check popup**: Click extension icon - should show Gmail, Outlook, Yahoo Mail, ProtonMail
4. **Check options page**: Right-click extension icon → Options - should show all 4 default profiles
5. **Check context menu**: Right-click any mailto link - should show all 4 services

## 3. Test Context Menu
1. Open the `test-mailto.html` file in Chrome
2. Right-click on any mailto link
3. Verify that "Open in MailToWith" appears with clean submenu (no duplicates)
4. Should show: Gmail, Outlook, Yahoo Mail, ProtonMail

## 4. Test Custom Profiles
1. Click the extension icon in toolbar
2. Click "Email Profiles" to open options
3. Add a custom profile (e.g., "FastMail" with template: `https://www.fastmail.com/action/compose?to={{to}}&subject={{subject}}&body={{body}}`)
4. Save the profile
5. Go back to test page and right-click mailto link
6. Verify custom profile appears in context menu alongside defaults

## 5. Test Profile Management
1. In options page, try editing a profile
2. Try deleting a custom profile (default ones should remain)
3. Use "Restore defaults" button (should ask for confirmation)
4. Each action should update the context menu and popup properly

## Expected Behavior After Fresh Install
- ✅ Popup dropdown shows 4 default mail clients immediately
- ✅ Options page shows 4 default profiles immediately  
- ✅ Context menu shows 4 default services immediately
- ✅ All three interfaces stay synchronized
- ✅ No "Restore defaults" needed for basic functionality
- ✅ No Chrome extension errors

## If Issues Persist
1. Check Chrome DevTools Console for any errors
2. Go to `chrome://extensions/` and check for error messages
3. Try clearing extension storage: DevTools → Application → Storage → Clear storage