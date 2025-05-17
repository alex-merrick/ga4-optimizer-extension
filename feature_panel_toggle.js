/**
 * feature_panel_toggle.js - Logic for Collapsible Panels in Explorations
 * Part of the GA4 Optimizer Extension
 * VERSION: 1.9.0 - Drastically reduced initial load delay for button appearance.
 *                 - Improved element readiness check before initial applyState.
 */
(function() { // Start of IIFE
    const FEATURE_STORAGE_KEY = 'panelToggleCollapsedState';
    const TOGGLE_BUTTON_ID = 'ga4o-panel-toggle-button';
    const PANEL_TOOLTIP_ID = 'ga4o-panel-toggle-tooltip';
    const MAIN_LAYOUT_CONTAINER_SELECTOR = 'ga-analysis-view';
    const VARIABLES_PANEL_SELECTOR = 'ga-data-panel';
    const SETTINGS_PANEL_SELECTOR = 'ga-settings-panel';
    const GA_PRIMARY_NAV_SELECTOR = 'ga-nav2.closed';
    const GA_PRIMARY_NAV_FALLBACK_SELECTOR = 'ga-left-nav2';

    const COLLAPSED_CLASS_EXT = 'ga4o-panels-collapsed';
    const TOGGLE_COLLAPSED_CLASS_BTN = 'ga4o-toggle-collapsed';
    const TOGGLE_EXPANDED_POSITION_CLASS_BTN = 'ga4o-toggle-expanded-position';

    const GA4_NATIVE_VARIABLES_COLLAPSED_CLASS = 'variables-panel-collapsed';
    const GA4_NATIVE_SETTINGS_COLLAPSED_CLASS = 'settings-panel-collapsed';
    const GA4_MINIMIZED_PANELS_CONTAINER_SELECTOR = '.minimized-analysis-panels';
    const GA4_MINIMIZED_VARIABLES_MAXIMIZE_BTN_SELECTOR = '.minimized-data-panel button[aria-label="Maximize variables"]';
    const GA4_MINIMIZED_SETTINGS_MAXIMIZE_BTN_SELECTOR = '.minimized-settings-panel button[aria-label="Maximize settings"]';

    const NATIVE_TOOLTIP_PANEL_SELECTORS = [
        '#ga-shared-tooltip-popup',
        '.mat-mdc-tooltip.mdc-tooltip',
        '.mat-tooltip.mat-tooltip-panel',
        '.cdk-overlay-container .mat-mdc-tooltip.mdc-tooltip',
        '.cdk-overlay-container .mat-tooltip.mat-tooltip-panel'
    ].join(', ');
    const MAT_TOOLTIP_SHOWN_CLASS = 'mat-mdc-tooltip-trigger--shown';

    const SAFE_HOVER_TARGET_SELECTOR = '.gm-unified-header-left-block .gm-product-logo';
    const SAFE_HOVER_TARGET_FALLBACK_SELECTOR = 'body';

    const COLLAPSED_BUTTON_LEFT_MARGIN = 20;
    const DEFAULT_BUTTON_OPACITY = 0.85;
    const INITIAL_APPLY_STATE_DELAY = 150; // Reduced delay

    console.log("GA4 Optimizer: Panel Toggle Feature script loaded (v1.9.0).");

    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.panelToggle = {};

    const logPanelToggleDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Panel Toggle DEBUG):", ...args); };
    const warnPanelToggleDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Panel Toggle DEBUG):", ...args); };
    const errorPanelToggle = (...args) => { console.error("GA4 Optimizer (Panel Toggle ERROR):", ...args); };


    let toggleButtonElement = null;
    let panelTooltipElement = null;
    let observer = null;
    let currentCollapsedState = false;
    let elementsCache = {
        layoutContainer: null, variablesPanel: null, settingsPanel: null,
        gaPrimaryNav: null, minimizedPanelsContainer: null
    };
    let listenerAttached = false;
    let tooltipListenersAttached = false;
    let initialStorageLoadAttempted = false;
    let resizeDebounceTimer = null;
    let isApplyingState = false;

    function findRequiredElements(forceRefresh = true) {
        // Attempt to find elements only if forceRefresh is true or they haven't been cached yet
        if (forceRefresh || !elementsCache.layoutContainer || !elementsCache.gaPrimaryNav) {
            elementsCache.layoutContainer = document.querySelector(MAIN_LAYOUT_CONTAINER_SELECTOR);
            if (elementsCache.layoutContainer) {
                elementsCache.variablesPanel = elementsCache.layoutContainer.querySelector(VARIABLES_PANEL_SELECTOR);
                elementsCache.settingsPanel = elementsCache.layoutContainer.querySelector(SETTINGS_PANEL_SELECTOR);
                elementsCache.minimizedPanelsContainer = elementsCache.layoutContainer.querySelector(GA4_MINIMIZED_PANELS_CONTAINER_SELECTOR);
            } else {
                elementsCache.variablesPanel = null; elementsCache.settingsPanel = null; elementsCache.minimizedPanelsContainer = null;
            }
            elementsCache.gaPrimaryNav = document.querySelector(GA_PRIMARY_NAV_SELECTOR) || document.querySelector(GA_PRIMARY_NAV_FALLBACK_SELECTOR);
        }
        return !!(elementsCache.layoutContainer && elementsCache.gaPrimaryNav);
    }
    function createToggleButton() {
        const button = document.createElement('button');
        button.id = TOGGLE_BUTTON_ID;
        button.innerHTML = `<mat-icon role="img" class="mat-icon notranslate google-material-icons mat-ligature-font mat-icon-no-color ga4o-toggle-icon" aria-hidden="true" data-mat-icon-type="font">chevron_left</mat-icon>`;
        return button;
    }
    function injectToggleButton() {
        if (document.getElementById(TOGGLE_BUTTON_ID)) {
            toggleButtonElement = document.getElementById(TOGGLE_BUTTON_ID);
            return true;
        }
        toggleButtonElement = createToggleButton();
        document.body.appendChild(toggleButtonElement);
        if (document.getElementById(TOGGLE_BUTTON_ID)) return true;
        errorPanelToggle("Toggle button injection FAILED.");
        toggleButtonElement = null; return false;
    }
    function createPanelTooltipElement() {
        if (document.getElementById(PANEL_TOOLTIP_ID)) {
            panelTooltipElement = document.getElementById(PANEL_TOOLTIP_ID); return;
        }
        panelTooltipElement = document.createElement('div');
        panelTooltipElement.id = PANEL_TOOLTIP_ID;
        panelTooltipElement.style.visibility = 'hidden'; panelTooltipElement.style.opacity = '0';
        document.body.appendChild(panelTooltipElement);
    }
    function showPanelTooltip(event) {
        if (!panelTooltipElement || !toggleButtonElement) return;
        findRequiredElements(true);
        const varsActuallyVisible = isPanelEffectivelyVisible(elementsCache.variablesPanel);
        const settingsActuallyVisible = isPanelEffectivelyVisible(elementsCache.settingsPanel);
        const arePanelsVisuallyCollapsed = !varsActuallyVisible && !settingsActuallyVisible;

        const tooltipText = arePanelsVisuallyCollapsed ? "Expand Settings & Variables" : "Minimize Settings & Variables";

        panelTooltipElement.textContent = tooltipText;
        const buttonRect = toggleButtonElement.getBoundingClientRect();
        panelTooltipElement.style.visibility = 'visible'; panelTooltipElement.style.opacity = '0';
        const tooltipRect = panelTooltipElement.getBoundingClientRect();
        panelTooltipElement.style.visibility = 'hidden';
        let top = buttonRect.top + (buttonRect.height / 2) - (tooltipRect.height / 2);
        let left = arePanelsVisuallyCollapsed ? (buttonRect.right + 8) : (buttonRect.left - tooltipRect.width - 8);
        if (left < 0) left = 5; if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 5;
        if (top < 0) top = 5; if (top + tooltipRect.height > window.innerHeight) top = window.innerHeight - tooltipRect.height - 5;
        panelTooltipElement.style.left = `${left}px`; panelTooltipElement.style.top = `${top}px`;
        panelTooltipElement.style.visibility = 'visible'; panelTooltipElement.style.opacity = '1';
    }
    function hidePanelTooltip() {
        if (!panelTooltipElement) return;
        panelTooltipElement.style.opacity = '0';
        setTimeout(() => { if (panelTooltipElement) panelTooltipElement.style.visibility = 'hidden'; }, 150);
    }
    function addTooltipEventListeners() {
        if (!toggleButtonElement || tooltipListenersAttached) return;
        toggleButtonElement.addEventListener('mouseenter', showPanelTooltip);
        toggleButtonElement.addEventListener('mouseleave', hidePanelTooltip);
        tooltipListenersAttached = true;
    }
    function removeTooltipEventListeners() {
        if (toggleButtonElement && tooltipListenersAttached) {
            toggleButtonElement.removeEventListener('mouseenter', showPanelTooltip);
            toggleButtonElement.removeEventListener('mouseleave', hidePanelTooltip);
            tooltipListenersAttached = false;
        } hidePanelTooltip();
    }
    function isPanelEffectivelyVisible(panelElement) {
        if (!panelElement || !document.body.contains(panelElement)) return false;
        const style = window.getComputedStyle(panelElement);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               panelElement.offsetHeight > 0 &&
               panelElement.offsetWidth > 0;
    }
    function updateButtonVisualsAndAria(isVisuallyCollapsed) {
        if (!toggleButtonElement) return;
        const iconElement = toggleButtonElement.querySelector('.ga4o-toggle-icon');
        if (iconElement) iconElement.textContent = isVisuallyCollapsed ? 'chevron_right' : 'chevron_left';

        toggleButtonElement.classList.toggle(TOGGLE_COLLAPSED_CLASS_BTN, isVisuallyCollapsed);
        toggleButtonElement.classList.toggle(TOGGLE_EXPANDED_POSITION_CLASS_BTN, !isVisuallyCollapsed);

        toggleButtonElement.setAttribute('aria-pressed', String(isVisuallyCollapsed));
        toggleButtonElement.setAttribute('aria-label', isVisuallyCollapsed ? "Expand Settings & Variables" : "Minimize Settings & Variables");
    }

    function updateButtonPosition() {
        if (!toggleButtonElement || !elementsCache.gaPrimaryNav || !elementsCache.layoutContainer) {
            if (toggleButtonElement) {
                toggleButtonElement.style.visibility = 'hidden';
                toggleButtonElement.style.opacity = '0';
            }
            return;
        }
        findRequiredElements(true); // Refresh cache before calculating position

        const gap = 5;
        let gaNavWidth = elementsCache.gaPrimaryNav.offsetWidth || 72;
        let buttonLeft;

        const varsActuallyVisible = isPanelEffectivelyVisible(elementsCache.variablesPanel);
        const settingsActuallyVisible = isPanelEffectivelyVisible(elementsCache.settingsPanel);
        const arePanelsVisuallyCollapsed = !varsActuallyVisible && !settingsActuallyVisible;

        updateButtonVisualsAndAria(arePanelsVisuallyCollapsed);

        if (arePanelsVisuallyCollapsed) {
            buttonLeft = gaNavWidth + COLLAPSED_BUTTON_LEFT_MARGIN;
        } else {
            let rightmostPanelEdge = gaNavWidth;
            if (settingsActuallyVisible && elementsCache.settingsPanel) {
                rightmostPanelEdge = elementsCache.settingsPanel.getBoundingClientRect().right;
            } else if (varsActuallyVisible && elementsCache.variablesPanel) {
                rightmostPanelEdge = elementsCache.variablesPanel.getBoundingClientRect().right;
            }
            buttonLeft = rightmostPanelEdge + gap;
        }

        toggleButtonElement.style.top = '50%';
        toggleButtonElement.style.transform = 'translateY(-50%)';
        toggleButtonElement.style.left = `${Math.max(0, buttonLeft)}px`;

        toggleButtonElement.style.visibility = 'visible';
        toggleButtonElement.style.opacity = DEFAULT_BUTTON_OPACITY;
    }

    function clickGA4NativeMaximizeButton(selector) {
        const container = elementsCache.minimizedPanelsContainer || document;
        const button = container.querySelector(selector);
        if (button && button.offsetParent !== null && window.getComputedStyle(button).display !== 'none') {
            logPanelToggleDebug("Clicking GA4 native maximize button:", selector);
            button.click(); return true;
        }
        logPanelToggleDebug("GA4 native maximize button not found or not visible:", selector);
        return false;
    }

    function dismissNativeTooltipsByHoverSimulation() {
        logPanelToggleDebug("Attempting to dismiss native GA4 tooltips by hover simulation...");
        let targetElement = document.querySelector(SAFE_HOVER_TARGET_SELECTOR);
        if (!targetElement) {
            logPanelToggleDebug("Primary safe hover target not found, trying fallback.");
            targetElement = document.querySelector(SAFE_HOVER_TARGET_FALLBACK_SELECTOR);
        }
        if (!targetElement) {
            warnPanelToggleDebug("No safe hover target found for tooltip dismissal.");
            return;
        }

        logPanelToggleDebug("Simulating mouseenter on:", targetElement);
        try {
            targetElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window, relatedTarget: document.body }));
            targetElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window, relatedTarget: document.body }));
        } catch (e) {
            warnPanelToggleDebug("Error dispatching mouseenter/mouseover:", e);
        }

        setTimeout(() => {
            if (document.body.contains(targetElement)) {
                logPanelToggleDebug("Simulating mouseleave from:", targetElement);
                try {
                    targetElement.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true, view: window, relatedTarget: document.body }));
                    targetElement.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true, view: window, relatedTarget: document.body }));
                } catch (e) {
                    warnPanelToggleDebug("Error dispatching mouseleave/mouseout:", e);
                }
            }
            const tooltipPanels = document.querySelectorAll(NATIVE_TOOLTIP_PANEL_SELECTORS);
            tooltipPanels.forEach(panel => {
                const style = window.getComputedStyle(panel);
                if (style.visibility !== 'hidden' || style.opacity !== '0') {
                    panel.style.visibility = 'hidden';
                    panel.style.opacity = '0';
                }
            });
             const tooltipTriggers = document.querySelectorAll(`.${MAT_TOOLTIP_SHOWN_CLASS}`);
             tooltipTriggers.forEach(trigger => trigger.classList.remove(MAT_TOOLTIP_SHOWN_CLASS));

        }, 150);
    }


    function applyState(newIntentIsCollapsed) {
        if (isApplyingState) {
             logPanelToggleDebug("applyState: Already applying state, bailing."); return;
        }
        isApplyingState = true;
        logPanelToggleDebug(`applyState: Intent is to ${newIntentIsCollapsed ? 'COLLAPSE' : 'EXPAND'}.`);

        try {
            if (!findRequiredElements(true)) { // Always refresh elements before applying state
                 errorPanelToggle("ApplyState: Required GA4 elements not found. Aborting state application.");
                 isApplyingState = false; // Reset flag
                 return;
            }
            if (!toggleButtonElement && !injectToggleButton()) { // Button is critical
                 errorPanelToggle("ApplyState: Toggle button injection failed. Aborting state application.");
                 isApplyingState = false; // Reset flag
                 return;
            }
            if (!panelTooltipElement) createPanelTooltipElement();

            currentCollapsedState = newIntentIsCollapsed;
            const layoutContainer = elementsCache.layoutContainer; // Use cached after findRequiredElements

            if (layoutContainer) { // Should always be true if findRequiredElements passed
                if (currentCollapsedState) {
                    layoutContainer.classList.add(COLLAPSED_CLASS_EXT);
                    dismissNativeTooltipsByHoverSimulation();
                } else {
                    layoutContainer.classList.remove(COLLAPSED_CLASS_EXT);
                    layoutContainer.classList.remove(GA4_NATIVE_VARIABLES_COLLAPSED_CLASS);
                    layoutContainer.classList.remove(GA4_NATIVE_SETTINGS_COLLAPSED_CLASS);

                    clickGA4NativeMaximizeButton(GA4_MINIMIZED_VARIABLES_MAXIMIZE_BTN_SELECTOR);
                    clickGA4NativeMaximizeButton(GA4_MINIMIZED_SETTINGS_MAXIMIZE_BTN_SELECTOR);

                    setTimeout(() => {
                        if (isApplyingState && !currentCollapsedState) {
                            logPanelToggleDebug("applyState (EXPAND - delayed): Forcing panel style reset.");
                            [elementsCache.variablesPanel, elementsCache.settingsPanel].forEach(panel => {
                                if (panel && panel.style) {
                                    ['display', 'width', 'min-width', 'flex-basis', 'margin', 'padding', 'opacity', 'overflow', 'visibility', 'pointer-events']
                                        .forEach(prop => panel.style.removeProperty(prop));
                                }
                            });
                            if (findRequiredElements(true)) updateButtonPosition();
                        }
                    }, 250);
                }
            }

            updateButtonPosition(); // Call this after state classes are applied to layoutContainer

        } catch (e) {
            errorPanelToggle("Error during applyState:", e);
        } finally {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    isApplyingState = false;
                    logPanelToggleDebug("applyState: Finished and reset isApplyingState.");
                });
            });
        }
    }

    function handleToggleClick() {
        if (isApplyingState) {
            logPanelToggleDebug("handleToggleClick: Click ignored, isApplyingState is true."); return;
        }
        if (!toggleButtonElement) return;

        const newDesiredState = !currentCollapsedState;

        logPanelToggleDebug(`handleToggleClick: User clicked. Our current internal state: ${currentCollapsedState}. New desired state for us: ${newDesiredState}.`);

        applyState(newDesiredState);

        if (chrome.runtime?.id) {
            chrome.storage.sync.set({ [FEATURE_STORAGE_KEY]: newDesiredState }, () => {
                if (chrome.runtime.lastError) errorPanelToggle("Error saving newDesiredState to storage:", chrome.runtime.lastError);
            });
        }
    }

    function handleResize() {
        clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(() => {
            if (findRequiredElements(true)) updateButtonPosition();
        }, 250);
    }

    const observerCallback = (mutationsList, obs) => {
        if (isApplyingState) return;

        let potentialLayoutChangeByGA4 = false;
        for (const mutation of mutationsList) {
            const target = mutation.target;
            if ( (target === elementsCache.layoutContainer && mutation.attributeName === 'class') ||
                 (mutation.type === 'attributes' && mutation.attributeName === 'style' && (target === elementsCache.variablesPanel || target === elementsCache.settingsPanel)) ||
                 (mutation.type === 'childList' && elementsCache.layoutContainer?.contains(target)) ){
                potentialLayoutChangeByGA4 = true;
                break;
            }
        }

        if (potentialLayoutChangeByGA4) {
            logPanelToggleDebug("Observer: Detected potential layout change by GA4.");
            if (findRequiredElements(true)) { // Refresh cache
                const varsActuallyVisible = isPanelEffectivelyVisible(elementsCache.variablesPanel);
                const settingsActuallyVisible = isPanelEffectivelyVisible(elementsCache.settingsPanel);
                const ga4IsVisuallyCollapsed = !varsActuallyVisible && !settingsActuallyVisible;

                if (ga4IsVisuallyCollapsed !== currentCollapsedState) {
                    logPanelToggleDebug(`Observer: GA4 visual state (${ga4IsVisuallyCollapsed ? 'Collapsed' : 'Expanded'}) differs from our current internal state (${currentCollapsedState ? 'Collapsed' : 'Expanded'}). Syncing internal state.`);
                    currentCollapsedState = ga4IsVisuallyCollapsed;
                    if (chrome.runtime?.id) {
                        chrome.storage.sync.set({ [FEATURE_STORAGE_KEY]: currentCollapsedState });
                    }
                }
                updateButtonPosition(); // Always update button position on relevant changes
            }
        }
    };

    function setupPanelObserver() {
        if (observer) stopPanelObserver();
        if (!findRequiredElements(false) || !elementsCache.layoutContainer) { // Check cache first
             logPanelToggleDebug("setupPanelObserver: Layout container not found for observer."); return;
        }
        observer = new MutationObserver(observerCallback);
        try {
            const observeConfig = { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true };
            observer.observe(elementsCache.layoutContainer, observeConfig);
            // No need to observe variablesPanel/settingsPanel directly if layoutContainer subtree is true
            window.addEventListener('resize', handleResize);
        } catch (e) {
            observer = null; errorPanelToggle("Error setting up observer:", e);
        }
    }
    function stopPanelObserver() {
        if (observer) {
            try { observer.disconnect(); } catch (e) {}
            observer = null;
        }
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeDebounceTimer);
    }

    window.ga4Optimizer.panelToggle.runCalculation = function() {
        logPanelToggleDebug("runCalculation: Initiated.");
        // Ensure critical GA4 elements are present before proceeding with initial setup
        if (!findRequiredElements(true)) { // Force refresh of cache here
            logPanelToggleDebug("runCalculation: Critical GA4 elements not yet present. Deferring full init.");
            initialStorageLoadAttempted = false; // Allow re-attempt on next call
            return;
        }

        if (!toggleButtonElement && !injectToggleButton()) {
            logPanelToggleDebug("runCalculation: Toggle button injection failed. Aborting.");
            initialStorageLoadAttempted = false;
            return;
        }

        // Make button visible and position it immediately if elements are found
        // This ensures the button appears faster.
        updateButtonPosition();


        if (!listenerAttached && toggleButtonElement) {
            toggleButtonElement.addEventListener('click', handleToggleClick); listenerAttached = true;
        }
        if (!tooltipListenersAttached && toggleButtonElement) {
             createPanelTooltipElement(); addTooltipEventListeners();
        }

        if (!initialStorageLoadAttempted) {
            initialStorageLoadAttempted = true;
            if (chrome.runtime?.id) {
                // Reduced delay for storage load and state application
                setTimeout(() => {
                    if (!chrome.runtime?.id) { // Extension context might be lost
                        currentCollapsedState = false; applyState(false); setupPanelObserver(); return;
                    }
                    chrome.storage.sync.get([FEATURE_STORAGE_KEY], (result) => {
                        let storedState = false;
                        if (chrome.runtime.lastError) errorPanelToggle("Storage get error:", chrome.runtime.lastError);
                        else storedState = typeof result[FEATURE_STORAGE_KEY] === 'boolean' ? result[FEATURE_STORAGE_KEY] : false;

                        // Re-check elements as DOM might have changed during the timeout
                        if (!findRequiredElements(true)) {
                             logPanelToggleDebug("runCalculation (delayed): Critical GA4 elements disappeared. Aborting.");
                             return;
                        }

                        const varsInitiallyVisible = isPanelEffectivelyVisible(elementsCache.variablesPanel);
                        const settingsInitiallyVisible = isPanelEffectivelyVisible(elementsCache.settingsPanel);
                        const initiallyVisuallyCollapsed = !varsInitiallyVisible && !settingsInitiallyVisible;

                        if (storedState !== initiallyVisuallyCollapsed) {
                            logPanelToggleDebug(`runCalculation (initial): Stored state (${storedState ? 'C':'E'}) differs from initial visual (${initiallyVisuallyCollapsed ? 'C':'E'}). Syncing to visual.`);
                            currentCollapsedState = initiallyVisuallyCollapsed;
                            if (chrome.runtime?.id) {
                                chrome.storage.sync.set({ [FEATURE_STORAGE_KEY]: currentCollapsedState });
                            }
                        } else {
                            currentCollapsedState = storedState;
                        }

                        logPanelToggleDebug("runCalculation (initial): Applying final initial state:", currentCollapsedState ? 'Collapsed':'Expanded');
                        applyState(currentCollapsedState); // This will also call updateButtonPosition
                        setupPanelObserver();
                    });
                }, INITIAL_APPLY_STATE_DELAY); // Use the new reduced delay
            } else { // No storage API (e.g., testing)
                currentCollapsedState = false;
                applyState(currentCollapsedState);
                setupPanelObserver();
            }
        } else {
            // This path is for subsequent calls by content_main's observer
            logPanelToggleDebug("runCalculation (re-run): Ensuring observer and button position.");
            if (findRequiredElements(true)) updateButtonPosition(); // Refresh cache & update position
            setupPanelObserver(); // Ensure observer is running
        }
    };

    window.ga4Optimizer.panelToggle.remove = function() {
        logPanelToggleDebug("remove: Process started.");
        stopPanelObserver();
        removeTooltipEventListeners();
        initialStorageLoadAttempted = false;
        if (toggleButtonElement) {
            if (listenerAttached) { toggleButtonElement.removeEventListener('click', handleToggleClick); listenerAttached = false; }
            toggleButtonElement.remove(); toggleButtonElement = null;
        }
        if (panelTooltipElement) { panelTooltipElement.remove(); panelTooltipElement = null; }

        const lc = document.querySelector(MAIN_LAYOUT_CONTAINER_SELECTOR);
        if (lc) {
            lc.classList.remove(COLLAPSED_CLASS_EXT);
        }
        // Reset elementsCache values, not the object itself
        elementsCache.layoutContainer = null;
        elementsCache.variablesPanel = null;
        elementsCache.settingsPanel = null;
        elementsCache.minimizedPanelsContainer = null;
        // elementsCache.gaPrimaryNav can persist as it's less dynamic here
        currentCollapsedState = false;
        logPanelToggleDebug("remove: Cleanup complete.");
    };
})();