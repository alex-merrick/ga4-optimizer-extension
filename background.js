/**
 * background.js - Service worker for GA4 Optimizer Extension
 * Handles on-install events.
 * VERSION: 6.0.1 - Removed console logs for production.
 */

// --- Event Listeners ---

// 1. On Install: Open onboarding page
chrome.runtime.onInstalled.addListener(async (details) => {
  // console.log(`GA4 Optimizer BG: onInstalled event fired. Reason: ${details.reason}`); // Removed
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'onboarding.html'
    });
    // console.log('GA4 Optimizer BG: Onboarding page opened on install.'); // Removed
  }
  // No other actions needed on update or browser startup for this simplified version
});