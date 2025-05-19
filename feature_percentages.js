/**
 * feature_percentages.js - Logic for the Exploration Row Percentage feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 11.7 - Returns "Scroll up..." message if totals not cached for current table.
 * - Added totalsCacheIsValidForCurrentTable & tableContainerForWhichTotalsAreValid state.
 * - findTotalsAndMetricsAndWidths updates this state.
 * - getPercentageData returns specific message if totals need capture.
 */
(function() { // Start of IIFE

    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.percentages = {};

    const logPercDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Percentages v11.7):", ...args); };
    const warnPercDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Percentages v11.7):", ...args); };

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

    const TOTALS_NEED_CAPTURE_MESSAGE = "Scroll up to capture Column's Total";

    let tableContainerElement = null; // The current table being processed by findTotals
    let scrollContainerElement = null;
    let lastKnownTotals = {};
    let isFindingTotals = false;
    // New state for cache validation, similar to segment_comparison
    let totalsCacheIsValidForCurrentTable = false;
    let tableContainerForWhichTotalsAreValid = null;
    let initializedLogShown = false;
    let scrollListenerAttachedTo = null;

    function parseCellValue(text) { /* ... (same as 11.6) ... */
        if (typeof text !== 'string') return NaN; const cleanedText = text.replace(/[,%$€£¥]/g, '').trim();
        if (cleanedText === '' || cleanedText === '-') return NaN; const value = parseFloat(cleanedText);
        return isNaN(value) ? NaN : value;
    }
    function formatPercentage(value) { /* ... (same as 11.6) ... */
        if (isNaN(value) || typeof value !== 'number' || !isFinite(value) || value < 0) return '';
        return `(${(value * 100).toFixed(2)}%)`;
    }

    window.ga4Optimizer.percentages.getPercentageData = function(cellG) {
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) return null;
        if (!cellG) return null;
        const rowIndex = cellG.getAttribute('row-index');
        if (rowIndex === "0") return null; // No percentage for totals row itself

        const currentCellTableContainer = cellG.closest(TABLE_CONTAINER_SELECTOR);

        if (!totalsCacheIsValidForCurrentTable ||
            currentCellTableContainer !== tableContainerForWhichTotalsAreValid ||
            Object.keys(lastKnownTotals).length === 0) {
            logPercDebug("getPercentageData: Totals cache not valid for current cell context or empty. Needs capture.");
            return TOTALS_NEED_CAPTURE_MESSAGE; // Return specific message
        }

        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        const colIndexStr = cellG.getAttribute('column-index');
        const colIndex = parseInt(colIndexStr, 10);

        if (!cellTextElement || isNaN(colIndex) ||
            lastKnownTotals[colIndex] === undefined || lastKnownTotals[colIndex] === null) {
            // This implies the cache is valid for the table, but this specific column's total is missing/null
            // which could happen if a column has no parsable total.
            // Or, if it's a new column that wasn't there when totals were cached.
            logPercDebug(`getPercentageData: Total for col ${colIndex} is missing/null in an otherwise valid cache. Suggesting recapture.`);
            return TOTALS_NEED_CAPTURE_MESSAGE;
        }
        if (lastKnownTotals[colIndex] === 0) { // Denominator is zero
            return null; // Or a specific "Base is 0" message if desired
        }

        const totalValue = lastKnownTotals[colIndex];
        const cloneTextElement = cellTextElement.cloneNode(true);
        cloneTextElement.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
        const cellValue = parseCellValue(cloneTextElement.textContent);

        if (isNaN(cellValue)) return null;
        return cellValue / totalValue;
    };

    function debounce(func, delay) { /* ... (same as 11.6) ... */
        let debounceTimer; return function(...args) { const context = this; clearTimeout(debounceTimer); debounceTimer = setTimeout(() => func.apply(context, args), delay); }
    }

    window.ga4Optimizer.percentages.removeAndReset = function() {
        logPercDebug("removeAndReset called.");
        window.ga4Optimizer.isModifyingDOM = true;
        try {
            if (scrollListenerAttachedTo && window.ga4Optimizer.percentages._debouncedScrollHandler) {
                 scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);
                 scrollListenerAttachedTo = null;
            }
            removeExistingPercentageElements();
            tableContainerElement = null; scrollContainerElement = null;
            lastKnownTotals = {};
            isFindingTotals = false;
            totalsCacheIsValidForCurrentTable = false; // Reset new state
            tableContainerForWhichTotalsAreValid = null; // Reset new state
            initializedLogShown = false;
            logPercDebug("State fully reset by removeAndReset.");
        } catch (error) { console.error("[Perc] Error during removeAndReset:", error); }
        finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
    };

    function removeExistingPercentageElements() { /* ... (same as 11.6) ... */
        const spans = document.querySelectorAll(`.${PERCENTAGE_TSPAN_CLASS}`);
        if (spans.length > 0) {
            logPercDebug(`Removing ${spans.length} existing percentage tspans.`);
            window.ga4Optimizer.isModifyingDOM = true;
            try { spans.forEach(span => span.remove()); }
            catch (error) { console.error("[Perc] Error removing existing percentage elements:", error); }
            finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
        }
    }
    function processCellForInline(cellG, columnIndex, totalValue) { /* ... (same as 11.6, no changes needed here specifically for this request) ... */
        const rowIndex = cellG.getAttribute('row-index');
        if (rowIndex === "0") {
            const existingTSpan = cellG.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`);
             if (existingTSpan) { window.ga4Optimizer.isModifyingDOM = true; try { existingTSpan.remove(); } catch(e) { /* ignore */ } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); } }
            return;
        }
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) {
            const existingTSpan = cellG.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`);
             if (existingTSpan) { window.ga4Optimizer.isModifyingDOM = true; try { existingTSpan.remove(); } catch(e) { /* ignore */ } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); } }
            return;
        }
        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR); if (!cellTextElement) return;
        const existingTSpan = cellTextElement.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`);
        if (totalValue === undefined || totalValue === null || isNaN(totalValue) || totalValue === 0) {
            if (existingTSpan) { window.ga4Optimizer.isModifyingDOM = true; try { existingTSpan.remove(); } catch(e) { /* ignore */ } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); } }
            return;
        }
        const cloneTextElement = cellTextElement.cloneNode(true); cloneTextElement.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
        const originalText = cloneTextElement.textContent || ''; const originalValueString = originalText.replace(/,/g, '');
        const cellValue = parseCellValue(originalValueString);
        if (isNaN(cellValue)) {
            if (existingTSpan) { window.ga4Optimizer.isModifyingDOM = true; try { existingTSpan.remove(); } catch(e) { /* ignore */ } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); } }
            return;
        }
        const percentageStringInline = formatPercentage(cellValue / totalValue);
        if (percentageStringInline === '') {
            if (existingTSpan) { window.ga4Optimizer.isModifyingDOM = true; try { existingTSpan.remove(); } catch(e) { /* ignore */ } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); } }
            return;
        }
        if (existingTSpan) {
            if (existingTSpan.textContent !== percentageStringInline) { window.ga4Optimizer.isModifyingDOM = true; try { existingTSpan.textContent = percentageStringInline; } catch(e) { warnPercDebug("Error updating tspan textContent:", e); } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); } }
        } else {
            if (originalValueString.length <= MAX_DIGITS_FOR_INLINE) {
                const percentageTSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                percentageTSpan.setAttribute('class', PERCENTAGE_TSPAN_CLASS); percentageTSpan.setAttribute('dx', INLINE_DX);
                percentageTSpan.textContent = percentageStringInline; window.ga4Optimizer.isModifyingDOM = true;
                try { if (document.body.contains(cellTextElement)) { cellTextElement.appendChild(percentageTSpan); } }
                catch(e) { warnPercDebug("Error appending new tspan:", e); } finally { setTimeout(() => { window.ga4Optimizer.isModifyingDOM = false; }, 50); }
            }
        }
    }

    function attemptRetry(reason, callback, retryCount) { /* Similar to 11.6, but updates this feature's state */
        if (retryCount < MAX_RETRIES) {
            logPercDebug(`Retrying findTotals... (${retryCount + 1}/${MAX_RETRIES}). Reason: ${reason}`);
            setTimeout(() => { findTotalsAndMetricsAndWidths(callback, retryCount + 1); }, RETRY_DELAY);
        } else {
            warnPercDebug(`findTotalsAndMetricsAndWidths: FAILED after ${MAX_RETRIES} retries. Reason: ${reason}.`);
            isFindingTotals = false;
            if (totalsCacheIsValidForCurrentTable) { // If we thought cache was good for *this* table
                removeExistingPercentageElements(); // Clean up visuals
            }
            lastKnownTotals = {};
            totalsCacheIsValidForCurrentTable = false;
            tableContainerForWhichTotalsAreValid = null;
            if (callback) callback(false);
        }
    }

    function findTotalsAndMetricsAndWidths(callback, retryCount = 0) {
        if (retryCount === 0) { isFindingTotals = true; }

        const currentAttemptTableContainer = document.querySelector(TABLE_CONTAINER_SELECTOR);
        if (!currentAttemptTableContainer) {
            isFindingTotals = false;
            if (totalsCacheIsValidForCurrentTable) removeExistingPercentageElements();
            lastKnownTotals = {};
            totalsCacheIsValidForCurrentTable = false;
            tableContainerForWhichTotalsAreValid = null;
            tableContainerElement = null; // Clear module-level too
            logPercDebug("findTotals: No table container. Cleared totals and validation.");
            if (callback) callback(false);
            return;
        }
        tableContainerElement = currentAttemptTableContainer; // Update module-level context

        if (tableContainerElement !== tableContainerForWhichTotalsAreValid) {
            logPercDebug("findTotals: Table container context changed. Invalidating previous totals cache and validation state.");
            lastKnownTotals = {}; // Clear if table context changes
            totalsCacheIsValidForCurrentTable = false;
            // tableContainerForWhichTotalsAreValid will be set upon successful parsing
        }

        const totalRowCells = tableContainerElement.querySelectorAll(TOTAL_ROW_CELL_SELECTOR);
        let currentTotals = {}; let indicesFound = []; let totalsParsedCount = 0;

        if (totalRowCells && totalRowCells.length > 0) {
            totalRowCells.forEach(totalCellG => { /* ... (parsing logic same as 11.6) ... */
                const colIndexStr = totalCellG.getAttribute('column-index'); if (colIndexStr === null) return;
                const colIndex = parseInt(colIndexStr, 10); if (isNaN(colIndex)) return;
                indicesFound.push(colIndex); const totalValueElement = totalCellG.querySelector(TOTAL_VALUE_TEXT_SELECTOR);
                const totalValue = totalValueElement ? parseCellValue(totalValueElement.textContent) : NaN;
                if (!isNaN(totalValue)) { currentTotals[colIndex] = totalValue; totalsParsedCount++; } else { currentTotals[colIndex] = null; }
            });

            if (indicesFound.length > 0 && totalsParsedCount > 0) { // Successfully found and parsed
                isFindingTotals = false;
                const totalsChanged = JSON.stringify(lastKnownTotals) !== JSON.stringify(currentTotals);
                if (totalsChanged || !totalsCacheIsValidForCurrentTable || tableContainerElement !== tableContainerForWhichTotalsAreValid) {
                    lastKnownTotals = currentTotals;
                    logPercDebug("Totals updated/established from DOM for current table:", tableContainerElement.outerHTML.substring(0,100) , JSON.parse(JSON.stringify(lastKnownTotals)));
                    removeExistingPercentageElements();
                } else { logPercDebug("Totals confirmed from DOM, same as cache for current table:", tableContainerElement.outerHTML.substring(0,100)); }
                totalsCacheIsValidForCurrentTable = true;
                tableContainerForWhichTotalsAreValid = tableContainerElement;
                if (callback) callback(true);
                return;
            } else if (indicesFound.length > 0 && totalsParsedCount === 0) { // Found cells, but unparsable
                if (totalsCacheIsValidForCurrentTable && tableContainerElement === tableContainerForWhichTotalsAreValid) {
                    logPercDebug("findTotals: Total cells present but unparsable. Cache was valid for THIS table. Clearing and failing.");
                    lastKnownTotals = {}; totalsCacheIsValidForCurrentTable = false; tableContainerForWhichTotalsAreValid = null;
                    removeExistingPercentageElements(); isFindingTotals = false; if (callback) callback(false); return;
                } else { attemptRetry("Total cells found, but no numeric values parsed. No valid prior cache for this table or context changed.", callback, retryCount); return; }
            } else { attemptRetry("No specific column indices found in total row cells. Cache invalid or empty.", callback, retryCount); return; }
        } else { // Total row query empty
            if (totalsCacheIsValidForCurrentTable && tableContainerElement === tableContainerForWhichTotalsAreValid && Object.keys(lastKnownTotals).length > 0) {
                logPercDebug("findTotals: Total row cells query empty, but trusting VALID cache for CURRENT table (likely scrolled).");
                isFindingTotals = false; if (callback) callback(true); return;
            } else {
                if (totalsCacheIsValidForCurrentTable && tableContainerElement !== tableContainerForWhichTotalsAreValid) {
                    logPercDebug("findTotals: Total row query empty. Cache was for a DIFFERENT table. Invalidating and retrying.");
                }
                attemptRetry("Total row cells query empty. Cache invalid, empty, or for a different table.", callback, retryCount); return;
            }
        }
    }

    function handleScroll() { /* ... (same as 11.6, uses this feature's validation state) ... */
        if (isFindingTotals) { return; } if (!window.ga4Optimizer.featureStates.percentagesEnabled) { return; }
        const currentContextTable = tableContainerElement; // Table for which totals are presumed valid
        if (!currentContextTable || !document.body.contains(currentContextTable) ||
            !totalsCacheIsValidForCurrentTable || currentContextTable !== tableContainerForWhichTotalsAreValid) {
            if (document.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)) removeExistingPercentageElements(); return;
        }
        if (Object.keys(lastKnownTotals).length === 0) { if (document.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)) removeExistingPercentageElements(); return; }
        const renderedCells = currentContextTable.querySelectorAll(DATA_CELL_GROUP_SELECTOR);
        if(renderedCells){
            renderedCells.forEach(cellG => {
                const colIndexStr = cellG.getAttribute('column-index'); const colIndex = parseInt(colIndexStr, 10);
                const totalForColumn = lastKnownTotals[colIndex]; processCellForInline(cellG, colIndex, totalForColumn);
            });
        }
    }

    window.ga4Optimizer.percentages._debouncedScrollHandler = debounce(handleScroll, SCROLL_DEBOUNCE_DELAY);

    window.ga4Optimizer.percentages.runCalculation = function() { /* ... (same as 11.6, calls this feature's findTotals) ... */
        if (!window.ga4Optimizer.featureStates.percentagesEnabled) { this.removeAndReset(); return; }
		if (!initializedLogShown) { if (window.ga4Optimizer?.debugModeEnabled) { console.log("GA4 Optimizer: Percentage Feature ACTIVATED (v11.7)."); } initializedLogShown = true; }
        findTotalsAndMetricsAndWidths((totalsAreNowAvailable) => {
            logPercDebug(`runCalculation callback: totalsAreNowAvailable = ${totalsAreNowAvailable}`);
            const processedTableContainer = tableContainerElement;
            if (!processedTableContainer || !document.body.contains(processedTableContainer)) {
                logPercDebug("runCalculation callback: Table container for this callback context is gone. Aborting.");
                if (scrollListenerAttachedTo && !document.body.contains(scrollListenerAttachedTo)) { try { scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler); } catch(e){} scrollListenerAttachedTo = null; scrollContainerElement = null;}
                return;
            }
            if (totalsAreNowAvailable && totalsCacheIsValidForCurrentTable && processedTableContainer === tableContainerForWhichTotalsAreValid) {
                setTimeout(handleScroll, 0); const currentScrollContainer = processedTableContainer.querySelector(SCROLL_CONTAINER_SELECTOR);
                if (currentScrollContainer) {
                    if (scrollListenerAttachedTo !== currentScrollContainer) { if (scrollListenerAttachedTo) { try {scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);} catch(e){} } scrollContainerElement = currentScrollContainer; scrollContainerElement.addEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler); scrollListenerAttachedTo = scrollContainerElement; logPercDebug("Scroll listener attached/updated for table:", processedTableContainer.outerHTML.substring(0,100)); }
                } else {  if (scrollListenerAttachedTo) { try {scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);} catch(e){} logPercDebug("Scroll listener removed (no scroll container).");} scrollContainerElement = null; scrollListenerAttachedTo = null; }
            } else {  warnPercDebug("Totals not available or cache invalid for current table after findTotals. Ensuring cleanup. Processed Table:", processedTableContainer.outerHTML.substring(0,100) , "Valid Table:", tableContainerForWhichTotalsAreValid ? tableContainerForWhichTotalsAreValid.outerHTML.substring(0,100) : "null");
                if (document.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)) removeExistingPercentageElements();
                if (scrollListenerAttachedTo) { try {scrollListenerAttachedTo.removeEventListener('scroll', window.ga4Optimizer.percentages._debouncedScrollHandler);} catch(e){} logPercDebug("Scroll listener removed (totals unavailable or cache invalid).");}
                scrollContainerElement = null; scrollListenerAttachedTo = null;
            }
        });
    };

})(); // End of IIFE
;