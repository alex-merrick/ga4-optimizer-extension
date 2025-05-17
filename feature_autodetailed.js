/**
 * feature_autodetailed.js - Logic for Auto-Detailed Results feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 4.17 - Added robust error handling and clickInProgress reset for all paths.
 *                 - Ensured findAndClickDetailedOptionWithRetry exits cleanly on panel disappearance.
 */
(function() { // Start of IIFE
    // console.log("GA4 Optimizer: Auto-Detailed Feature script loaded (v4.17).");

    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.autoDetailed = {};

    // --- Debug Logging Helper ---
    const logAutoDetailedDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Auto-Detailed):", ...args); };
    const warnAutoDetailedDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Auto-Detailed):", ...args); };
    const errorAutoDetailed = (...args) => { console.error("GA4 Optimizer (Auto-Detailed):", ...args); };

    // --- Configuration (remains the same as v4.16) ---
    window.ga4Optimizer.autoDetailed.SAMPLING_STATUS_BUTTON_SELECTOR = 'ga-dialog-badge button.badge';
    const DIALOG_LAYOUT_SELECTOR = 'xap-dialog-layout.dialog-badge';
    const DIALOG_ITEM_TITLE_SELECTOR = '.dialog-badge-item-title';
    const DIALOG_ITEM_CONTENT_SELECTOR = '.dialog-badge-item-content div';
    const DIALOG_UNSAMPLED_TEXT_CONTENT = 'This report is based on 100% of available data.';
    const DIALOG_CONDENSED_TITLE = 'Some data condensed';
    const DIALOG_CONDENSED_TEXT_SNIPPET = 'condenses some of your data';
    const SAMPLING_SELECT_TRIGGER_SELECTOR = 'ga-sampling-control mat-select';
    const OPTION_PANEL_SELECTOR = 'div.cdk-overlay-pane .mat-mdc-select-panel';
    const OPTION_SELECTOR = 'mat-option';
    const DETAILED_OPTION_TEXT = 'More detailed results';
    const FULL_DATA_TEXT_ARIA = 'uses 100% of available data';
    const INSUFFICIENT_DATA_TEXT_ARIA_KEYWORD = 'insufficient data';
    const BACKDROP_SELECTOR = 'div.cdk-overlay-backdrop.cdk-overlay-backdrop-showing';
    const FALLBACK_BACKDROP_SELECTOR = 'div.cdk-overlay-backdrop';
    const MAX_RETRIES_DETAILED_OPTION = 8; // Reduced for faster failure detection if stuck
    const RETRY_INTERVAL_DETAILED_OPTION = 350; // Slightly reduced
    const DELAY_AFTER_BUTTON_CLICK = 750; // Slightly reduced
    const DELAY_AFTER_TRIGGER_CLICK = 600; // Slightly reduced
    const DELAY_AFTER_OPTION_CLICK = 450; // Slightly reduced
    const DELAY_AFTER_CLOSE_CLICK = 250; // Slightly reduced
    const DELAY_FOR_CONFIRMATION_CHECK = 2000; // Slightly reduced

    const AUTO_DETAILED_NOTIFICATION_ID_BASE = 'ga4-optimizer-auto-detailed-notify-';
    let autoDetailedNotificationTimeoutIds = {};

    let clickInProgress = false;
    let initializedLogShown = false;
    let confirmedInternallyUnsampledForThisView = false;

    // --- Helper Functions (showAutoDetailedNotification, checkAndShowConfirmationPostActivation, checkAndClickStatusButtonIfNeeded, clickSelectTriggerToOpenPanel, clickDetailedOption, clickOffDialog, checkDialogRequiresSamplingChange) ---
    // These functions remain largely the same, but with try/catch where DOM interaction occurs if not already present.
    function showAutoDetailedNotification(message, idSuffix = 'general', duration = 3500) {
        try {
            logAutoDetailedDebug("Attempting to show auto-detailed notification:", message, "ID Suffix:", idSuffix);
            const notificationId = AUTO_DETAILED_NOTIFICATION_ID_BASE + idSuffix;
            let notificationElement = document.getElementById(notificationId);

            if (autoDetailedNotificationTimeoutIds[notificationId]) {
                clearTimeout(autoDetailedNotificationTimeoutIds[notificationId]);
                delete autoDetailedNotificationTimeoutIds[notificationId];
            }

            if (notificationElement) {
                logAutoDetailedDebug("Notification element exists, updating content for ID:", notificationId);
                notificationElement.textContent = message;
                notificationElement.style.opacity = '0';
                notificationElement.style.transform = 'translateX(-50%) translateY(100px)';
            } else {
                logAutoDetailedDebug("Creating new notification element with ID:", notificationId);
                notificationElement = document.createElement('div');
                notificationElement.id = notificationId;
                notificationElement.style.position = 'fixed';
                notificationElement.style.bottom = '20px';
                notificationElement.style.left = '50%';
                notificationElement.style.transform = 'translateX(-50%) translateY(100px)';
                notificationElement.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                notificationElement.style.color = 'white';
                notificationElement.style.padding = '10px 20px';
                notificationElement.style.borderRadius = '5px';
                notificationElement.style.zIndex = '20000';
                notificationElement.style.fontSize = '14px';
                notificationElement.style.fontFamily = 'Roboto, sans-serif';
                notificationElement.style.opacity = '0';
                notificationElement.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
                notificationElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                notificationElement.style.textAlign = 'center';
                notificationElement.style.pointerEvents = 'none';
                notificationElement.textContent = message;
                document.body.appendChild(notificationElement);
            }

            requestAnimationFrame(() => {
                if (document.body.contains(notificationElement)) {
                    notificationElement.style.opacity = '1';
                    notificationElement.style.transform = 'translateX(-50%) translateY(0)';
                }
            });

            autoDetailedNotificationTimeoutIds[notificationId] = setTimeout(() => {
                if (document.body.contains(notificationElement)) {
                    notificationElement.style.opacity = '0';
                    notificationElement.style.transform = 'translateX(-50%) translateY(100px)';
                    setTimeout(() => {
                        if (notificationElement && notificationElement.parentElement) {
                            notificationElement.parentElement.removeChild(notificationElement);
                        }
                        delete autoDetailedNotificationTimeoutIds[notificationId];
                    }, 300);
                }
            }, duration);
        } catch (e) {
            errorAutoDetailed("Error in showAutoDetailedNotification:", e);
        }
    }

    function checkAndShowConfirmationPostActivation() {
        logAutoDetailedDebug(`Waiting ${DELAY_FOR_CONFIRMATION_CHECK}ms to check for 100% status and show confirmation.`);
        setTimeout(() => {
            try {
                const statusButton = document.querySelector(window.ga4Optimizer.autoDetailed.SAMPLING_STATUS_BUTTON_SELECTOR);
                if (statusButton && document.body.contains(statusButton)) {
                    const label = statusButton.getAttribute('aria-label')?.toLowerCase() || '';
                    logAutoDetailedDebug(`After delay, status button label: "${label}"`);
                    if (label.includes(FULL_DATA_TEXT_ARIA)) {
                        logAutoDetailedDebug("Confirmed 100% data. Showing 'Detailed results activated' message.");
                        showAutoDetailedNotification("Detailed results activated", "activated");
                    } else {
                        logAutoDetailedDebug("After delay, status button does NOT indicate 100% data. No confirmation message.");
                    }
                } else {
                    warnAutoDetailedDebug("After delay, status button not found or no longer in DOM. Cannot confirm 100% data for message.");
                }
            } catch (e) {
                errorAutoDetailed("Error in checkAndShowConfirmationPostActivation:", e);
            }
        }, DELAY_FOR_CONFIRMATION_CHECK);
    }
    
    function checkAndClickStatusButtonIfNeeded() {
      try {
        const selector = window.ga4Optimizer.autoDetailed.SAMPLING_STATUS_BUTTON_SELECTOR;
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null) {
          const label = button.getAttribute('aria-label')?.toLowerCase() || '';
          logAutoDetailedDebug(`Status button found and visible. Label: "${label}"`);
          if (label.includes(FULL_DATA_TEXT_ARIA)) {
              logAutoDetailedDebug('Button indicates 100% data. No click needed this time.');
              return false;
          } else {
              logAutoDetailedDebug('Button indicates non-100% data. Clicking button...');
              button.click();
              return true;
          }
        }
        logAutoDetailedDebug('Status button not found or not visible.');
        return false;
      } catch (e) {
        errorAutoDetailed("Error in checkAndClickStatusButtonIfNeeded:", e);
        return false;
      }
    }

    function clickSelectTriggerToOpenPanel() {
        try {
            if (document.querySelector(OPTION_PANEL_SELECTOR)) {
                logAutoDetailedDebug('Option panel already open.');
                return true;
            }
            const dialog = document.querySelector(DIALOG_LAYOUT_SELECTOR);
            if (!dialog) {
                warnAutoDetailedDebug("Dialog not found, cannot find select trigger inside it.");
                return false;
            }
            const selectTrigger = dialog.querySelector(SAMPLING_SELECT_TRIGGER_SELECTOR);
            if (selectTrigger && selectTrigger.offsetParent !== null) {
                logAutoDetailedDebug('Clicking select trigger inside dialog to open panel...');
                selectTrigger.click();
                return true;
            }
            warnAutoDetailedDebug(`Select trigger not found or not visible inside dialog (${SAMPLING_SELECT_TRIGGER_SELECTOR}). Cannot open panel.`);
            return false;
        } catch (e) {
            errorAutoDetailed("Error in clickSelectTriggerToOpenPanel:", e);
            return false;
        }
    }

    function clickDetailedOption() {
        try {
            const panel = document.querySelector(OPTION_PANEL_SELECTOR);
            if (!panel) {
                logAutoDetailedDebug('Option panel not found for clicking detailed option.');
                return false;
            }
            const options = panel.querySelectorAll(OPTION_SELECTOR);
            let detailedOptionElement = null;
            logAutoDetailedDebug(`Found ${options.length} options in panel. Searching for "${DETAILED_OPTION_TEXT}"...`);
            for (const optionElement of options) {
                const optionTextElement = optionElement.querySelector('.mat-option-text') || optionElement.querySelector('.mdc-list-item__primary-text') || optionElement;
                const textContent = optionTextElement?.textContent?.trim();
                if (textContent && textContent.includes(DETAILED_OPTION_TEXT)) {
                    detailedOptionElement = optionElement;
                    logAutoDetailedDebug('Found "More detailed results" option element:', detailedOptionElement);
                    break;
                }
            }
            if (detailedOptionElement && detailedOptionElement.offsetParent !== null) {
                logAutoDetailedDebug('Clicking "More detailed results" option...');
                // Simulating clicks robustly
                detailedOptionElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                detailedOptionElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                detailedOptionElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return true;
            } else if (detailedOptionElement) {
                warnAutoDetailedDebug('"More detailed results" option found but might not be visible/interactive.');
                return false;
            } else {
                logAutoDetailedDebug('"More detailed results" option not found in the panel.');
                return false;
            }
        } catch (e) {
            errorAutoDetailed("Error in clickDetailedOption:", e);
            return false;
        }
    }

    function clickOffDialog() {
        try {
            logAutoDetailedDebug("Attempting to click off dialog...");
            let backdrop = document.querySelector(BACKDROP_SELECTOR);
            if (!backdrop) {
                warnAutoDetailedDebug(`Primary backdrop selector ("${BACKDROP_SELECTOR}") failed. Trying fallback ("${FALLBACK_BACKDROP_SELECTOR}")...`);
                backdrop = document.querySelector(FALLBACK_BACKDROP_SELECTOR);
            }
            if (backdrop) {
                logAutoDetailedDebug('Backdrop element found, attempting click...');
                backdrop.dispatchEvent(new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true }));
                backdrop.dispatchEvent(new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true }));
                backdrop.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                logAutoDetailedDebug('Dispatched click events to backdrop.');
            } else {
                warnAutoDetailedDebug(`Could not find backdrop. Attempting less reliable method.`);
                // This part is inherently less reliable, might need removal if it causes issues.
                const potentialElementToBlur = document.querySelector(SAMPLING_SELECT_TRIGGER_SELECTOR) || document.querySelector(DIALOG_LAYOUT_SELECTOR);
                if (potentialElementToBlur && typeof potentialElementToBlur.blur === 'function') {
                    potentialElementToBlur.blur();
                    logAutoDetailedDebug("Attempted blur on a dialog-related element.");
                } else {
                    warnAutoDetailedDebug('No suitable element found to blur for closing dialog.');
                }
            }
        } catch (e) {
            errorAutoDetailed("Error in clickOffDialog:", e);
        }
    }

    function checkDialogRequiresSamplingChange() {
        try {
            const dialog = document.querySelector(DIALOG_LAYOUT_SELECTOR);
            if (!dialog) {
                warnAutoDetailedDebug("Dialog not found to check content.");
                return null;
            }
            const titles = dialog.querySelectorAll(DIALOG_ITEM_TITLE_SELECTOR);
            const contents = dialog.querySelectorAll(DIALOG_ITEM_CONTENT_SELECTOR);
            let requiresChangeByUs = true;

            for (const titleEl of titles) {
                const titleText = titleEl.textContent?.trim();
                if (titleText === DIALOG_CONDENSED_TITLE) {
                    requiresChangeByUs = false; break;
                }
            }
            if (requiresChangeByUs) {
                for (const contentEl of contents) {
                    const contentText = contentEl.textContent?.trim();
                    if (contentText === DIALOG_UNSAMPLED_TEXT_CONTENT || contentText.includes(DIALOG_CONDENSED_TEXT_SNIPPET)) {
                        requiresChangeByUs = false; break;
                    }
                }
            }
            return requiresChangeByUs;
        } catch (e) {
            errorAutoDetailed("Error in checkDialogRequiresSamplingChange:", e);
            return null; // Indicate error
        }
    }
    // --- END HELPER FUNCTIONS ---


    function findAndClickDetailedOptionWithRetry(retriesLeft = MAX_RETRIES_DETAILED_OPTION, interval = RETRY_INTERVAL_DETAILED_OPTION) {
        logAutoDetailedDebug(`Attempting to find and click detailed option. Retries left: ${retriesLeft}`);
        try {
            const panelExists = document.querySelector(OPTION_PANEL_SELECTOR);
            if (!panelExists) {
                warnAutoDetailedDebug("Option panel disappeared during retry sequence. Aborting and resetting clickInProgress.");
                clickInProgress = false; // **Ensure reset**
                return;
            }

            if (clickDetailedOption()) {
                logAutoDetailedDebug("Successfully clicked detailed option. Expecting view to change.");
                confirmedInternallyUnsampledForThisView = false;
                setTimeout(() => {
                    clickOffDialog();
                    setTimeout(() => {
                        clickInProgress = false; // **Ensure reset**
                        logAutoDetailedDebug("Auto-Detailed sequence (change initiated) complete.");
                        checkAndShowConfirmationPostActivation();
                    }, DELAY_AFTER_CLOSE_CLICK);
                }, DELAY_AFTER_OPTION_CLICK);
                return;
            }

            if (retriesLeft > 0) {
                logAutoDetailedDebug(`Detailed option not clicked yet. Retrying in ${interval}ms...`);
                setTimeout(() => findAndClickDetailedOptionWithRetry(retriesLeft - 1, interval), interval);
            } else {
                warnAutoDetailedDebug(`Failed to find/click detailed option after multiple retries. Resetting clickInProgress.`);
                clickOffDialog();
                clickInProgress = false; // **Ensure reset**
            }
        } catch (e) {
            errorAutoDetailed("Error in findAndClickDetailedOptionWithRetry:", e);
            clickInProgress = false; // **Ensure reset on error**
            clickOffDialog(); // Try to clean up UI
        }
    }

    /** Main sequence function exposed to content_main.js. */
    window.ga4Optimizer.autoDetailed.triggerSequence = function() {
        if (!initializedLogShown) {
            console.log("GA4 Optimizer: Auto Detailed Results feature ACTIVATED (attempting to switch).");
            initializedLogShown = true;
        }

        if (clickInProgress) {
            logAutoDetailedDebug("triggerSequence: Click sequence already in progress. Skipping.");
            return;
        }

        let statusButton;
        try {
            statusButton = document.querySelector(window.ga4Optimizer.autoDetailed.SAMPLING_STATUS_BUTTON_SELECTOR);
        } catch (e) {
            errorAutoDetailed("Error querying for status button:", e);
            // If querySelector itself errors (highly unlikely for valid selector), reset and bail
            initializedLogShown = false;
            confirmedInternallyUnsampledForThisView = false;
            clickInProgress = false; // Ensure reset
            return;
        }


        if (!statusButton || statusButton.offsetParent === null) {
            logAutoDetailedDebug('triggerSequence: Status button not found or not visible. Cannot determine sampling state.');
            initializedLogShown = false;
            confirmedInternallyUnsampledForThisView = false;
            // clickInProgress should be false here already, but ensure
            clickInProgress = false;
            return;
        }

        const label = statusButton.getAttribute('aria-label')?.toLowerCase() || '';
        logAutoDetailedDebug(`triggerSequence: Status button label: "${label}", Current confirmedInternallyUnsampled: ${confirmedInternallyUnsampledForThisView}`);

        let shouldProceed = false;
        let reasonToProceed = "";

        if (label.includes(FULL_DATA_TEXT_ARIA)) {
            logAutoDetailedDebug('triggerSequence: Button indicates 100% data. Resetting confirmedInternallyUnsampled and skipping.');
            initializedLogShown = false;
            confirmedInternallyUnsampledForThisView = false;
        } else if (label.includes(INSUFFICIENT_DATA_TEXT_ARIA_KEYWORD)) {
            logAutoDetailedDebug('triggerSequence: Button indicates "insufficient data". Proceeding to try "More detailed results".');
            confirmedInternallyUnsampledForThisView = false;
            shouldProceed = true;
            reasonToProceed = "insufficient data";
        } else {
            if (confirmedInternallyUnsampledForThisView) {
                logAutoDetailedDebug('triggerSequence: Button indicates generic sampling, but already confirmed internally unsampled/condensed for THIS VIEW. Skipping.');
            } else {
                logAutoDetailedDebug('triggerSequence: Button indicates generic sampling, and not yet confirmed internally. Proceeding.');
                shouldProceed = true;
                reasonToProceed = "generic sampling, unconfirmed";
            }
        }

        if (!shouldProceed) {
            logAutoDetailedDebug('triggerSequence: Conditions not met to proceed. Bailing.');
            clickInProgress = false; // Ensure reset if bailing here
            return;
        }

        clickInProgress = true; // Set flag: we are starting the async sequence
        logAutoDetailedDebug(`Starting Auto-Detailed sequence. Reason: ${reasonToProceed}. Clicking status button...`);
        
        try {
            if (statusButton && statusButton.offsetParent !== null) {
                statusButton.click();
            } else {
                throw new Error("Status button became invalid before click.");
            }
        } catch (e) {
            errorAutoDetailed("Error clicking status button:", e);
            clickInProgress = false; // Reset on error
            confirmedInternallyUnsampledForThisView = false;
            return;
        }
        

        setTimeout(() => {
            try {
                logAutoDetailedDebug("Checking dialog content...");
                const requiresChangeByUs = checkDialogRequiresSamplingChange();

                if (requiresChangeByUs === false) { // Dialog confirmed 100% or condensed
                    logAutoDetailedDebug("Dialog confirmed no sampling change needed by us.");
                    if (reasonToProceed === "generic sampling, unconfirmed") {
                        confirmedInternallyUnsampledForThisView = true;
                        logAutoDetailedDebug("Marked confirmedInternallyUnsampledForThisView = true for this generic sampled view.");
                    }
                    showAutoDetailedNotification("Already showing 100% of available data", "already_100");
                    clickOffDialog();
                    setTimeout(() => {
                        clickInProgress = false; // Reset
                        logAutoDetailedDebug("Auto-Detailed sequence (no change needed by us) complete.");
                    }, DELAY_AFTER_CLOSE_CLICK);

                } else if (requiresChangeByUs === true) { // Dialog indicates we should try to change
                    logAutoDetailedDebug("Dialog indicates we MIGHT need to change sampling. Attempting to open select panel...");
                    if (clickSelectTriggerToOpenPanel()) {
                        setTimeout(() => {
                            findAndClickDetailedOptionWithRetry(); // This will handle clickInProgress reset
                        }, DELAY_AFTER_TRIGGER_CLICK);
                    } else {
                        warnAutoDetailedDebug("Failed to open select panel via trigger click. Aborting sequence.");
                        clickOffDialog();
                        clickInProgress = false; // Reset
                        confirmedInternallyUnsampledForThisView = false;
                    }
                } else { // requiresChangeByUs === null (error in checkDialogRequiresSamplingChange)
                    warnAutoDetailedDebug("Dialog check failed. Aborting sequence.");
                    clickOffDialog();
                    clickInProgress = false; // Reset
                    confirmedInternallyUnsampledForThisView = false;
                }
            } catch (e) {
                errorAutoDetailed("Error in main sequence timeout:", e);
                clickInProgress = false; // Reset on error
                clickOffDialog(); // Attempt to cleanup UI
                confirmedInternallyUnsampledForThisView = false;
            }
        }, DELAY_AFTER_BUTTON_CLICK);
    };

})(); // End of IIFE
;