Subsequently, all `console.log(...)` messages from the content scripts (if any are enabled for temporary debugging) will appear, prefixed (e.g., `[CS Main]`, `GA4 Optimizer (Sticky Header):`).

### Understanding Debug Log Output
*   `[CS Main]`: Logs from `content_main.js`.
*   `GA4 Optimizer (Feature Name):`: Logs from specific feature scripts (e.g., `feature_sticky_header.js`).
*   To enable more verbose logging within a specific feature script temporarily during development, you can manually set `window.ga4Optimizer.debugModeEnabled = true;` at the top of that script or use conditional `console.log`. Remember to remove these before committing.

---

## 2. Project Structure
*   `manifest.json`: Core extension configuration, permissions.
*   `popup.html`/`popup.js`: UI and logic for the extension's popup.
*   `content_main.js`: Main content script injected into GA4 pages. Orchestrates all features.
*   `feature_*.js`: Individual modules for each specific feature.
*   `content_styles.css`: Styles injected by content scripts.
*   `documentation.html`/`documentation.js`: User-facing documentation page.
*   `onboarding.html`: Page shown on first install.
*   `icons/`: Extension icons.
*   `mp4/`: Video assets for documentation/onboarding.

---

## 3. Feature Development
*   Each new feature should ideally be in its own `feature_*.js` file.
*   Register the feature in `content_main.js` (in `window.ga4Optimizer.featureStates` and potentially `window.ga4Optimizer.featureModules`).
*   Implement `runCalculation()` and `remove()` methods in the feature script for activation/deactivation.
*   Use conditional `console.log()` for debugging if needed.
*   Add UI toggles in `popup.html` and corresponding logic in `popup.js`.
*   Update `manifest.json` if new permissions or resources are needed.
*   Document the feature in `documentation.html`.

---

## 4. Known Issues & Quirks
*   **GA4 DOM Volatility:** The Google Analytics 4 interface DOM is subject to change without notice. This is the primary cause of feature breakage. When a feature stops working, the first step is usually to inspect the relevant DOM elements in GA4 and update the selectors in the corresponding feature script.
*   **Sticky Header & Comparisons:** The "Sticky Report Header" feature has known incompatibilities with the GA4 "Comparisons" feature in Standard Reports due to complex table structure changes. (See `feature_sticky_header.js` and documentation).
*   **CSP on GA4 Pages:** Strict Content Security Policy on `analytics.google.com` prevents inline script injection.

---

## 5. Build & Deployment (if applicable)
*(Add notes here if you have a build process, e.g., for minification, zipping for CWS, etc.)*
*   Example: "Remember to increment the version in `manifest.json` before creating a release zip."

---

## 6. Chrome Web Store Notes
*   **Permissions Justification:**
    *   `storage`: To save user preferences for feature toggles.
    *   `activeTab`: To reload the active tab (primarily for applying changes after toggling features) and to ensure messages are sent to the active GA4 tab.
    *   `clipboardWrite`: For the "Click to Copy Cell" feature.
    *   `host_permissions`:
        *   `https://analytics.google.com/analytics/web/*`: Core functionality of the extension operates on GA4 pages.
*   **Video Assets:** All `.mp4` files are included for the documentation and onboarding pages. They are locally hosted within the extension.

---
*Last Updated: [Current Date]*