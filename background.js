/**
 * background.js - Service worker for GA4 Optimizer Extension
 * Handles on-install events and manages GA4 Debugging via Declarative Net Request.
 * VERSION: 5.0.1 - Fixed typo in storage change listener (active_tab -> activeTab).
 */

const GA4_DEBUG_RULESET_ID = "ga4-debug-ruleset"; // Matches ID in manifest.json

// --- Helper Functions ---

// Function to enable or disable the Declarative Net Request ruleset
async function updateDebugRuleset(enable) {
  console.log(`GA4 Optimizer BG: Attempting to ${enable ? 'ENABLE' : 'DISABLE'} ruleset: ${GA4_DEBUG_RULESET_ID}`);
  try {
    if (enable) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [GA4_DEBUG_RULESET_ID]
      });
      console.log(`GA4 Optimizer BG: Ruleset ${GA4_DEBUG_RULESET_ID} ENABLED.`);
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [GA4_DEBUG_RULESET_ID]
      });
      console.log(`GA4 Optimizer BG: Ruleset ${GA4_DEBUG_RULESET_ID} DISABLED.`);
    }
  } catch (error) {
      console.error(`GA4 Optimizer BG: Error updating ruleset enable/disable state:`, error);
  }
}

// Function to get the current state from storage
async function getDebuggingState() {
  try {
    const result = await chrome.storage.sync.get('ga4DebuggingEnabled');
    const state = result.ga4DebuggingEnabled === undefined ? false : !!result.ga4DebuggingEnabled;
    console.log(`GA4 Optimizer BG: Retrieved ga4DebuggingEnabled state from storage: ${state}`);
    return state;
  } catch (error) {
    console.error('GA4 Optimizer BG: Error getting debugging state from storage:', error);
    return false; // Default to false on error
  }
}

// Function to reload the specified tab
function reloadTab(tabId) {
    console.log(`GA4 Optimizer BG: Reloading tab ${tabId}...`);
    chrome.tabs.reload(tabId, { bypassCache: true }, () => { // Bypass cache for good measure
        if (chrome.runtime.lastError) {
            // Filter out common benign errors like "tab not found" if it was closed quickly
            if (!chrome.runtime.lastError.message.includes("No tab with id") &&
                !chrome.runtime.lastError.message.includes("Cannot access contents of the page")) {
                 console.warn(`GA4 Optimizer BG: Error reloading tab ${tabId}: ${chrome.runtime.lastError.message}`);
            }
        } else {
            console.log(`GA4 Optimizer BG: Tab ${tabId} reloaded.`);
        }
    });
}

// --- Event Listeners ---

// 1. On Install / Update: Set initial ruleset state based on stored value
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`GA4 Optimizer BG: onInstalled event fired. Reason: ${details.reason}`);
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'onboarding.html'
    });
    console.log('GA4 Optimizer BG: Onboarding page opened on install.');
    // Ensure ruleset is disabled on first install (matches default storage state)
    await updateDebugRuleset(false);
  } else {
    // On update or reload, ensure ruleset matches stored state
    console.log('GA4 Optimizer BG: Extension updated/reloaded. Applying stored debug state to ruleset.');
    const currentState = await getDebuggingState();
    await updateDebugRuleset(currentState);
  }
});

// 2. On Startup: Ensure ruleset matches stored state
chrome.runtime.onStartup.addListener(async () => {
    console.log('GA4 Optimizer BG: Browser startup detected. Applying stored debug state to ruleset.');
    const currentState = await getDebuggingState();
    await updateDebugRuleset(currentState);
});


// 3. On Storage Change: React to toggle changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync' && changes.ga4DebuggingEnabled) {
    const newState = !!changes.ga4DebuggingEnabled.newValue;
    const oldStateExists = changes.ga4DebuggingEnabled.oldValue !== undefined;
    const oldState = oldStateExists ? !!changes.ga4DebuggingEnabled.oldValue : !newState;

    console.log(`GA4 Optimizer BG: Detected change event for ga4DebuggingEnabled storage. New value: ${newState}, Old value: ${oldStateExists ? oldState : '[undefined]'}`);

    if (!oldStateExists || newState !== oldState) {
       console.log(`GA4 Optimizer BG: State changed or was previously undefined. Updating ruleset state to: ${newState}`);
       await updateDebugRuleset(newState); // Enable/disable ruleset

       // Reload the currently active tab to apply the change immediately
       try {
           const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
           // Check if activeTab exists and has an ID and a valid URL before reloading
           if (activeTab && activeTab.id && activeTab.url && (activeTab.url.startsWith('http:') || activeTab.url.startsWith('https://'))) { // *** FIXED TYPO HERE ***
               reloadTab(activeTab.id);
           } else {
               console.log("GA4 Optimizer BG: No active http/https tab found to reload after state change.");
           }
       } catch (error) {
           console.error("GA4 Optimizer BG: Error querying or reloading active tab:", error);
       }

    } else {
        console.log(`GA4 Optimizer BG: State did not change (${newState}). No ruleset update needed from storage change listener.`);
    }
  }
});


console.log("GA4 Optimizer BG: Service worker started (v5.0.1 - DeclarativeNetRequest, Fixed typo).");

// Initial check/update on load
getDebuggingState().then(async (currentState) => {
   console.log('GA4 Optimizer BG: Service worker active check. Initial debug state from storage:', currentState);
   console.log('GA4 Optimizer BG: Applying initial ruleset state on load.');
   await updateDebugRuleset(currentState); // Ensure ruleset matches state on load
   console.log('GA4 Optimizer BG: Initial ruleset state application complete.');
});
