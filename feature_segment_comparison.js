/**
 * feature_segment_comparison.js - Logic for Segment Variation Comparison feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 2.8.4 - Skips "CR vs Control" (but not "Count vs Control") on "Totals" row.
 * - getSegCompData sets crDiffResult to null if cellG is on the totals row.
 */
(function() { // Start of IIFE
    window.ga4Optimizer = window.ga4Optimizer || {};
    if (window.ga4Optimizer && window.ga4Optimizer.debugModeEnabled) {
        console.log("GA4 Optimizer (Seg Comp v2.8.4): Script EXECUTING.");
    }

    window.ga4Optimizer.segmentComparison = {
        columnDimensionMap: new Map(),
        segmentComparisonTotals: new Map(),
        isFindingSegCompTotals: false,
        GROUP_PREFIX: 'VAR-',
        CONTROL_PREFIX: 'VAR-Control',
        segCompTotalsCacheIsValidForCurrentTable: false,
        segCompTableContainerForWhichTotalsAreValid: null
    };

    const logSegCompDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Seg Comp v2.8.4):", ...args); };
    const warnSegCompDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Seg Comp v2.8.4):", ...args); };
    const errorSegComp = (...args) => { console.error("GA4 Optimizer (Seg Comp v2.8.4):", ...args); };

    const TABLE_CONTAINER_SELECTOR = 'div.aplos-chart-container';
    const CELL_VALUE_SELECTOR = 'text:last-of-type';
    const COLUMN_HEADERS_WRAPPER_SELECTOR = 'div.column-headers-wrapper';
    const COLUMN_HEADER_ROWS_SELECTOR = `${COLUMN_HEADERS_WRAPPER_SELECTOR} g.column-header-row`;
    const HEADER_CELL_SELECTOR = 'g.header-value[column-header-column-index]';
    const HEADER_CELL_TEXT_ELEMENTS_SELECTOR = 'text';
    const SEGMENT_DIM_KEY = 'segment';
    const METRIC_DIM_KEY = 'metric';
    const TOTAL_ROW_CELL_SELECTOR = 'div.cells-wrapper g.cell[row-index="0"][column-index]';
    const TOTAL_VALUE_TEXT_SELECTOR = 'text:not(.percent-of-total)';
    const RETRY_DELAY_TOTALS = 600;
    const MAX_RETRIES_TOTALS = 7;
    const NOT_SET_SEGMENT = '(not set)';

    const TOTALS_NEED_CAPTURE_MESSAGE = "Scroll up to capture Column's Total";
    const TOTALS_ROW_INDEX = "0";


    let tableContainerElement = null;
    let initializedLogShown = false;
    let lastParsedHeaderSignature = '';


    function parseCellValue(text) { /* ... (same as 2.8.3) ... */
        if (typeof text !== 'string') return NaN;
        const cleanedText = text.replace(/[,%$€£¥]/g, '').trim();
        if (cleanedText === '' || cleanedText === '-' || cleanedText.includes('–')) return NaN;
        const value = parseFloat(cleanedText);
        return isNaN(value) ? NaN : value;
    }
    function decodeHtmlEntities(encodedString) { /* ... (same as 2.8.3) ... */
        if (!encodedString || typeof encodedString !== 'string') return encodedString;
        try { const textarea = document.createElement('textarea'); textarea.innerHTML = encodedString; return textarea.value; }
        catch (e) { warnSegCompDebug("Error decoding HTML entities:", e, "Input:", encodedString); return encodedString; }
    }
    function attemptSegCompRetry(reason, callback, retryCount) { /* ... (same as 2.8.3) ... */
        const { segmentComparison } = window.ga4Optimizer;
        if (retryCount < MAX_RETRIES_TOTALS) {
            logSegCompDebug(`Retrying segCompTotals... (${retryCount + 1}/${MAX_RETRIES_TOTALS}). Reason: ${reason}`);
            setTimeout(() => { updateColumnTotalsForSegComp(callback, retryCount + 1); }, RETRY_DELAY_TOTALS);
        } else {
            warnSegCompDebug(`updateColumnTotalsForSegComp: FAILED after ${MAX_RETRIES_TOTALS} retries. Reason: ${reason}.`);
            segmentComparison.isFindingSegCompTotals = false;
            segmentComparison.segmentComparisonTotals.clear();
            segmentComparison.segCompTotalsCacheIsValidForCurrentTable = false;
            segmentComparison.segCompTableContainerForWhichTotalsAreValid = null;
            if (callback) callback(false);
        }
    }
    function updateColumnTotalsForSegComp(callback, retryCount = 0) { /* ... (same as 2.8.3) ... */
        const { segmentComparison } = window.ga4Optimizer;
        if (retryCount === 0) {
            segmentComparison.isFindingSegCompTotals = true;
        }

        const currentAttemptTableContainer = document.querySelector(TABLE_CONTAINER_SELECTOR);
        if (!currentAttemptTableContainer) {
            segmentComparison.isFindingSegCompTotals = false;
            if (segmentComparison.segCompTotalsCacheIsValidForCurrentTable) {
                logSegCompDebug("updateColumnTotalsForSegComp: Table container disappeared. Invalidating previous cache.");
            }
            segmentComparison.segmentComparisonTotals.clear();
            segmentComparison.segCompTotalsCacheIsValidForCurrentTable = false;
            segmentComparison.segCompTableContainerForWhichTotalsAreValid = null;
            tableContainerElement = null;
            if (callback) callback(false);
            return;
        }
        tableContainerElement = currentAttemptTableContainer;

        if (tableContainerElement !== segmentComparison.segCompTableContainerForWhichTotalsAreValid) {
            logSegCompDebug("updateColumnTotalsForSegComp: Table context changed. Invalidating previous segComp totals cache.");
            segmentComparison.segmentComparisonTotals.clear();
            segmentComparison.segCompTotalsCacheIsValidForCurrentTable = false;
        }

        let currentTotals = new Map();
        let totalsParsedCount = 0;
        let indicesFound = [];
        const totalRowCells = tableContainerElement.querySelectorAll(TOTAL_ROW_CELL_SELECTOR);

        if (totalRowCells && totalRowCells.length > 0) {
            totalRowCells.forEach(totalCellG => {
                const colIndexStr = totalCellG.getAttribute('column-index'); if (colIndexStr === null) return;
                const colIndex = parseInt(colIndexStr, 10); if (isNaN(colIndex)) return;
                indicesFound.push(colIndex);
                let totalValueElement = totalCellG.querySelector(TOTAL_VALUE_TEXT_SELECTOR);
                if (!totalValueElement) totalValueElement = totalCellG.querySelector('text:last-of-type');
                const totalValue = totalValueElement ? parseCellValue(totalValueElement.textContent) : NaN;
                if (!isNaN(totalValue)) { currentTotals.set(colIndex, totalValue); totalsParsedCount++; }
                else { currentTotals.set(colIndex, null); }
            });

            if (indicesFound.length > 0 && totalsParsedCount > 0) {
                segmentComparison.isFindingSegCompTotals = false;
                let changed = segmentComparison.segmentComparisonTotals.size !== currentTotals.size;
                if (!changed) {
                    for (const [key, value] of currentTotals) {
                        if (segmentComparison.segmentComparisonTotals.get(key) !== value) { changed = true; break; }
                    }
                }
                if (changed || !segmentComparison.segCompTotalsCacheIsValidForCurrentTable || tableContainerElement !== segmentComparison.segCompTableContainerForWhichTotalsAreValid) {
                    segmentComparison.segmentComparisonTotals = currentTotals;
                    logSegCompDebug("SegComp totals updated/established from DOM for current table:", tableContainerElement.outerHTML.substring(0,100) , new Map(segmentComparison.segmentComparisonTotals));
                } else {
                    logSegCompDebug("SegComp totals confirmed from DOM, same as cache for current table:", tableContainerElement.outerHTML.substring(0,100));
                }
                segmentComparison.segCompTotalsCacheIsValidForCurrentTable = true;
                segmentComparison.segCompTableContainerForWhichTotalsAreValid = tableContainerElement;
                if (callback) callback(true);
                return;
            } else if (indicesFound.length > 0 && totalsParsedCount === 0) {
                if (segmentComparison.segCompTotalsCacheIsValidForCurrentTable && tableContainerElement === segmentComparison.segCompTableContainerForWhichTotalsAreValid) {
                    logSegCompDebug("updateColumnTotalsForSegComp: Total cells present but unparsable. Cache was valid for THIS table. Clearing & failing.");
                    segmentComparison.segmentComparisonTotals.clear();
                    segmentComparison.segCompTotalsCacheIsValidForCurrentTable = false;
                    segmentComparison.segCompTableContainerForWhichTotalsAreValid = null;
                    segmentComparison.isFindingSegCompTotals = false;
                    if (callback) callback(false);
                    return;
                } else {
                    attemptSegCompRetry("Total cells found, but no numeric values parsed. No valid prior cache for this table or context changed.", callback, retryCount);
                    return;
                }
            } else {
                 attemptSegCompRetry("No specific column indices found in total row cells. Cache invalid or empty.", callback, retryCount);
                 return;
            }
        } else {
            if (segmentComparison.segCompTotalsCacheIsValidForCurrentTable &&
                tableContainerElement === segmentComparison.segCompTableContainerForWhichTotalsAreValid &&
                segmentComparison.segmentComparisonTotals.size > 0) {
                logSegCompDebug("updateColumnTotalsForSegComp: Total row query empty, trusting VALID cache for CURRENT table.");
                segmentComparison.isFindingSegCompTotals = false;
                if (callback) callback(true);
                return;
            } else {
                if (segmentComparison.segCompTotalsCacheIsValidForCurrentTable && tableContainerElement !== segmentComparison.segCompTableContainerForWhichTotalsAreValid) {
                    logSegCompDebug("updateColumnTotalsForSegComp: Total row query empty. Cache was for DIFFERENT table. Invalidating and retrying.");
                }
                attemptSegCompRetry("Total row cells query empty. Cache invalid, empty, or for different table.", callback, retryCount);
                return;
            }
        }
    }
    function getInternalPercentageOfColumnTotal(cellG) { /* ... (same as 2.8.3) ... */
        if (!cellG) return null;
        const { segmentComparison } = window.ga4Optimizer;
        const currentCellTableContainer = cellG.closest(TABLE_CONTAINER_SELECTOR);

        if (!segmentComparison.segCompTotalsCacheIsValidForCurrentTable ||
            currentCellTableContainer !== segmentComparison.segCompTableContainerForWhichTotalsAreValid ||
            segmentComparison.segmentComparisonTotals.size === 0) {
            logSegCompDebug("getInternalPercentageOfColumnTotal: Totals cache not valid for current cell context or empty. Needs capture.");
            return TOTALS_NEED_CAPTURE_MESSAGE;
        }

        const colIndexStr = cellG.getAttribute('column-index');
        const colIndex = parseInt(colIndexStr, 10);
        if (isNaN(colIndex)) return null;

        const totalValue = segmentComparison.segmentComparisonTotals.get(colIndex);
        if (totalValue === undefined || totalValue === null) {
            logSegCompDebug("getInternalPercentageOfColumnTotal: Total for column " + colIndex + " missing in cache.");
            return TOTALS_NEED_CAPTURE_MESSAGE;
        }
        if (totalValue === 0 || isNaN(totalValue)) {
            logSegCompDebug("getInternalPercentageOfColumnTotal: Total for column " + colIndex + " is zero or NaN.");
            return null;
        }

        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        if (!cellTextElement) return null;
        const cellValue = parseCellValue(cellTextElement.textContent);
        if (isNaN(cellValue)) return null;
        return cellValue / totalValue;
    }

    window.ga4Optimizer.segmentComparison.getSegCompData = function(cellG) {
        logSegCompDebug("getSegCompData called for cell:", cellG);
        if (!window.ga4Optimizer.featureStates.segmentComparisonEnabled) {
            logSegCompDebug("getSegCompData: Feature disabled.");
            return null;
        }
        if (!cellG) {
            logSegCompDebug("getSegCompData: cellG is null.");
            return null;
        }

        const rowIndex = cellG.getAttribute('row-index');
        const isTotalsRow = (rowIndex === TOTALS_ROW_INDEX); // Check if it's the totals row

        if (isTotalsRow) {
            logSegCompDebug("getSegCompData: Hovered cell is on the Totals row. CR comparison will be skipped.");
        }

        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        const { columnDimensionMap, GROUP_PREFIX, CONTROL_PREFIX } = window.ga4Optimizer.segmentComparison;
        if (columnDimensionMap.size === 0 || !cellTextElement) {
            logSegCompDebug("getSegCompData: columnDimensionMap empty or cellTextElement missing.");
            return null;
        }

        const hoveredColIndexStr = cellG.getAttribute('column-index');
        const hoveredColIndex = parseInt(hoveredColIndexStr, 10);
        const hoveredDimensions = columnDimensionMap.get(hoveredColIndex);
        if (!hoveredDimensions || !hoveredDimensions[SEGMENT_DIM_KEY] || !hoveredDimensions[METRIC_DIM_KEY] || !hoveredDimensions[SEGMENT_DIM_KEY].startsWith(GROUP_PREFIX)) {
            logSegCompDebug("getSegCompData: Hovered cell not a variant or dimensions missing.");
            return null;
        }
        const hoveredSegmentName = hoveredDimensions[SEGMENT_DIM_KEY];
        if (hoveredSegmentName.startsWith(CONTROL_PREFIX)) {
            logSegCompDebug("getSegCompData: Hovered cell is a control segment.");
            return null;
        }
        const hoveredMetric = hoveredDimensions[METRIC_DIM_KEY];
        let controlColIndex = -1;
        for (const [colIndex, dimensions] of columnDimensionMap.entries()) {
            if (colIndex === hoveredColIndex) continue;
            const isControlSegment = dimensions[SEGMENT_DIM_KEY] && dimensions[SEGMENT_DIM_KEY].startsWith(CONTROL_PREFIX);
            const isMatchingMetric = dimensions[METRIC_DIM_KEY] === hoveredMetric;
            if (isControlSegment && isMatchingMetric) { controlColIndex = colIndex; break; }
        }
        if (controlColIndex === -1) {
            logSegCompDebug("getSegCompData: No control column found.");
            return null;
        }

        let activeTableForData = tableContainerElement;
        if (!activeTableForData || !document.body.contains(activeTableForData)) {
            activeTableForData = cellG.closest(TABLE_CONTAINER_SELECTOR);
        }
        if (!activeTableForData) {
            errorSegComp("getSegCompData: CRITICAL - Could not determine active table container.");
            return null;
        }
        logSegCompDebug("getSegCompData: Using table for data query:", activeTableForData.outerHTML.substring(0,100));

        const controlCellSelector = `div.cells-wrapper g.cell[row-index="${rowIndex}"][column-index="${controlColIndex}"]`;
        const controlCellGroup = activeTableForData.querySelector(controlCellSelector);
        const controlTextElement = controlCellGroup ? controlCellGroup.querySelector(CELL_VALUE_SELECTOR) : null;
        if (!controlCellGroup || !controlTextElement) {
            logSegCompDebug("getSegCompData: Control cell or text not found using selector:", controlCellSelector, "on table:", activeTableForData);
            return null;
        }

        const variantValue = parseCellValue(cellTextElement.textContent);
        const controlValue = parseCellValue(controlTextElement.textContent);
        let countDiffResult = null;
        if (isNaN(variantValue)) { /* no-op */ }
        else if (isNaN(controlValue)) { countDiffResult = 'Control N/A'; }
        else if (controlValue === 0) {
            if (variantValue > 0) countDiffResult = '+Inf% vs Control (Base=0)';
            else if (variantValue < 0) countDiffResult = '-Inf% vs Control (Base=0)';
            else countDiffResult = 0;
        }
        else { countDiffResult = (variantValue - controlValue) / Math.abs(controlValue); }

        let crDiffResult = null;
        if (isTotalsRow) {
            crDiffResult = null; // Explicitly skip CR calculation for Totals row
            logSegCompDebug("CR vs Control skipped for Totals row.");
        } else {
            const variantCR = getInternalPercentageOfColumnTotal(cellG);
            const controlCR = getInternalPercentageOfColumnTotal(controlCellGroup);
            logSegCompDebug(`CRs - Variant: ${variantCR}, Control: ${controlCR}`);

            if (variantCR === TOTALS_NEED_CAPTURE_MESSAGE || controlCR === TOTALS_NEED_CAPTURE_MESSAGE) {
                crDiffResult = TOTALS_NEED_CAPTURE_MESSAGE;
            } else if (typeof variantCR !== 'number' || isNaN(variantCR) || !isFinite(variantCR)) {
                crDiffResult = 'Variant CR N/A';
            } else if (typeof controlCR !== 'number' || isNaN(controlCR) || !isFinite(controlCR)) {
                crDiffResult = 'Control CR N/A';
            } else if (controlCR === 0) {
                 if (variantCR > 0) crDiffResult = '+Inf% CR vs Control (Base=0)';
                 else if (variantCR < 0) crDiffResult = '-Inf% CR vs Control (Base=0)';
                 else crDiffResult = 0;
            } else {
                 crDiffResult = (variantCR - controlCR) / Math.abs(controlCR);
            }
        }

        if (countDiffResult !== null || crDiffResult !== null) {
            logSegCompDebug("getSegCompData: Returning data:", { countDiff: countDiffResult, crDiff: crDiffResult });
            return { countDiff: countDiffResult, crDiff: crDiffResult };
        }
        logSegCompDebug("getSegCompData: No valid diffs, returning null.");
        return null;
    };

    function extractHeaderText(headerCellElement) { /* ... (same as 2.8.3) ... */
        let headerText = headerCellElement.getAttribute('title')?.trim();
        if (headerText) return decodeHtmlEntities(headerText);
        const rectPane = headerCellElement.querySelector('rect.cellPane');
        if (rectPane) {
            headerText = rectPane.getAttribute('title')?.trim();
            if (headerText) return decodeHtmlEntities(headerText);
            const tooltipHTML = rectPane.getAttribute('tooltip-html')?.trim();
            if (tooltipHTML) {
                try {
                    const tempDiv = document.createElement('div'); tempDiv.innerHTML = tooltipHTML;
                    tempDiv.querySelector('p.ga-help-popup-subtitle')?.remove(); tempDiv.querySelector('.screenreader-information')?.remove();
                    tempDiv.querySelectorAll('style, script')?.forEach(el => el.remove());
                    headerText = tempDiv.textContent?.trim() || '';
                    if (headerText) return decodeHtmlEntities(headerText);
                } catch (e) { warnSegCompDebug("Error parsing tooltip-html:", e, "HTML:", tooltipHTML); headerText = ''; }
            }
        }
        const textElements = Array.from(headerCellElement.querySelectorAll(`:scope > ${HEADER_CELL_TEXT_ELEMENTS_SELECTOR}`));
        if (textElements.length > 0) {
            textElements.sort((a, b) => {
                const yA = parseFloat(a.getAttribute('y') || 0); const yB = parseFloat(b.getAttribute('y') || 0); if (yA !== yB) return yA - yB;
                const xA = parseFloat(a.getAttribute('x') || 0); const xB = parseFloat(b.getAttribute('x') || 0); return xA - xB;
            });
            headerText = textElements.map(te => te.textContent?.trim()).filter(Boolean).join(' ');
            return decodeHtmlEntities(headerText.replace(/\s+/g, ' ').trim());
        }
        headerText = headerCellElement.textContent?.trim() || '';
        return decodeHtmlEntities(headerText.replace(/\s+/g, ' ').trim());
    }
    function parseColumnHeaders(containerForHeaders) { /* ... (same as 2.8.3) ... */
        logSegCompDebug("parseColumnHeaders called for container:", containerForHeaders.outerHTML.substring(0,100));
        const newDimensionMap = new Map();
        let currentSignature = '';
        const columnHeaderRows = containerForHeaders.querySelectorAll(COLUMN_HEADER_ROWS_SELECTOR);
        const headerRowCount = columnHeaderRows.length;
        if (!columnHeaderRows || headerRowCount === 0) {
             warnSegCompDebug("parseColumnHeaders: No header rows found.");
             return { parsedMap: newDimensionMap, signature: currentSignature };
        }
        const segmentRowIndex = 0;
        const metricRowIndex = (headerRowCount > 1) ? 1 : 0;
        const primaryHeaderRowForIndices = columnHeaderRows[metricRowIndex] || columnHeaderRows[segmentRowIndex];
        const allPossibleColIndices = new Set();
        primaryHeaderRowForIndices?.querySelectorAll(HEADER_CELL_SELECTOR).forEach(cell => {
            const colIndexStr = cell.getAttribute('column-header-column-index');
            const colIndex = parseInt(colIndexStr, 10);
            if (!isNaN(colIndex)) { allPossibleColIndices.add(colIndex); }
        });
        const sortedColIndices = Array.from(allPossibleColIndices).sort((a, b) => a - b);
        let tempSegmentHeaders = {}; let tempMetricHeaders = {};
        sortedColIndices.forEach(colIndex => {
            const segmentCell = columnHeaderRows[segmentRowIndex]?.querySelector(`${HEADER_CELL_SELECTOR}[column-header-column-index="${colIndex}"]`);
            if (segmentCell) { tempSegmentHeaders[colIndex] = extractHeaderText(segmentCell); }
            else { tempSegmentHeaders[colIndex] = NOT_SET_SEGMENT; }
            if (headerRowCount > 1) {
                const metricCell = columnHeaderRows[metricRowIndex]?.querySelector(`${HEADER_CELL_SELECTOR}[column-header-column-index="${colIndex}"]`);
                if (metricCell) { tempMetricHeaders[colIndex] = extractHeaderText(metricCell); }
            } else { tempMetricHeaders[colIndex] = tempSegmentHeaders[colIndex]; }
        });
        let currentSegmentName = NOT_SET_SEGMENT;
        for (const colIndex of sortedColIndices) {
            let actualSegmentName = tempSegmentHeaders[colIndex];
            if ((!actualSegmentName || actualSegmentName === NOT_SET_SEGMENT) && currentSegmentName !== NOT_SET_SEGMENT) {
                actualSegmentName = currentSegmentName;
            } else if (actualSegmentName && actualSegmentName !== NOT_SET_SEGMENT) {
                currentSegmentName = actualSegmentName;
            }
            let metricName = tempMetricHeaders[colIndex];
            if (headerRowCount === 1) { actualSegmentName = NOT_SET_SEGMENT; }
            if (metricName && metricName.trim() !== "") {
                 newDimensionMap.set(colIndex, { [SEGMENT_DIM_KEY]: actualSegmentName, [METRIC_DIM_KEY]: metricName });
                 currentSignature += `|${colIndex}:${actualSegmentName}:${metricName}`;
            } else { warnSegCompDebug(`parseColumnHeaders: Col ${colIndex} missing metric. Seg: "${actualSegmentName}", Metric: "${metricName}"`);}
        }
        logSegCompDebug("FINAL Parsed columnDimensionMap:", new Map(newDimensionMap), "FINAL Signature:", currentSignature);
        return { parsedMap: newDimensionMap, signature: currentSignature };
    }
    window.ga4Optimizer.segmentComparison.remove = function() { /* ... (same as 2.8.3) ... */
        const { segmentComparison } = window.ga4Optimizer;
        segmentComparison.columnDimensionMap.clear();
        segmentComparison.segmentComparisonTotals.clear();
        segmentComparison.isFindingSegCompTotals = false;
        segmentComparison.segCompTotalsCacheIsValidForCurrentTable = false;
        segmentComparison.segCompTableContainerForWhichTotalsAreValid = null;
        lastParsedHeaderSignature = '';
        tableContainerElement = null;
        initializedLogShown = false;
        logSegCompDebug("SegComp state reset, totals cache invalidated.");
    };
    window.ga4Optimizer.segmentComparison.runCalculation = function() { /* ... (same as 2.8.3) ... */
        logSegCompDebug("runCalculation called.");
        if (!initializedLogShown) {
            if (window.ga4Optimizer?.debugModeEnabled) {
                console.log("GA4 Optimizer: Segment Comparison Feature ACTIVATED (v2.8.4).");
            }
            initializedLogShown = true;
        }

        const localTableContainerForRun = document.querySelector(TABLE_CONTAINER_SELECTOR);
        if (!localTableContainerForRun) {
            logSegCompDebug("runCalculation: No table container found. Attempting reset.");
            if (window.ga4Optimizer.segmentComparison.columnDimensionMap.size > 0 ||
                window.ga4Optimizer.segmentComparison.segmentComparisonTotals.size > 0 ||
                window.ga4Optimizer.segmentComparison.segCompTotalsCacheIsValidForCurrentTable) {
                this.remove();
            }
            tableContainerElement = null;
            return;
        }
        tableContainerElement = localTableContainerForRun;

        const { parsedMap, signature } = parseColumnHeaders(localTableContainerForRun);

        if (parsedMap.size === 0) {
            logSegCompDebug("runCalculation: No valid columns parsed from headers. Resetting.");
             if (window.ga4Optimizer.segmentComparison.columnDimensionMap.size > 0 ||
                 window.ga4Optimizer.segmentComparison.segmentComparisonTotals.size > 0 ||
                 window.ga4Optimizer.segmentComparison.segCompTotalsCacheIsValidForCurrentTable) {
                 this.remove();
             }
            return;
        }

        if (signature !== lastParsedHeaderSignature) {
            lastParsedHeaderSignature = signature;
            window.ga4Optimizer.segmentComparison.columnDimensionMap = parsedMap;
            logSegCompDebug("Headers changed, columnDimensionMap updated.");
            window.ga4Optimizer.segmentComparison.segCompTotalsCacheIsValidForCurrentTable = false;
            window.ga4Optimizer.segmentComparison.segCompTableContainerForWhichTotalsAreValid = null;
        }

        updateColumnTotalsForSegComp((totalsSuccess) => {
            if (totalsSuccess) {
                logSegCompDebug("runCalculation: updateColumnTotalsForSegComp reported success for table:", tableContainerElement ? tableContainerElement.outerHTML.substring(0,100) : "null");
            } else {
                warnSegCompDebug("runCalculation: updateColumnTotalsForSegComp reported failure or totals not available for table:", tableContainerElement ? tableContainerElement.outerHTML.substring(0,100) : "null");
            }
        });
        logSegCompDebug("runCalculation completed initiation of header parsing and totals update.");
    };

})(); // End of IIFE