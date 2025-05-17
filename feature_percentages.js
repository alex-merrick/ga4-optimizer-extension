/**
 * feature_percentages.js - Logic for the Exploration Row Percentage feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 11.3 - Hide percentage on Totals row (row-index="0").
 * - getPercentageData returns null for totals row.
 * - processCellForInline skips adding tspan for totals row.
 */
(function() { // Start of IIFE

    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.percentages = {};

    // --- Configuration ---
    const TABLE_CONTAINER_SELECTOR = 'div.aplos-chart-container';
    const SCROLL_CONTAINER_SELECTOR = 'div.scroll-div';
    const DATA_CELL_GROUP_SELECTOR = 'div.cells-wrapper g.cell[row-index][column-index]';
    const CELL_VALUE_SELECTOR = 'text:last-of-type';
    const TOTAL_ROW_CELL_SELECTOR = 'div.cells-wrapper g.cell[row-index="0"][column-index]';
    const TOTAL_VALUE_TEXT_SELECTOR = 'text:not(.percent-of-total)';
    const PERCENTAGE_TSPAN_CLASS = 'ga4-percentage-tspan';
    const INLINE_DX = '2';
    const RETRY_DELAY = 600;
    const MAX_RETRIES = 7;
    const SCROLL_DEBOUNCE_DELAY = 300;
    const MAX_DIGITS_FOR_INLINE = 6;

    // --- Feature State ---
    let tableContainerElement = null;
    let scrollContainerElement = null;
    let lastKnownTotals = {}; // Will persist unless explicitly reset
    let isFindingTotals = false;
    let initializedLogShown = false; // Keep this to show activation message once
    let scrollListenerAttachedTo = null;

    // --- Helper Functions ---
    function parseCellValue(text) {
      if (typeof text !== 'string') return NaN;
      const cleanedText = text.replace(/[,%$€£¥]/g, '').trim();
      if (cleanedText === '' || cleanedText === '-') return NaN;
      const value = parseFloat(cleanedText);
      return isNaN(value) ? NaN : value;
    }

    function formatPercentage(value) { // For inline display
      if (isNaN(value) || typeof value !== 'number' || !isFinite(value) || value < 0) return '';
      return `(${(value * 100).toFixed(2)}%)`;
    }

    /**
     * Calculates percentage for Tooltip. Uses persistent cache.
     * Returns null for the Totals row (row-index="0").
     */
    window.ga4Optimizer.percentages.getPercentageData = function(cellG) {
        // Check global enabled state first for tooltip data
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) {
             return null;
        }
        if (!cellG) return null;

        // *** ADD CHECK: Return null if it's the totals row ***
        const rowIndex = cellG.getAttribute('row-index');
        if (rowIndex === "0") {
            return null;
        }
        // *** END CHECK ***

        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        const colIndexStr = cellG.getAttribute('column-index');
        const colIndex = parseInt(colIndexStr, 10);
        // Use cached totals
        if (!cellTextElement || isNaN(colIndex) || !lastKnownTotals || lastKnownTotals[colIndex] === undefined || lastKnownTotals[colIndex] === null || lastKnownTotals[colIndex] === 0) {
            return null;
        }
        const totalValue = lastKnownTotals[colIndex];
        // Get original value even if tspan exists
        const cloneTextElement = cellTextElement.cloneNode(true);
        cloneTextElement.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
        const cellValue = parseCellValue(cloneTextElement.textContent);

        if (isNaN(cellValue)) { return null; }
        return cellValue / totalValue;
    };

    // --- Debounce Function ---
    function debounce(func, delay) {
        let debounceTimer;
        return function(...args) {
            const context = this;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        }
    }

    /** Removes ALL percentage tspans and resets state including totals cache. */
    window.ga4Optimizer.percentages.removeAndReset = function() {
        window.ga4Optimizer.isModifyingDOM = true;
        try {
            // Remove scroll listener if attached
            if (scrollListenerAttachedTo && window.ga4Optimizer.percentages._debouncedScrollHandler) {
                 scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);
                 scrollListenerAttachedTo = null; // Clear tracking
            }
            // Remove ALL tspans
            const spans = document.querySelectorAll(`.${PERCENTAGE_TSPAN_CLASS}`);
            spans.forEach(span => span.remove());

            tableContainerElement = null; scrollContainerElement = null;
            lastKnownTotals = {}; // ** Explicitly clear totals cache **
            isFindingTotals = false; initializedLogShown = false;
        } catch (error) { console.error("[Perc] Error during removeAndReset:", error); } // Keep error logs
        finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
    };

    /** Internal function to remove existing tspans before recalculating. */
    function removeExistingPercentageElements() {
         window.ga4Optimizer.isModifyingDOM = true;
         try {
            const spans = document.querySelectorAll(`.${PERCENTAGE_TSPAN_CLASS}`);
            spans.forEach(span => span.remove());
        } catch (error) { console.error("[Perc] Error removing existing percentage elements:", error); } // Keep error logs
        finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
    }

    /**
     * Processes a single data cell FOR INLINE TSPAN ONLY.
     * Skips processing for the Totals row (row-index="0").
     */
    function processCellForInline(cellG, columnIndex, totalValue) {
        // *** ADD CHECK: Skip totals row ***
        const rowIndex = cellG.getAttribute('row-index');
        if (rowIndex === "0") {
            // Ensure tspan is removed if it somehow exists on total row
            const existingTSpan = cellG.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`);
             if (existingTSpan) {
                 window.ga4Optimizer.isModifyingDOM = true;
                 try { existingTSpan.remove(); } catch(e) { /* ignore */ }
                 finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
             }
            return; // Don't process totals row
        }
        // *** END CHECK ***


        // Check global enabled state first
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) {
            // Ensure tspan is removed if feature was just disabled
            const existingTSpan = cellG.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`);
             if (existingTSpan) {
                 window.ga4Optimizer.isModifyingDOM = true;
                 try { existingTSpan.remove(); } catch(e) { /* ignore */ }
                 finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
             }
            return;
        }

        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        if (!cellTextElement) {
            return; // Exit gracefully if text element not found
        }

        const existingTSpan = cellTextElement.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`);

        // Check if calculation is possible
        if (totalValue === undefined || totalValue === null || isNaN(totalValue) || totalValue === 0) {
            if (existingTSpan) {
                window.ga4Optimizer.isModifyingDOM = true;
                try { existingTSpan.remove(); }
                catch(e) { /* ignore errors during removal */ }
                finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
            }
            return;
        }

        // Clone to get original value
        const cloneTextElement = cellTextElement.cloneNode(true);
        cloneTextElement.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
        const originalText = cloneTextElement.textContent || '';
        const originalValueString = originalText.replace(/,/g, '');
        const cellValue = parseCellValue(originalValueString);

        if (isNaN(cellValue)) {
            if (existingTSpan) {
                 window.ga4Optimizer.isModifyingDOM = true;
                 try { existingTSpan.remove(); }
                 catch(e) { /* ignore errors during removal */ }
                 finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
            }
            return;
        }

        const percentageStringInline = formatPercentage(cellValue / totalValue);

        if (percentageStringInline === '') {
            if (existingTSpan) {
                 window.ga4Optimizer.isModifyingDOM = true;
                 try { existingTSpan.remove(); }
                 catch(e) { /* ignore errors during removal */ }
                 finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
            }
            return;
        }

        // --- Conditions met for potential display ---
        if (existingTSpan) {
            // TSPAN EXISTS: Only update content if necessary. Skip length check.
            if (existingTSpan.textContent !== percentageStringInline) {
                 window.ga4Optimizer.isModifyingDOM = true;
                 try { existingTSpan.textContent = percentageStringInline; }
                 catch(e) { console.warn("[Perc] Error updating tspan textContent:", e); } // Warn on error
                 finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
            }
        } else {
            // TSPAN DOES NOT EXIST: Check original value string length before adding.
            if (originalValueString.length <= MAX_DIGITS_FOR_INLINE) {
                const percentageTSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                percentageTSpan.setAttribute('class', PERCENTAGE_TSPAN_CLASS);
                percentageTSpan.setAttribute('dx', INLINE_DX);
                percentageTSpan.textContent = percentageStringInline;
                window.ga4Optimizer.isModifyingDOM = true;
                try {
                    if (document.body.contains(cellTextElement)) {
                         cellTextElement.appendChild(percentageTSpan);
                    }
                } catch(e) { console.warn("[Perc] Error appending new tspan:", e); } // Warn on error
                finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
            }
        }
    }


    /** Finds column totals/widths. Updates cache ONLY on success. */
    function findTotalsAndMetricsAndWidths(retryCount = 0) {
        if (isFindingTotals && retryCount === 0) { return false; }
        if (retryCount === 0) {
            isFindingTotals = true;
            tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
            if (!tableContainerElement) {
                isFindingTotals = false;
                return false;
            }
        }
        let currentTotals = {}; let indices = []; let totalsParsedCount = 0;
        let needsRetry = false; let retryReason = "";
        const totalRowCells = tableContainerElement.querySelectorAll(TOTAL_ROW_CELL_SELECTOR);

        if (totalRowCells && totalRowCells.length > 0) {
             totalRowCells.forEach(totalCellG => {
                const colIndexStr = totalCellG.getAttribute('column-index'); if (colIndexStr === null) return;
                const colIndex = parseInt(colIndexStr, 10); if (isNaN(colIndex)) return;
                const totalValueElement = totalCellG.querySelector(TOTAL_VALUE_TEXT_SELECTOR);
                const totalValue = totalValueElement ? parseCellValue(totalValueElement.textContent) : NaN;
                if (!isNaN(totalValue)) { currentTotals[colIndex] = totalValue; indices.push(colIndex); totalsParsedCount++; }
                 else { currentTotals[colIndex] = null; indices.push(colIndex); }
            });
            needsRetry = indices.length === 0; if(needsRetry) retryReason = "Failed to find/parse any total cells";
        } else { needsRetry = true; retryReason = "Total row cells query returned empty"; }

        if (needsRetry) {
             if (retryCount < MAX_RETRIES) {
                 setTimeout(() => { findTotalsAndMetricsAndWidths(retryCount + 1); }, RETRY_DELAY); return false;
             } else {
                 isFindingTotals = false;
                 return false;
             }
        } else {
            isFindingTotals = false;
            const totalsChanged = JSON.stringify(lastKnownTotals) !== JSON.stringify(currentTotals);
            if (totalsChanged) {
                lastKnownTotals = currentTotals;
                return true;
            } else {
                return false;
            }
        }
    }

    /** Function called initially and by the debounced scroll listener. */
    function handleScroll() {
        // ** Add check: Exit if feature is disabled **
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) {
            return;
        }
        if (!tableContainerElement) { return; }
        if (Object.keys(lastKnownTotals).length === 0) { return; }
        const renderedCells = tableContainerElement.querySelectorAll(DATA_CELL_GROUP_SELECTOR); // Process all rows including totals initially
        if(renderedCells){
            renderedCells.forEach(cellG => {
                const colIndexStr = cellG.getAttribute('column-index');
                const colIndex = parseInt(colIndexStr, 10);
                const totalForColumn = lastKnownTotals[colIndex];
                processCellForInline(cellG, colIndex, totalForColumn); // processCellForInline now handles skipping totals row
            });
        }
    }

    // Create debounced scroll handler
    window.ga4Optimizer.percentages._debouncedScrollHandler = debounce(handleScroll, SCROLL_DEBOUNCE_DELAY);

    /** Main activation function - Finds totals, attaches scroll listener, runs initial processing. */
    window.ga4Optimizer.percentages.runCalculation = function() {
        // ** Add check: Call removeAndReset and exit if feature is disabled **
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) {
            this.removeAndReset(); // Use 'this' to call instance method
            return;
        }

        if (!initializedLogShown) {
            console.log("GA4 Optimizer: Percentage Feature ACTIVATED (v11.3 - Hide Total Row %)."); // Update version in message
            initializedLogShown = true;
        }
        tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
        if (!tableContainerElement) {
             // Only reset if it was previously initialized (to avoid clearing totals unnecessarily)
             if (initializedLogShown) {
                 this.removeAndReset();
             }
             return;
        }
        const totalsWereUpdated = findTotalsAndMetricsAndWidths();
        if (Object.keys(lastKnownTotals).length > 0) {
            if (totalsWereUpdated) {
                removeExistingPercentageElements();
            }
            setTimeout(handleScroll, 0); // Immediate processing after totals check
            const currentScrollContainer = tableContainerElement.querySelector(SCROLL_CONTAINER_SELECTOR);
            if (currentScrollContainer) {
                if (scrollListenerAttachedTo !== currentScrollContainer) {
                     if (scrollListenerAttachedTo && window.ga4Optimizer.percentages._debouncedScrollHandler) {
                         scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);
                     }
                     scrollContainerElement = currentScrollContainer;
                     scrollContainerElement.addEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);
                     scrollListenerAttachedTo = scrollContainerElement;
                 }
            } else {
                 if (scrollListenerAttachedTo && window.ga4Optimizer.percentages._debouncedScrollHandler) {
                      scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);
                 }
                 scrollContainerElement = null;
                 scrollListenerAttachedTo = null;
            }
        } else {
             // If findTotals failed to get totals, but the feature is enabled,
             // still try to clean up any potentially old tspans.
             if (!totalsWereUpdated && Object.keys(lastKnownTotals).length === 0){
                 removeExistingPercentageElements(); // Clean up just in case
             }
        }
    };

})(); // End of IIFE
;