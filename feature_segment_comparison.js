/**
 * feature_segment_comparison.js - Logic for Segment Variation Comparison feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 2.7.2 - Correctly propagate segment names across multiple metric columns.
 * - Enhanced logging for multi-metric debugging.
 * - Correctly match METRIC when finding control column for multi-metric tables.
 * - Improved header parsing for responsiveness on smaller screens.
 * - Made independent of feature_percentages.js for CR calculation.
 */
(function() { // Start of IIFE
    // console.log("GA4 Optimizer: Segment Comparison Feature script EXECUTING (v2.7.2).");

    // --- Feature Namespace & Configuration ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.segmentComparison = {
        columnDimensionMap: new Map(),
        segmentComparisonTotals: new Map(),
        isFindingSegCompTotals: false,
        GROUP_PREFIX: 'VAR-',
        CONTROL_PREFIX: 'VAR-Control'
    };

    // --- Debug Logging Helper ---
    const logSegCompDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Seg Comp v2.7.2):", ...args); };
    const warnSegCompDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Seg Comp v2.7.2):", ...args); };
    const errorSegComp = (...args) => { console.error("GA4 Optimizer (Seg Comp v2.7.2):", ...args); };

    // --- Configuration ---
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
    const NOT_SET_SEGMENT = '(not set)'; // Constant for clarity

    // --- Feature State ---
    let tableContainerElement = null;
    let initializedLogShown = false;
    let lastParsedHeaderSignature = '';

    // --- Helper Functions ---
    function parseCellValue(text) {
      if (typeof text !== 'string') return NaN;
      const cleanedText = text.replace(/[,%$€£¥]/g, '').trim();
      if (cleanedText === '' || cleanedText === '-' || cleanedText.includes('–')) return NaN;
      const value = parseFloat(cleanedText);
      return isNaN(value) ? NaN : value;
    }

    function decodeHtmlEntities(encodedString) {
        if (!encodedString || typeof encodedString !== 'string') return encodedString;
        try {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = encodedString;
            return textarea.value;
        } catch (e) {
            warnSegCompDebug("Error decoding HTML entities:", e, "Input:", encodedString);
            return encodedString;
        }
    }

    function updateColumnTotalsForSegComp(retryCount = 0) {
        const { segmentComparison } = window.ga4Optimizer;
        if (segmentComparison.isFindingSegCompTotals && retryCount === 0) return false;
        if (retryCount === 0) {
            segmentComparison.isFindingSegCompTotals = true;
            if (!tableContainerElement) tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
            if (!tableContainerElement) {
                warnSegCompDebug("updateColumnTotals: Table container not found.");
                segmentComparison.isFindingSegCompTotals = false;
                return false;
            }
        }
        let currentTotals = new Map();
        let totalsParsedCount = 0;
        let needsRetry = false;
        let retryReason = "";
        const totalRowCells = tableContainerElement.querySelectorAll(TOTAL_ROW_CELL_SELECTOR);
        if (totalRowCells && totalRowCells.length > 0) {
            totalRowCells.forEach(totalCellG => {
                const colIndexStr = totalCellG.getAttribute('column-index');
                if (colIndexStr === null) return;
                const colIndex = parseInt(colIndexStr, 10);
                if (isNaN(colIndex)) return;
                let totalValueElement = totalCellG.querySelector(TOTAL_VALUE_TEXT_SELECTOR);
                if (!totalValueElement) totalValueElement = totalCellG.querySelector('text:last-of-type');
                const totalValue = totalValueElement ? parseCellValue(totalValueElement.textContent) : NaN;
                if (!isNaN(totalValue)) {
                    currentTotals.set(colIndex, totalValue);
                    totalsParsedCount++;
                } else {
                    currentTotals.set(colIndex, null);
                }
            });
            if (totalsParsedCount === 0 && totalRowCells.length > 0) {
                needsRetry = true;
                retryReason = "Found total cells but failed to parse any values.";
            }
        } else {
            needsRetry = true;
            retryReason = "Total row cells query returned empty.";
        }
        if (needsRetry) {
            if (retryCount < MAX_RETRIES_TOTALS) {
                setTimeout(() => { updateColumnTotalsForSegComp(retryCount + 1); }, RETRY_DELAY_TOTALS);
                return false;
            }
            warnSegCompDebug(`updateColumnTotals: Failed after ${MAX_RETRIES_TOTALS} retries. Reason: ${retryReason}`);
            segmentComparison.isFindingSegCompTotals = false;
            return false;
        }
        segmentComparison.isFindingSegCompTotals = false;
        let changed = segmentComparison.segmentComparisonTotals.size !== currentTotals.size;
        if (!changed) {
            for (const [key, value] of currentTotals) {
                if (segmentComparison.segmentComparisonTotals.get(key) !== value) {
                    changed = true;
                    break;
                }
            }
        }
        if (changed) {
            segmentComparison.segmentComparisonTotals = currentTotals;
            return true;
        }
        return false;
    }

    function getInternalPercentageOfColumnTotal(cellG) {
        if (!cellG) return null;
        const { segmentComparison } = window.ga4Optimizer;
        const colIndexStr = cellG.getAttribute('column-index');
        const colIndex = parseInt(colIndexStr, 10);
        if (isNaN(colIndex)) return null;
        const totalValue = segmentComparison.segmentComparisonTotals.get(colIndex);
        if (totalValue === undefined || totalValue === null || totalValue === 0 || isNaN(totalValue)) return null;
        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        if (!cellTextElement) return null;
        const cellValue = parseCellValue(cellTextElement.textContent);
        if (isNaN(cellValue)) return null;
        return cellValue / totalValue;
    }

    window.ga4Optimizer.segmentComparison.getSegCompData = function(cellG) {
        if (!window.ga4Optimizer.debugModeEnabled) { /* Only run detailed logs if debug is on */ }
        else { console.log("-------------------------------------------------- GETSEGCOMPDATA START"); }

        logSegCompDebug("getSegCompData triggered for cell:", cellG);
        if (!cellG) return null;
        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        const { columnDimensionMap, GROUP_PREFIX, CONTROL_PREFIX } = window.ga4Optimizer.segmentComparison;
        // logSegCompDebug("Current columnDimensionMap:", new Map(columnDimensionMap));
        if (columnDimensionMap.size === 0 || !cellTextElement) {
            logSegCompDebug("Bailing: columnDimensionMap empty or cellTextElement missing.");
            return null;
        }
        const rowIndex = cellG.getAttribute('row-index');
        const hoveredColIndexStr = cellG.getAttribute('column-index');
        const hoveredColIndex = parseInt(hoveredColIndexStr, 10);
        const hoveredDimensions = columnDimensionMap.get(hoveredColIndex);
        logSegCompDebug(`Hovered cell: rowIndex=${rowIndex}, colIndex=${hoveredColIndex}, text="${cellTextElement.textContent?.trim()}"`);
        logSegCompDebug("Dimensions for hovered column (" + hoveredColIndex + "):", hoveredDimensions);
        if (!hoveredDimensions || !hoveredDimensions[SEGMENT_DIM_KEY] || !hoveredDimensions[METRIC_DIM_KEY] || !hoveredDimensions[SEGMENT_DIM_KEY].startsWith(GROUP_PREFIX)) {
            logSegCompDebug("Bailing: Hovered cell not a variant or dimensions missing.");
            return null;
        }
        const hoveredSegmentName = hoveredDimensions[SEGMENT_DIM_KEY];
        if (hoveredSegmentName.startsWith(CONTROL_PREFIX)) {
            logSegCompDebug("Bailing: Hovered cell is a control segment.");
            return null;
        }
        const hoveredMetric = hoveredDimensions[METRIC_DIM_KEY];
        logSegCompDebug(`EXTRACTED - Hovered variant: "${hoveredSegmentName}", Hovered Metric: "${hoveredMetric}"`);
        let controlColIndex = -1;
        logSegCompDebug("Searching for control column...");
        for (const [colIndex, dimensions] of columnDimensionMap.entries()) {
            // logSegCompDebug(`Checking map entry: colIndex=${colIndex}, segment="${dimensions[SEGMENT_DIM_KEY]}", metric="${dimensions[METRIC_DIM_KEY]}"`);
            if (colIndex === hoveredColIndex) continue;
            const isControlSegment = dimensions[SEGMENT_DIM_KEY] && dimensions[SEGMENT_DIM_KEY].startsWith(CONTROL_PREFIX);
            const isMatchingMetric = dimensions[METRIC_DIM_KEY] === hoveredMetric;
            // logSegCompDebug(`...isControlSegment=${isControlSegment}, isMatchingMetric=${isMatchingMetric} (comparing "${dimensions[METRIC_DIM_KEY]}" vs "${hoveredMetric}")`);
            if (isControlSegment && isMatchingMetric) {
                 controlColIndex = colIndex;
                 logSegCompDebug(`CONTROL COLUMN FOUND: index=${controlColIndex}, segment="${dimensions[SEGMENT_DIM_KEY]}", metric="${dimensions[METRIC_DIM_KEY]}"`);
                 break;
            }
        }
        if (controlColIndex === -1) {
            logSegCompDebug(`No control column found for variant "${hoveredSegmentName}" AND metric "${hoveredMetric}"`);
            if (window.ga4Optimizer.debugModeEnabled) { console.log("-------------------------------------------------- GETSEGCOMPDATA END (NULL)"); }
            return null;
        }
        if (!tableContainerElement) {
             tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
             if (!tableContainerElement) { errorSegComp("getSegCompData: Table container not found!"); return null; }
        }
        const controlCellSelector = `div.cells-wrapper g.cell[row-index="${rowIndex}"][column-index="${controlColIndex}"]`;
        const controlCellGroup = tableContainerElement.querySelector(controlCellSelector);
        const controlTextElement = controlCellGroup ? controlCellGroup.querySelector(CELL_VALUE_SELECTOR) : null;
        if (!controlCellGroup || !controlTextElement) {
            logSegCompDebug(`Control cell or text not found: ${controlCellSelector}`);
            if (window.ga4Optimizer.debugModeEnabled) { console.log("-------------------------------------------------- GETSEGCOMPDATA END (NULL)"); }
            return null;
        }
        // logSegCompDebug("Control cell found:", controlCellGroup, "Text:", controlTextElement.textContent?.trim());
        const variantValue = parseCellValue(cellTextElement.textContent);
        const controlValue = parseCellValue(controlTextElement.textContent);
        // logSegCompDebug(`Values - Variant: ${variantValue}, Control: ${controlValue}`);
        let countDiffResult = null;
        if (isNaN(variantValue)) { /* no-op */ }
        else if (isNaN(controlValue)) { countDiffResult = 'Control N/A'; }
        else if (controlValue === 0) {
            if (variantValue > 0) countDiffResult = '+Inf% vs Control (Base=0)';
            else if (variantValue < 0) countDiffResult = '-Inf% vs Control (Base=0)';
            else countDiffResult = 0;
        } else {
            countDiffResult = (variantValue - controlValue) / Math.abs(controlValue);
        }
        // logSegCompDebug("Count Diff Result:", countDiffResult);
        let crDiffResult = null;
        const variantCR = getInternalPercentageOfColumnTotal(cellG);
        const controlCR = getInternalPercentageOfColumnTotal(controlCellGroup);
        // logSegCompDebug(`CRs - Variant: ${variantCR}, Control: ${controlCR}`);
        if (typeof variantCR !== 'number' || isNaN(variantCR) || !isFinite(variantCR)) {
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
        // logSegCompDebug("CR Diff Result:", crDiffResult);
        if (countDiffResult !== null || crDiffResult !== null) {
            // logSegCompDebug("RETURNING DATA:", { countDiff: countDiffResult, crDiff: crDiffResult });
            if (window.ga4Optimizer.debugModeEnabled) { console.log("-------------------------------------------------- GETSEGCOMPDATA END (DATA)"); }
            return { countDiff: countDiffResult, crDiff: crDiffResult };
        }
        // logSegCompDebug("RETURNING NULL (no valid diffs calculated)");
        if (window.ga4Optimizer.debugModeEnabled) { console.log("-------------------------------------------------- GETSEGCOMPDATA END (NULL)"); }
        return null;
    };

    function extractHeaderText(headerCellElement) {
        let headerText = headerCellElement.getAttribute('title')?.trim();
        if (headerText) return decodeHtmlEntities(headerText);
        const rectPane = headerCellElement.querySelector('rect.cellPane');
        if (rectPane) {
            headerText = rectPane.getAttribute('title')?.trim();
            if (headerText) return decodeHtmlEntities(headerText);
            const tooltipHTML = rectPane.getAttribute('tooltip-html')?.trim();
            if (tooltipHTML) {
                try {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = tooltipHTML;
                    tempDiv.querySelector('p.ga-help-popup-subtitle')?.remove();
                    tempDiv.querySelector('.screenreader-information')?.remove();
                    tempDiv.querySelectorAll('style, script')?.forEach(el => el.remove());
                    headerText = tempDiv.textContent?.trim() || '';
                    if (headerText) return decodeHtmlEntities(headerText);
                } catch (e) {
                    warnSegCompDebug("Error parsing tooltip-html:", e, "HTML:", tooltipHTML);
                    headerText = '';
                }
            }
        }
        const textElements = Array.from(headerCellElement.querySelectorAll(`:scope > ${HEADER_CELL_TEXT_ELEMENTS_SELECTOR}`));
        if (textElements.length > 0) {
            textElements.sort((a, b) => {
                const yA = parseFloat(a.getAttribute('y') || 0);
                const yB = parseFloat(b.getAttribute('y') || 0);
                if (yA !== yB) return yA - yB;
                const xA = parseFloat(a.getAttribute('x') || 0);
                const xB = parseFloat(b.getAttribute('x') || 0);
                return xA - xB;
            });
            headerText = textElements.map(te => te.textContent?.trim()).filter(Boolean).join(' '); // Filter Boolean to remove empty strings before join
            return decodeHtmlEntities(headerText.replace(/\s+/g, ' ').trim());
        }
        headerText = headerCellElement.textContent?.trim() || '';
        return decodeHtmlEntities(headerText.replace(/\s+/g, ' ').trim());
    }

    function parseColumnHeaders(container) {
        logSegCompDebug("parseColumnHeaders called.");
        const newDimensionMap = new Map();
        let currentSignature = '';
        const columnHeaderRows = container.querySelectorAll(COLUMN_HEADER_ROWS_SELECTOR);
        const headerRowCount = columnHeaderRows.length;
        logSegCompDebug(`Found ${headerRowCount} columnHeaderRows.`);
        if (!columnHeaderRows || headerRowCount === 0) {
             warnSegCompDebug("parseColumnHeaders: No header rows found.");
             return { parsedMap: newDimensionMap, signature: currentSignature };
        }

        const segmentRowIndex = 0;
        const metricRowIndex = (headerRowCount > 1) ? 1 : 0;
        logSegCompDebug(`Segment row index: ${segmentRowIndex}, Metric row index: ${metricRowIndex}`);

        // Step 1: Get all potential column indices from metric row (or segment row if only one header)
        const primaryHeaderRowForIndices = columnHeaderRows[metricRowIndex] || columnHeaderRows[segmentRowIndex];
        const allPossibleColIndices = new Set();
        primaryHeaderRowForIndices?.querySelectorAll(HEADER_CELL_SELECTOR).forEach(cell => {
            const colIndexStr = cell.getAttribute('column-header-column-index');
            const colIndex = parseInt(colIndexStr, 10);
            if (!isNaN(colIndex)) {
                allPossibleColIndices.add(colIndex);
            }
        });
        const sortedColIndices = Array.from(allPossibleColIndices).sort((a, b) => a - b);
        logSegCompDebug("Sorted column indices to process:", sortedColIndices);

        // Step 2: Extract segment and metric texts for these indices
        let tempSegmentHeaders = {}; // { colIndex: segmentName }
        let tempMetricHeaders = {};  // { colIndex: metricName }

        sortedColIndices.forEach(colIndex => {
            const segmentCell = columnHeaderRows[segmentRowIndex]?.querySelector(`${HEADER_CELL_SELECTOR}[column-header-column-index="${colIndex}"]`);
            if (segmentCell) {
                tempSegmentHeaders[colIndex] = extractHeaderText(segmentCell);
            } else {
                tempSegmentHeaders[colIndex] = NOT_SET_SEGMENT; // Default if no cell for this index
            }

            if (headerRowCount > 1) { // Distinct metric row
                const metricCell = columnHeaderRows[metricRowIndex]?.querySelector(`${HEADER_CELL_SELECTOR}[column-header-column-index="${colIndex}"]`);
                if (metricCell) {
                    tempMetricHeaders[colIndex] = extractHeaderText(metricCell);
                }
            } else { // Only one header row, metrics are taken from segment row's text
                tempMetricHeaders[colIndex] = tempSegmentHeaders[colIndex];
            }
        });

        logSegCompDebug("Temporary Segment Headers:", JSON.parse(JSON.stringify(tempSegmentHeaders)));
        logSegCompDebug("Temporary Metric Headers:", JSON.parse(JSON.stringify(tempMetricHeaders)));

        // Step 3: Combine, propagating segment names
        let currentSegmentName = NOT_SET_SEGMENT;
        for (const colIndex of sortedColIndices) {
            let actualSegmentName = tempSegmentHeaders[colIndex];
            // If the extracted segment name for this column is empty or "(not set)",
            // but it's not the very first segment column (where currentSegmentName might still be default),
            // and a previous segment name was established, use that.
            if ((!actualSegmentName || actualSegmentName === NOT_SET_SEGMENT) && currentSegmentName !== NOT_SET_SEGMENT) {
                 // Check if the metric name for this column is different from the previous column's metric
                 // If metric changes, it might signify a new segment group even if segment text is missing.
                 // This part is tricky; for now, let's keep it simpler: if segment text is missing, use carried-over.
                 // A more robust check would involve looking at cell widths or explicit GA4 grouping attributes if they exist.
                actualSegmentName = currentSegmentName;
            } else if (actualSegmentName && actualSegmentName !== NOT_SET_SEGMENT) {
                currentSegmentName = actualSegmentName; // A new segment name is explicitly found
            }


            let metricName = tempMetricHeaders[colIndex];
            if (headerRowCount === 1 && actualSegmentName !== NOT_SET_SEGMENT) { // If only one header row, and we identified a segment
                // The metric name is what we extracted, and the segment name should be '(not set)' conceptually
                // if we are treating the single row as metrics primarily.
                // However, if the single row IS segments, then metric is the same.
                // This logic depends on how GA4 structures single-header-row tables.
                // For now, if headerRowCount === 1, metricHeaders[colIndex] already holds the text.
                // We need to ensure segment name gets correctly set to NOT_SET_SEGMENT if metric row is primary.
                // This part is complex if the single row can be EITHER segments OR metrics.
                // The original logic for headerRowCount === 1 (metricHeaders[colIndex] = segmentHeaders[colIndex]; segmentHeaders[colIndex] = NOT_SET_SEGMENT;)
                // assumed the single row was metrics. Let's stick to that if headerRowCount is 1.
                if (headerRowCount === 1) {
                    actualSegmentName = NOT_SET_SEGMENT; // If only one row, it's metrics, so no real segment.
                }
            }


            if (metricName && metricName.trim() !== "") {
                 newDimensionMap.set(colIndex, {
                     [SEGMENT_DIM_KEY]: actualSegmentName,
                     [METRIC_DIM_KEY]: metricName
                 });
                 currentSignature += `|${colIndex}:${actualSegmentName}:${metricName}`;
            } else {
                 warnSegCompDebug(`parseColumnHeaders: Col ${colIndex} missing or empty metric name. Segment: "${actualSegmentName}", Metric found: "${metricName}"`);
            }
        }
        logSegCompDebug("FINAL Parsed columnDimensionMap:", new Map(newDimensionMap), "FINAL Signature:", currentSignature);
        return { parsedMap: newDimensionMap, signature: currentSignature };
    }

    window.ga4Optimizer.segmentComparison.remove = function() {
        window.ga4Optimizer.segmentComparison.columnDimensionMap.clear();
        window.ga4Optimizer.segmentComparison.segmentComparisonTotals.clear();
        window.ga4Optimizer.segmentComparison.isFindingSegCompTotals = false;
        lastParsedHeaderSignature = '';
        tableContainerElement = null;
        initializedLogShown = false;
    };

    window.ga4Optimizer.segmentComparison.runCalculation = function() {
        if (!initializedLogShown) {
            console.log("GA4 Optimizer: Segment Comparison Feature ACTIVATED (v2.7.2).");
            initializedLogShown = true;
        }
        if (!tableContainerElement || !document.body.contains(tableContainerElement)) {
            tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
            if (!tableContainerElement) {
                if (window.ga4Optimizer.segmentComparison.columnDimensionMap.size > 0 || window.ga4Optimizer.segmentComparison.segmentComparisonTotals.size > 0) {
                    window.ga4Optimizer.segmentComparison.remove();
                }
                return;
            }
        }
        const { parsedMap, signature } = parseColumnHeaders(tableContainerElement);
        if (parsedMap.size === 0) {
             if (window.ga4Optimizer.segmentComparison.columnDimensionMap.size > 0 || window.ga4Optimizer.segmentComparison.segmentComparisonTotals.size > 0) {
                 window.ga4Optimizer.segmentComparison.remove();
             }
            return;
        }
        let headersChanged = false;
        if (signature !== lastParsedHeaderSignature) {
            lastParsedHeaderSignature = signature;
            window.ga4Optimizer.segmentComparison.columnDimensionMap = parsedMap;
            headersChanged = true;
        }
        if (headersChanged || window.ga4Optimizer.segmentComparison.segmentComparisonTotals.size === 0) {
            updateColumnTotalsForSegComp();
        }
    };
})(); // End of IIFE