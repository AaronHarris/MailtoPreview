# Changelog

## [1.2.1] - 2026-01-10

### 🐛 Critical Bug Fixes
- **Fixed context menu duplication**: Resolved Chrome extension errors caused by duplicate context menu IDs
- **Fixed empty UI on fresh install**: Popup and options now show default profiles immediately without requiring "Restore defaults"
- **Fixed data synchronization**: All components (context menu, popup, options) now use the same data source

### 🔧 Technical Improvements
- Added proper error handling and logging throughout the extension
- Implemented debounced context menu updates to prevent race conditions
- Added `chrome.runtime.onStartup` handler for better lifecycle management
- Standardized template URLs across all components with CC/BCC support
- Added fallback logic to ensure consistent behavior when storage is empty
- Improved async/await usage and promise handling
- Better data type handling in URL building functions

### 🎨 UI/UX Enhancements
- Fixed HTML/JavaScript mismatches in options page
- Added proper display names (Gmail, Outlook, Yahoo Mail, ProtonMail)
- Improved modal functionality and profile management
- Added confirmation dialog for 'Restore defaults' action
- Consistent capitalization and naming across all interfaces

### 🧪 Testing & Development
- Added `test-mailto.html` for easy testing of mailto links
- Added `reload-extension.md` with comprehensive testing instructions
- Ensured all components work correctly on fresh installation
- Added proper error callbacks for context menu operations

### 📋 Code Quality
- Unified default profile templates to match authoritative source
- Removed duplicate and conflicting code
- Improved error handling with graceful fallbacks
- Better separation of concerns between components

## [1.0.0] - Previous Release
- Initial release with basic mailto link redirection
- Support for Gmail, Outlook, Yahoo Mail, and ProtonMail
- Custom profile management
- Context menu integration
- Chrome storage sync support