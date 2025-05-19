/**
 * popup.js - Logic for the GA4 Optimizer Extension popup.
 * VERSION: 3.3.0 - Removed GA4 Debugging feature.
 */

document.addEventListener('DOMContentLoaded', () => {
    const featuresData = [];
    let topNotificationTimeoutId = null;
    const popupHeaderElement = document.getElementById('popupHeader');


    function showTopNotification(message, isDebugMessage = false, duration = 4000) {
        const notificationBanner = document.getElementById('topNotificationBanner');
        if (!notificationBanner || !popupHeaderElement) return;

        if (topNotificationTimeoutId) {
            clearTimeout(topNotificationTimeoutId);
        }

        notificationBanner.textContent = message;
        if (isDebugMessage) { // This class might be redundant now but kept for structure
            notificationBanner.classList.add('debug');
        } else {
            notificationBanner.classList.remove('debug');
        }
        
        notificationBanner.classList.add('visible');
        popupHeaderElement.classList.add('hidden-by-banner');


        topNotificationTimeoutId = setTimeout(() => {
            notificationBanner.classList.remove('visible');
            popupHeaderElement.classList.remove('hidden-by-banner');
            topNotificationTimeoutId = null;
            
            setTimeout(() => { 
                if (notificationBanner && !notificationBanner.classList.contains('visible')) {
                     notificationBanner.classList.remove('debug');
                }
            }, 300); 
        }, duration);
    }


    function registerFeature(storageKey, toggleElementId, containerElementId, featureName, defaultState) {
        const toggleElement = document.getElementById(toggleElementId);
        const containerElement = document.getElementById(containerElementId);
        if (toggleElement && containerElement) {
            const defaultStateAttr = toggleElement.getAttribute('data-default-state');
            const effectiveDefaultState = defaultStateAttr !== null ? (defaultStateAttr === 'true') : defaultState;
            featuresData.push({
                element: toggleElement,
                storageKey: storageKey,
                defaultState: effectiveDefaultState,
                containerElement: containerElement,
                featureName: featureName
            });
        } else {
            console.error(`Popup Error: Missing elements for ${featureName} (toggle: ${toggleElementId}, container: ${containerElementId})`);
        }
    }

    registerFeature('percentagesEnabled', 'enablePercentagesToggle', 'togglePercentagesControl', 'Exploration Row %', true);
    registerFeature('autoDetailedEnabled', 'enableAutoDetailedToggle', 'toggleAutoDetailedControl', 'Unsample Report (Beta)', false);
    registerFeature('conversionRateEnabled', 'enableConversionRateToggle', 'toggleConversionRateControl', 'Hover Conversion Rate', true);
    registerFeature('copyCellEnabled', 'enableCopyCellToggle', 'toggleCopyCellControl', 'Click to Copy Cell', true);
    registerFeature('stickyHeaderEnabled', 'enableStickyHeaderToggle', 'toggleStickyHeaderControl', 'Sticky Report Header', true);
    registerFeature('highlightSamplingEnabled', 'enableHighlightSamplingToggle', 'toggleHighlightSamplingControl', 'Highlight Sampling', true);
    registerFeature('segmentComparisonEnabled', 'enableSegmentComparisonToggle', 'toggleSegmentComparisonControl', 'Segment Variation Comparison', true);
    registerFeature('panelToggleEnabled', 'enablePanelToggleToggle', 'togglePanelToggleControl', 'Collapsible Panels', true);
    registerFeature('stickyCalculatorEnabled', 'enableStickyCalculatorToggle', 'toggleStickyCalculatorControl', 'Sticky CR Calculator', true);

    const initPromises = featuresData.map(feature => initializeToggle(feature));

    Promise.all(initPromises)
        .then(() => {
            updateMasterToggleStateVisuals();
        })
        .catch(error => {
            console.error("Popup Error: Failed to initialize one or more toggles:", error);
            updateMasterToggleStateVisuals();
        });

    const masterToggleElement = document.getElementById('masterToggle');
    if (masterToggleElement) {
        initializeMasterToggle(masterToggleElement);
    } else {
        console.error("Popup Error: Master Toggle element not found.");
    }

    const reloadButton = document.getElementById('reloadButton');
    const INACTIVE_CONTEXT_CLASS = 'reload-button-inactive-context';
    const ORIGINAL_RELOAD_BUTTON_TEXT = "Reload Active GA4 Tab";

    function setReloadButtonContext() {
        if (!reloadButton) return;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id && tabs[0].url) {
                if (tabs[0].url.includes("analytics.google.com")) {
                    reloadButton.classList.remove(INACTIVE_CONTEXT_CLASS);
                } else {
                    reloadButton.classList.add(INACTIVE_CONTEXT_CLASS);
                }
            } else {
                reloadButton.classList.add(INACTIVE_CONTEXT_CLASS);
            }
            if (!reloadButton.disabled) {
                reloadButton.textContent = ORIGINAL_RELOAD_BUTTON_TEXT;
            }
        });
    }

    if (reloadButton) {
        setReloadButtonContext();
        reloadButton.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                let shouldClosePopup = true;
                if (tabs && tabs.length > 0 && tabs[0].id) {
                    if (tabs[0].url && tabs[0].url.includes("analytics.google.com")) {
                        chrome.tabs.reload(tabs[0].id);
                    } else {
                        reloadButton.textContent = "You're Not on GA4 Tab";
                        reloadButton.disabled = true;
                        shouldClosePopup = false;
                        setTimeout(() => {
                            reloadButton.textContent = ORIGINAL_RELOAD_BUTTON_TEXT;
                            reloadButton.disabled = false;
                            setReloadButtonContext();
                         }, 2000);
                    }
                } else {
                    reloadButton.textContent = "Error: No Active Tab";
                    reloadButton.disabled = true;
                    shouldClosePopup = false;
                    setTimeout(() => {
                        reloadButton.textContent = ORIGINAL_RELOAD_BUTTON_TEXT;
                        reloadButton.disabled = false;
                        setReloadButtonContext();
                    }, 2000);
                }
                if (shouldClosePopup) { window.close(); }
            });
        });
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            let masterToggleNeedsUpdate = false;
            featuresData.forEach(feature => {
                if (changes[feature.storageKey] && feature.element) {
                    const newValue = !!changes[feature.storageKey].newValue;
                    if (feature.element.checked !== newValue) {
                        feature.element.checked = newValue;
                        masterToggleNeedsUpdate = true;
                    }
                }
            });
            if (masterToggleNeedsUpdate) {
                updateMasterToggleStateVisuals();
            }
        }
    });

    function initializeToggle(feature) {
        return new Promise((resolve) => {
            const { storageKey, element: toggleElement, containerElement, featureName, defaultState } = feature;

            if (!chrome.storage || !chrome.storage.sync) {
                console.error(`Popup Error: Storage API not available for ${featureName}.`);
                if (containerElement) containerElement.innerHTML = `<span style='color: red; font-size: 11px;'>Error: Storage unavailable.</span>`;
                if (containerElement) containerElement.style.visibility = 'visible';
                if (toggleElement) toggleElement.checked = defaultState;
                resolve();
                return;
            }

            chrome.storage.sync.get([storageKey], (result) => {
                if (chrome.runtime.lastError) {
                    console.error(`Popup Error: Failed to get state for ${storageKey}: ${chrome.runtime.lastError.message}`);
                    if (toggleElement) toggleElement.checked = defaultState;
                } else {
                    const isEnabled = result[storageKey] === undefined ? defaultState : !!result[storageKey];
                    if (toggleElement) toggleElement.checked = isEnabled;
                }
                if (containerElement) containerElement.style.visibility = 'visible';
                resolve();
            });

            if (toggleElement) {
                toggleElement.addEventListener('change', () => {
                    const newState = toggleElement.checked;
                    chrome.storage.sync.set({ [storageKey]: newState }, () => {
                        if (chrome.runtime.lastError) {
                            console.error(`Popup Error: Failed to save state for ${storageKey}: ${chrome.runtime.lastError.message}`);
                            toggleElement.checked = !newState;
                        } else {
                            sendToggleStateToContentScript(storageKey, newState);
                            updateMasterToggleStateVisuals();
                            showTopNotification("Reload GA4 page for changes to take full effect.", false, 4000);
                        }
                    });
                });
            }
        });
    }

    function sendToggleStateToContentScript(storageKey, state) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id) {
                const tabId = tabs[0].id;
                // Always send if it's an analytics.google.com tab
                if (tabs[0].url && tabs[0].url.includes("analytics.google.com")) {
                    chrome.tabs.sendMessage(tabId,
                        { action: "updateFeatureState", featureKey: storageKey, enabled: state },
                        (response) => {
                            if (chrome.runtime.lastError &&
                                !chrome.runtime.lastError.message.includes("Receiving end does not exist") &&
                                !chrome.runtime.lastError.message.includes("Could not establish connection")) {
                                console.warn(`Popup: SendMessage error for ${storageKey} to tab ${tabId}: ${chrome.runtime.lastError.message}`);
                            }
                        }
                    );
                }
            }
        });
    }

    function sendMultipleToggleStatesToContentScript(changedStates) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id) {
                const tabId = tabs[0].id;
                if (tabs[0].url && tabs[0].url.includes("analytics.google.com")) {
                    chrome.tabs.sendMessage(tabId,
                        { action: "updateMultipleFeatureStates", changedStates: changedStates },
                        (response) => {
                            if (chrome.runtime.lastError &&
                                !chrome.runtime.lastError.message.includes("Receiving end does not exist") &&
                                !chrome.runtime.lastError.message.includes("Could not establish connection")) {
                                console.warn(`Popup: SendMessage error for multiple states to tab ${tabId}: ${chrome.runtime.lastError.message}`);
                            }
                        }
                    );
                }
            }
        });
    }

    function sendMasterToggleNotificationToContentScript(notificationType) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id) {
                const tabId = tabs[0].id;
                if (tabs[0].url && tabs[0].url.includes("analytics.google.com")) {
                    chrome.tabs.sendMessage(tabId,
                        { action: "showMasterToggleNotification", notificationType: notificationType },
                        (response) => {
                            if (chrome.runtime.lastError &&
                                !chrome.runtime.lastError.message.includes("Receiving end does not exist") &&
                                !chrome.runtime.lastError.message.includes("Could not establish connection")) {
                                console.warn(`Popup: SendMessage error for master toggle notification to tab ${tabId}: ${chrome.runtime.lastError.message}`);
                            }
                        }
                    );
                }
            }
        });
    }

    function initializeMasterToggle(masterToggleElement) {
        masterToggleElement.addEventListener('click', () => {
            const wasAnyFeatureOn = featuresData.some(feature => feature.element && feature.element.checked);
            const newStatesToSet = {};
            let changed = false;

            if (wasAnyFeatureOn) {
                featuresData.forEach(feature => {
                    if (feature.element && feature.element.checked) {
                        newStatesToSet[feature.storageKey] = false;
                        changed = true;
                    }
                });
            } else {
                 featuresData.forEach(feature => {
                    if (feature.defaultState) {
                        if (!feature.element || !feature.element.checked) {
                            newStatesToSet[feature.storageKey] = true;
                            changed = true;
                        }
                    } else { 
                        if (feature.element && feature.element.checked) {
                             newStatesToSet[feature.storageKey] = false; 
                             changed = true;
                        }
                    }
                 });
            }

            if (changed) {
                chrome.storage.sync.set(newStatesToSet, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Popup Error: Master toggle failed to save states to storage.", chrome.runtime.lastError.message);
                    } else {
                        const contentScriptChanges = {};
                        Object.keys(newStatesToSet).forEach(key => {
                            contentScriptChanges[key] = newStatesToSet[key];
                            const feature = featuresData.find(f => f.storageKey === key);
                            if (feature && feature.element && feature.element.checked !== newStatesToSet[key]) {
                                feature.element.checked = newStatesToSet[key];
                            }
                        });

                        if (Object.keys(contentScriptChanges).length > 0) {
                            sendMultipleToggleStatesToContentScript(contentScriptChanges);
                        }
                        
                        updateMasterToggleStateVisuals();
                        const notificationType = wasAnyFeatureOn ? "allDisabled" : "recommendedEnabled";
                        sendMasterToggleNotificationToContentScript(notificationType);
                        showTopNotification("Reload GA4 page for changes to take full effect.", false, 4000);
                    }
                });
            }
        });
    }

    function updateMasterToggleStateVisuals() {
        const masterToggleElement = document.getElementById('masterToggle');
        if (!masterToggleElement || featuresData.length === 0) return;
        const allFeatureElementsPresent = featuresData.every(f => f.element);
        if (!allFeatureElementsPresent) { return; }
        const anyFeatureOn = featuresData.some(feature => feature.element && feature.element.checked);
        if (anyFeatureOn) {
            masterToggleElement.classList.remove('master-off');
            masterToggleElement.classList.add('master-on');
            masterToggleElement.title = "Disable All Enabled Features";
        } else {
            masterToggleElement.classList.remove('master-on');
            masterToggleElement.classList.add('master-off');
            masterToggleElement.title = "Enable Recommended Features";
        }
    }
});