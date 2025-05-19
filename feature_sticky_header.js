/**
 * feature_sticky_header.js - Logic for Sticky Header in Standard Reports
 * Part of the GA4 Optimizer Extension
 * VERSION: 1.8.3 - Ensure activeTables is cleared robustly in remove().
 * - Simplify runCalculation logic further regarding observer start.
 */
(function() { // Start of IIFE
if (window.ga4Optimizer?.debugModeEnabled) {
    console.log("GA4 Optimizer: Sticky Header Feature script loaded (v1.8.3).");
}

    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.stickyHeader = {};

    // --- Debug Logging Helper ---
    const logStickyDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Sticky Header v1.8.3):", ...args); };
    const warnStickyDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Sticky Header v1.8.3):", ...args); };
    const errorSticky = (...args) => { console.error("GA4 Optimizer (Sticky Header v1.8.3):", ...args); };

    // --- Configuration ---
    const REPORT_TABLE_SELECTOR = 'ga-reporting-table';
    const REPORT_TABLE_HEADER_SELECTOR = 'thead';
    const REPORT_TABLE_SCROLLER_SELECTOR = '.table-scroller';
    const DEBOUNCE_DELAY = 250;
    const TOP_OFFSET = 140;

    const COMPARISON_ACTIVE_INDICATOR_SELECTOR = 'thead th.adv-table-comparison-column-header-cell';
    const COMPARISON_WARNING_CLASS = 'ga4-optimizer-sticky-header-comparison-warning';
    const WARNING_MESSAGE_TEXT = "Sticky Header may have issues with 'Comparisons' active. Table layout might be affected. The button on the right will disable it until next refresh. To disable permanently, use the extension popup menu.";
    const DISABLE_BUTTON_TEXT = "Disable Until Next Page Reload";

    // --- Feature State ---
    let observer = null;
    let activeTables = new Map();
    let resizeListenerAttached = false;
    let debouncedResizeHandler = null;
    let viewDisabledTemporarily = false;

    function debounce(func, delay) {
        let debounceTimer;
        return function(...args) {
            const context = this;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        }
    }

    function applyStyles(headerElement, scrollerElement) {
        // ... (no changes)
        if (!headerElement || !scrollerElement || !document.body.contains(scrollerElement)) {
            return;
        }
        try {
            const headerHeight = headerElement.offsetHeight;
            if (headerHeight <= 0) return;
            let availableHeight = window.innerHeight - TOP_OFFSET - headerHeight;
            if (availableHeight < 0) availableHeight = 0;
            headerElement.style.position = 'sticky';
            headerElement.style.top = '0';
            headerElement.style.zIndex = '10';
            headerElement.style.backgroundColor = 'var(--ga-surface-color, #ffffff)';
            headerElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            scrollerElement.style.maxHeight = `${availableHeight}px`;
            scrollerElement.style.overflowY = 'auto';
            headerElement.querySelectorAll('th.mat-mdc-table-sticky').forEach(th => {
                th.style.zIndex = '12';
                th.style.backgroundColor = 'var(--ga-surface-color, #ffffff)';
            });
            headerElement.querySelectorAll('th:not(.mat-mdc-table-sticky)').forEach(th => {
                th.style.zIndex = '11';
            });
        } catch (error) {
            errorSticky("Error applying sticky styles:", error);
        }
    }

    function removeStyles(headerElement, scrollerElement) {
        // ... (no changes)
        if (!headerElement) return;
        headerElement.style.position = '';
        headerElement.style.top = '';
        headerElement.style.zIndex = '';
        headerElement.style.backgroundColor = '';
        headerElement.style.boxShadow = '';
        headerElement.querySelectorAll('th').forEach(th => {
            th.style.zIndex = '';
            th.style.backgroundColor = '';
        });
        if (scrollerElement) {
            scrollerElement.style.maxHeight = '';
            scrollerElement.style.overflowY = '';
        }
    }

    function handleDisableFeatureClick() {
        logStickyDebug(`handleDisableFeatureClick: Setting viewDisabledTemporarily = true. Current val: ${viewDisabledTemporarily}`);
        viewDisabledTemporarily = true;

        // Remove styles and warnings from ALL currently tracked tables
        activeTables.forEach(({ header, scroller }, tableEl) => {
            removeStyles(header, scroller);
            removeComparisonWarning(tableEl); // This also removes the button listener
        });
        // No need to clear activeTables here, as remove() will do it if main toggle is off,
        // or runCalculation will repopulate it if main toggle is on for the next view.

        stopObserver();
        detachResizeListener();
        logStickyDebug(`handleDisableFeatureClick: Sticky header temporarily disabled for this view. Observer/listener stopped.`);
    }

    function displayComparisonWarning(tableElement) {
        // ... (no changes)
        if (!tableElement) return;
        let tableData = activeTables.get(tableElement);
        if (!tableData) {
            // If tableData doesn't exist, it means this table wasn't processed by updateTableBehavior yet,
            // or was cleared. Let's ensure it's in activeTables before proceeding.
            // This shouldn't happen if called from updateTableBehavior, but as a safeguard:
            const header = tableElement.querySelector(REPORT_TABLE_HEADER_SELECTOR);
            const scroller = tableElement.querySelector(REPORT_TABLE_SCROLLER_SELECTOR);
            if (header && scroller) {
                activeTables.set(tableElement, { header, scroller, warningDiv: null, disableButtonListener: null });
                tableData = activeTables.get(tableElement);
            } else {
                warnStickyDebug("displayComparisonWarning: Table or its components not found, cannot display warning.");
                return;
            }
        }
        
        if (tableData.warningDiv && document.body.contains(tableData.warningDiv)) {
            return; // Warning already exists
        }

        const warningDiv = document.createElement('div');
        warningDiv.className = COMPARISON_WARNING_CLASS;
        const messageSpan = document.createElement('span');
        messageSpan.textContent = WARNING_MESSAGE_TEXT;
        messageSpan.style.marginRight = "10px";
        messageSpan.style.flexGrow = "1";

        const disableButton = document.createElement('button');
        disableButton.textContent = DISABLE_BUTTON_TEXT;
        // ... (button styles)
        disableButton.style.padding = '4px 8px';
        disableButton.style.fontSize = '12px';
        disableButton.style.border = '1px solid #ccc';
        disableButton.style.backgroundColor = '#f0f0f0';
        disableButton.style.borderRadius = '3px';
        disableButton.style.cursor = 'pointer';
        disableButton.style.whiteSpace = 'nowrap';
        disableButton.onmouseover = () => disableButton.style.backgroundColor = '#e0e0e0';
        disableButton.onmouseout = () => disableButton.style.backgroundColor = '#f0f0f0';


        // IMPORTANT: Create a NEW listener function each time to avoid issues with removal
        const newListener = () => handleDisableFeatureClick(); // Simple closure
        disableButton.addEventListener('click', newListener);

        warningDiv.appendChild(messageSpan);
        warningDiv.appendChild(disableButton);
        // ... (warningDiv styles)
        warningDiv.style.backgroundColor = 'var(--ga-warning-background-color, #fffbe6)';
        warningDiv.style.border = '1px solid var(--ga-warning-border-color, #ffe58f)';
        warningDiv.style.color = 'var(--ga-text-primary-color, rgba(0, 0, 0, 0.85))';
        warningDiv.style.padding = '10px 15px';
        warningDiv.style.marginTop = '10px';
        warningDiv.style.marginBottom = '10px';
        warningDiv.style.borderRadius = '4px';
        warningDiv.style.fontSize = '13px';
        warningDiv.style.lineHeight = '1.5';
        warningDiv.style.display = 'flex';
        warningDiv.style.alignItems = 'center';
        warningDiv.style.justifyContent = 'space-between';
        warningDiv.style.gap = '10px';


        tableElement.parentNode.insertBefore(warningDiv, tableElement.nextSibling);
        // Update activeTables with the new warningDiv and its specific listener
        tableData.warningDiv = warningDiv;
        tableData.disableButtonListener = newListener; // Store the new listener
    }

    function removeComparisonWarning(tableElement) {
        const tableData = activeTables.get(tableElement);
        if (tableData && tableData.warningDiv) {
            const buttonInWarning = tableData.warningDiv.querySelector('button');
            if (buttonInWarning && tableData.disableButtonListener) {
                // Use the stored listener for removal
                buttonInWarning.removeEventListener('click', tableData.disableButtonListener);
                logStickyDebug("Removed disableButtonListener for table:", tableElement);
            }
            if (document.body.contains(tableData.warningDiv)) {
                tableData.warningDiv.remove();
            }
            tableData.warningDiv = null;
            tableData.disableButtonListener = null; // Clear stored listener
        }
    }

    function updateTableBehavior(tableElement) {
        logStickyDebug(`updateTableBehavior for table. Main toggle: ${window.ga4Optimizer.featureStates.stickyHeaderEnabled}, Temp disable: ${viewDisabledTemporarily}`);
        if (!document.body.contains(tableElement)) {
            logStickyDebug("updateTableBehavior: Table no longer in DOM. Removing from activeTables if present.");
            removeComparisonWarning(tableElement); // Clean up warning first
            activeTables.delete(tableElement);
            if (activeTables.size === 0 && resizeListenerAttached) detachResizeListener();
            return;
        }

        const header = tableElement.querySelector(REPORT_TABLE_HEADER_SELECTOR);
        const scroller = tableElement.querySelector(REPORT_TABLE_SCROLLER_SELECTOR);

        if (!header || !scroller) {
            logStickyDebug("updateTableBehavior: Header or scroller not found for table. Cleaning up entry if exists.");
            if (activeTables.has(tableElement)) {
                const oldData = activeTables.get(tableElement);
                removeStyles(oldData.header, oldData.scroller);
                removeComparisonWarning(tableElement);
                activeTables.delete(tableElement);
            }
            if (activeTables.size === 0 && resizeListenerAttached) detachResizeListener();
            return;
        }

        // Ensure table is in activeTables map or add/update it
        if (!activeTables.has(tableElement)) {
            activeTables.set(tableElement, { header, scroller, warningDiv: null, disableButtonListener: null });
            logStickyDebug("updateTableBehavior: Added new table to activeTables:", tableElement);
        } else {
            const currentData = activeTables.get(tableElement);
            currentData.header = header; // Update references if needed
            currentData.scroller = scroller;
        }

        if (window.ga4Optimizer.featureStates.stickyHeaderEnabled && !viewDisabledTemporarily) {
            applyStyles(header, scroller);
            const isComparisonActive = !!tableElement.querySelector(COMPARISON_ACTIVE_INDICATOR_SELECTOR);
            if (isComparisonActive) {
                displayComparisonWarning(tableElement);
            } else {
                removeComparisonWarning(tableElement); // Ensure warning is removed if comparison becomes inactive
            }
        } else {
            removeStyles(header, scroller);
            removeComparisonWarning(tableElement); // Ensure warning is removed if feature is disabled
        }
    }

    function handleResize() {
        if (window.ga4Optimizer.featureStates.stickyHeaderEnabled && !viewDisabledTemporarily) {
            activeTables.forEach(({ header, scroller }, table) => {
                 applyStyles(header, scroller);
            });
        }
    }
    debouncedResizeHandler = debounce(handleResize, DEBOUNCE_DELAY);

    function attachResizeListener() {
        // ... (no changes)
        if (!resizeListenerAttached) {
            window.addEventListener('resize', debouncedResizeHandler);
            resizeListenerAttached = true;
            logStickyDebug("Resize listener ATTACHED.");
        }
    }
    function detachResizeListener() {
        // ... (no changes)
        if (resizeListenerAttached) {
            window.removeEventListener('resize', debouncedResizeHandler);
            resizeListenerAttached = false;
            logStickyDebug("Resize listener DETACHED.");
        }
    }

    function observerCallback(mutationsList) {
        // ... (no changes to observerCallback's internal logic, only its activation)
        if (viewDisabledTemporarily) {
            // logStickyDebug("observerCallback: Bailed due to viewDisabledTemporarily = true.");
            return;
        }
        if (!window.ga4Optimizer.featureStates.stickyHeaderEnabled) {
            // logStickyDebug("observerCallback: Bailed due to main toggle being disabled.");
            return;
        }

        let tablesToRecheck = new Set();
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(REPORT_TABLE_SELECTOR)) tablesToRecheck.add(node);
                        else if (node.querySelectorAll) node.querySelectorAll(REPORT_TABLE_SELECTOR).forEach(table => tablesToRecheck.add(table));
                    }
                });
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(REPORT_TABLE_SELECTOR)) {
                            if (activeTables.has(node)) { removeComparisonWarning(node); activeTables.delete(node); }
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll(REPORT_TABLE_SELECTOR).forEach(table => {
                                if (activeTables.has(table)) { removeComparisonWarning(table); activeTables.delete(table); }
                            });
                        }
                    }
                });
            }
            if (mutation.type === 'attributes' || mutation.type === 'subtree') {
                const target = mutation.target;
                 activeTables.forEach((_value, tableElement) => {
                    if (tableElement.contains(target)) tablesToRecheck.add(tableElement);
                });
                 if (target.closest && target.closest(REPORT_TABLE_SELECTOR)) {
                     tablesToRecheck.add(target.closest(REPORT_TABLE_SELECTOR));
                 }
            }
        }
        if (tablesToRecheck.size > 0) {
             logStickyDebug(`observerCallback: Rechecking ${tablesToRecheck.size} tables.`);
        }
        tablesToRecheck.forEach(table => {
            if (document.body.contains(table)) updateTableBehavior(table);
            else { if(activeTables.has(table)){ removeComparisonWarning(table); activeTables.delete(table);}}
        });

        if (activeTables.size > 0 && window.ga4Optimizer.featureStates.stickyHeaderEnabled && !viewDisabledTemporarily && !resizeListenerAttached) {
            attachResizeListener();
        } else if ((activeTables.size === 0 || !window.ga4Optimizer.featureStates.stickyHeaderEnabled || viewDisabledTemporarily) && resizeListenerAttached) {
            detachResizeListener();
        }
    }

    function startObserver() {
        // ... (no changes)
        if (!observer) { 
            observer = new MutationObserver(observerCallback);
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            logStickyDebug("MutationObserver STARTED.");
        } else {
            logStickyDebug("startObserver called, but observer already exists.");
        }
    }
    function stopObserver() {
        // ... (no changes)
        if (observer) {
            observer.disconnect();
            observer = null;
            logStickyDebug("MutationObserver STOPPED.");
        }
    }

    window.ga4Optimizer.stickyHeader.runCalculation = function() {
        logStickyDebug(`runCalculation CALLED. Main toggle: ${window.ga4Optimizer.featureStates.stickyHeaderEnabled}, Temp disable: ${viewDisabledTemporarily}, Observer exists: ${!!observer}`);

        const shouldBeActive = window.ga4Optimizer.featureStates.stickyHeaderEnabled && !viewDisabledTemporarily;

        if (shouldBeActive) {
            logStickyDebug("runCalculation: Feature should be ACTIVE. Ensuring systems are running.");
            startObserver(); // Will only start if not already running
            
            const currentTablesInDOM = new Set(document.querySelectorAll(REPORT_TABLE_SELECTOR));
            logStickyDebug(`runCalculation: Found ${currentTablesInDOM.size} tables in DOM.`);

            // Process all tables currently in DOM
            currentTablesInDOM.forEach(table => updateTableBehavior(table));

            // Clean up any tables in our map that are no longer in the DOM
            const tablesToRemoveFromMap = [];
            activeTables.forEach((_data, tableElement) => {
                if (!currentTablesInDOM.has(tableElement)) {
                    tablesToRemoveFromMap.push(tableElement);
                }
            });
            tablesToRemoveFromMap.forEach(tableElement => {
                logStickyDebug(`runCalculation: Removing stale table from activeTables map:`, tableElement);
                removeComparisonWarning(tableElement); // Clean warning before deleting from map
                activeTables.delete(tableElement);
            });
            
            // Manage resize listener based on whether there are active tables
            if (activeTables.size > 0 && !resizeListenerAttached) {
                attachResizeListener();
            } else if (activeTables.size === 0 && resizeListenerAttached) {
                detachResizeListener();
            }

        } else {
            logStickyDebug("runCalculation: Feature should be INACTIVE (main toggle off or temp disabled).");
            // If the main toggle is off, this.remove() will handle full cleanup, including resetting temp_disable.
            // If only temp_disable is true, just stop current activity.
            if (!window.ga4Optimizer.featureStates.stickyHeaderEnabled) {
                this.remove(); // This will also call stopObserver, detachResizeListener, and reset viewDisabledTemporarily
            } else { // Main toggle is ON, but view is temporarily disabled
                stopObserver();
                detachResizeListener();
                // Remove styles/warnings that might have been applied before temp disable
                activeTables.forEach(({ header, scroller }, tableEl) => {
                    removeStyles(header, scroller);
                    removeComparisonWarning(tableEl);
                });
                // DO NOT clear activeTables here, as they might be needed if temp_disable is lifted without full remove.
                // DO NOT reset viewDisabledTemporarily here. That's the job of remove().
            }
        }
    };

    window.ga4Optimizer.stickyHeader.remove = function() {
        logStickyDebug(`remove CALLED. Current viewDisabledTemporarily: ${viewDisabledTemporarily}, Observer exists: ${!!observer}`);
        stopObserver();
        detachResizeListener();

        // Iterate over a copy of keys or use a for...of loop that allows modification
        // because removeComparisonWarning modifies the activeTables map
        const tableElementsToClean = Array.from(activeTables.keys());
        tableElementsToClean.forEach(tableElement => {
            const tableData = activeTables.get(tableElement);
            if (tableData) {
                removeStyles(tableData.header, tableData.scroller);
                removeComparisonWarning(tableElement); // This will also remove the button listener
            }
        });
        
        activeTables.clear(); // Now clear the map
        viewDisabledTemporarily = false; // CRITICAL: Always reset on full remove
        logStickyDebug(`remove COMPLETED. viewDisabledTemporarily set to ${viewDisabledTemporarily}. activeTables size: ${activeTables.size}`);
    };

})(); // End of IIFE