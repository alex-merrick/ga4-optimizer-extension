/**
 * feature_conversion_rate.js - Logic for Hover Conversion Rate feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 7.4 - Correctly propagate segment names across multiple metric columns.
 * - Correctly match METRIC when finding 'All Users' column for multi-metric tables.
 * - Uses robust header parsing from segment_comparison.
 */
(function() { // Start of IIFE
    // console.log("GA4 Optimizer: Conversion Rate Feature script EXECUTING (v7.4).");

    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.conversionRate = {
        columnDimensionMap: new Map(),
        allUsersSegmentName: 'All Users', // Default, will be updated if found
    };

    // --- Debug Logging Helper ---
    const logCRDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Conv. Rate v7.4):", ...args); };
    const warnCRDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Conv. Rate v7.4):", ...args); };
    const errorCR = (...args) => { console.error("GA4 Optimizer (Conv. Rate v7.4):", ...args); };

    // --- Configuration ---
    const TABLE_CONTAINER_SELECTOR = 'div.aplos-chart-container';
    const CELL_VALUE_SELECTOR = 'text:last-of-type';
    const COLUMN_HEADERS_WRAPPER_SELECTOR = 'div.column-headers-wrapper';
    const COLUMN_HEADER_ROWS_SELECTOR = `${COLUMN_HEADERS_WRAPPER_SELECTOR} g.column-header-row`;
    const HEADER_CELL_SELECTOR = 'g.header-value[column-header-column-index]';
    const HEADER_CELL_TEXT_ELEMENTS_SELECTOR = 'text'; // For extractHeaderText
    const ALL_USERS_DEFAULT_TEXT = 'All Users'; // Used to find the actual name
    const ALL_USERS_HEADER_CLASS = 'ga4-optimizer-all-users-header';
    const SEGMENT_DIM_KEY = 'segment';
    const METRIC_DIM_KEY = 'metric';
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
            warnCRDebug("Error decoding HTML entities:", e, "Input:", encodedString);
            return encodedString;
        }
    }

    window.ga4Optimizer.conversionRate.getCRData = function(cellG) {
        // logCRDebug("getCRData triggered for cell:", cellG);
        if (!cellG) return null;
        const cellTextElement = cellG.querySelector(CELL_VALUE_SELECTOR);
        const { columnDimensionMap, allUsersSegmentName } = window.ga4Optimizer.conversionRate;

        // logCRDebug("Current columnDimensionMap:", new Map(columnDimensionMap), "Looking for All Users Name:", allUsersSegmentName);

        if (columnDimensionMap.size === 0 || !allUsersSegmentName || !cellTextElement) {
            // logCRDebug("Bailing: columnDimensionMap empty, allUsersSegmentName not set, or cellTextElement missing.");
            return null;
        }

        const rowIndex = cellG.getAttribute('row-index');
        const hoveredColIndexStr = cellG.getAttribute('column-index');
        const hoveredColIndex = parseInt(hoveredColIndexStr, 10);
        const hoveredDimensions = columnDimensionMap.get(hoveredColIndex);

        // logCRDebug(`Hovered cell details: rowIndex=${rowIndex}, colIndex=${hoveredColIndex}, text="${cellTextElement.textContent?.trim()}"`);
        // logCRDebug("Dimensions for hovered column (" + hoveredColIndex + "):", hoveredDimensions);


        if (!hoveredDimensions || !hoveredDimensions[SEGMENT_DIM_KEY] || !hoveredDimensions[METRIC_DIM_KEY]) {
            // logCRDebug("Bailing: Hovered cell dimensions (segment/metric) missing.");
            return null;
        }
        // Don't calculate CR if hovering over the 'All Users' segment itself
        if (hoveredDimensions[SEGMENT_DIM_KEY] === allUsersSegmentName) {
            // logCRDebug("Bailing: Hovered cell is 'All Users' segment itself.");
            return null;
        }

        const numeratorValue = parseCellValue(cellTextElement.textContent);
        if (isNaN(numeratorValue)) {
            // logCRDebug("Bailing: Invalid numerator value in cell", cellTextElement.textContent);
            return null;
        }

        const hoveredMetric = hoveredDimensions[METRIC_DIM_KEY];
        // logCRDebug(`EXTRACTED - Hovered segment: "${hoveredDimensions[SEGMENT_DIM_KEY]}", Hovered Metric: "${hoveredMetric}"`);

        let denominatorColIndex = -1;
        // logCRDebug(`Searching for 'All Users' column with metric "${hoveredMetric}"...`);
        for (const [colIndex, dimensions] of columnDimensionMap.entries()) {
            // logCRDebug(`Checking map entry: colIndex=${colIndex}, segment="${dimensions[SEGMENT_DIM_KEY]}", metric="${dimensions[METRIC_DIM_KEY]}"`);
            const isAllUsersSegment = dimensions[SEGMENT_DIM_KEY] === allUsersSegmentName;
            const isMatchingMetric = dimensions[METRIC_DIM_KEY] === hoveredMetric;
            // logCRDebug(`...isAllUsersSegment=${isAllUsersSegment}, isMatchingMetric=${isMatchingMetric}`);

            if (isAllUsersSegment && isMatchingMetric) {
                denominatorColIndex = colIndex;
                // logCRDebug(`'All Users' column FOUND for metric "${hoveredMetric}" at index ${colIndex}`);
                break;
            }
        }

        if (denominatorColIndex === -1) {
             logCRDebug(`No 'All Users' column found for metric "${hoveredMetric}" (Target segment name: "${allUsersSegmentName}")`);
             return null;
        }

        if (!tableContainerElement) {
             tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
             if (!tableContainerElement) { errorCR("getCRData: Table container not found!"); return null; }
        }
        const denominatorCellSelector = `div.cells-wrapper g.cell[row-index="${rowIndex}"][column-index="${denominatorColIndex}"]`;
        const denominatorCellGroup = tableContainerElement.querySelector(denominatorCellSelector);
        const denominatorTextElement = denominatorCellGroup ? denominatorCellGroup.querySelector(CELL_VALUE_SELECTOR) : null;

        if (!denominatorTextElement) {
            // logCRDebug("Denominator cell text element not found for selector", denominatorCellSelector);
            return null;
        }
        // logCRDebug("Denominator cell found:", denominatorCellGroup, "Text:", denominatorTextElement.textContent?.trim());

        const denominatorValue = parseCellValue(denominatorTextElement.textContent);
        // logCRDebug(`Values - Numerator: ${numeratorValue}, Denominator: ${denominatorValue}`);

        if (!isNaN(denominatorValue) && denominatorValue !== 0) {
            return numeratorValue / denominatorValue;
        } else if (denominatorValue === 0) {
             return 'N/A (Base=0)';
        }
        // logCRDebug("Invalid denominator value or calculation failed.");
        return null;
    };

    function extractHeaderText(headerCellElement) { // Same as in segment_comparison
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
                } catch (e) { warnCRDebug("Error parsing tooltip-html:", e); headerText = '';}
            }
        }
        const textElements = Array.from(headerCellElement.querySelectorAll(`:scope > ${HEADER_CELL_TEXT_ELEMENTS_SELECTOR}`));
        if (textElements.length > 0) {
            textElements.sort((a, b) => {
                const yA = parseFloat(a.getAttribute('y') || 0); const yB = parseFloat(b.getAttribute('y') || 0);
                if (yA !== yB) return yA - yB;
                const xA = parseFloat(a.getAttribute('x') || 0); const xB = parseFloat(b.getAttribute('x') || 0);
                return xA - xB;
            });
            headerText = textElements.map(te => te.textContent?.trim()).filter(Boolean).join(' ');
            return decodeHtmlEntities(headerText.replace(/\s+/g, ' ').trim());
        }
        headerText = headerCellElement.textContent?.trim() || '';
        return decodeHtmlEntities(headerText.replace(/\s+/g, ' ').trim());
    }

    function parseColumnHeaders(container) { // Adapted from segment_comparison v2.7.2
        logCRDebug("parseColumnHeaders called.");
        const newDimensionMap = new Map();
        let foundAllUsersSegmentName = null; // Initialize to null, set if found
        let currentSignature = '';
        const columnHeaderRows = container.querySelectorAll(COLUMN_HEADER_ROWS_SELECTOR);
        const headerRowCount = columnHeaderRows.length;
        logCRDebug(`Found ${headerRowCount} columnHeaderRows.`);
        if (!columnHeaderRows || headerRowCount === 0) {
             warnCRDebug("parseColumnHeaders: No header rows found.");
             return { parsedMap: newDimensionMap, allUsersName: ALL_USERS_DEFAULT_TEXT, signature: currentSignature };
        }

        const segmentRowIndex = 0;
        const metricRowIndex = (headerRowCount > 1) ? 1 : 0;
        logCRDebug(`Segment row index: ${segmentRowIndex}, Metric row index: ${metricRowIndex}`);

        const primaryHeaderRowForIndices = columnHeaderRows[metricRowIndex] || columnHeaderRows[segmentRowIndex];
        const allPossibleColIndices = new Set();
        primaryHeaderRowForIndices?.querySelectorAll(HEADER_CELL_SELECTOR).forEach(cell => {
            const colIndexStr = cell.getAttribute('column-header-column-index');
            const colIndex = parseInt(colIndexStr, 10);
            if (!isNaN(colIndex)) allPossibleColIndices.add(colIndex);
        });
        const sortedColIndices = Array.from(allPossibleColIndices).sort((a, b) => a - b);
        logCRDebug("Sorted column indices to process:", sortedColIndices);

        let tempSegmentHeaders = {};
        let tempMetricHeaders = {};

        sortedColIndices.forEach(colIndex => {
            const segmentCell = columnHeaderRows[segmentRowIndex]?.querySelector(`${HEADER_CELL_SELECTOR}[column-header-column-index="${colIndex}"]`);
            tempSegmentHeaders[colIndex] = segmentCell ? extractHeaderText(segmentCell) : NOT_SET_SEGMENT;

            if (headerRowCount > 1) {
                const metricCell = columnHeaderRows[metricRowIndex]?.querySelector(`${HEADER_CELL_SELECTOR}[column-header-column-index="${colIndex}"]`);
                tempMetricHeaders[colIndex] = metricCell ? extractHeaderText(metricCell) : '';
            } else {
                tempMetricHeaders[colIndex] = tempSegmentHeaders[colIndex]; // Metric is same as segment text if only 1 row
            }
        });
        // logCRDebug("Temporary Segment Headers:", JSON.parse(JSON.stringify(tempSegmentHeaders)));
        // logCRDebug("Temporary Metric Headers:", JSON.parse(JSON.stringify(tempMetricHeaders)));

        let currentSegmentName = NOT_SET_SEGMENT;
        for (const colIndex of sortedColIndices) {
            let actualSegmentName = tempSegmentHeaders[colIndex];
            if ((!actualSegmentName || actualSegmentName === NOT_SET_SEGMENT) && currentSegmentName !== NOT_SET_SEGMENT) {
                actualSegmentName = currentSegmentName;
            } else if (actualSegmentName && actualSegmentName !== NOT_SET_SEGMENT) {
                currentSegmentName = actualSegmentName;
            }

            let metricName = tempMetricHeaders[colIndex];
            if (headerRowCount === 1) { // If only one header row, it's treated as metrics
                actualSegmentName = NOT_SET_SEGMENT;
            }

            // Identify the actual 'All Users' segment name as it appears in the header
            if (actualSegmentName && actualSegmentName.includes(ALL_USERS_DEFAULT_TEXT) && !foundAllUsersSegmentName) {
                foundAllUsersSegmentName = actualSegmentName;
                logCRDebug(`Found actual 'All Users' segment name: "${foundAllUsersSegmentName}"`);
            }


            if (metricName && metricName.trim() !== "") {
                 newDimensionMap.set(colIndex, {
                     [SEGMENT_DIM_KEY]: actualSegmentName,
                     [METRIC_DIM_KEY]: metricName
                 });
                 currentSignature += `|${colIndex}:${actualSegmentName}:${metricName}`;
            } else {
                 warnCRDebug(`parseColumnHeaders: Col ${colIndex} missing or empty metric name. Segment: "${actualSegmentName}", Metric found: "${metricName}"`);
            }
        }
        logCRDebug("FINAL Parsed columnDimensionMap:", new Map(newDimensionMap), `All Users name: "${foundAllUsersSegmentName || ALL_USERS_DEFAULT_TEXT}"`, "Sig:", currentSignature);
        return { parsedMap: newDimensionMap, allUsersName: foundAllUsersSegmentName || ALL_USERS_DEFAULT_TEXT, signature: currentSignature };
    }

    function styleAllUsersHeaders(container, dimensionMap, allUsersNameToStyle) {
         const headerWrapper = container.querySelector(COLUMN_HEADERS_WRAPPER_SELECTOR);
         if (!headerWrapper) return;
         headerWrapper.querySelectorAll(`.${ALL_USERS_HEADER_CLASS}`).forEach(el => el.classList.remove(ALL_USERS_HEADER_CLASS));

         const segmentRowIndex = 0; // Visual segment row for styling
         dimensionMap.forEach((dimensions, colIndex) => {
             if (dimensions[SEGMENT_DIM_KEY] === allUsersNameToStyle) {
                 const targetCellSelector = `g.column-header-row:nth-of-type(${segmentRowIndex + 1}) g.header-value[column-header-column-index="${colIndex}"]`;
                 const targetCell = headerWrapper.querySelector(targetCellSelector);
                 if (targetCell) targetCell.classList.add(ALL_USERS_HEADER_CLASS);
                 // else { warnCRDebug(`Could not find header cell to style for 'All Users' at col ${colIndex}, row ${segmentRowIndex}`); }
             }
         });
    }

    window.ga4Optimizer.conversionRate.remove = function() {
        document.querySelectorAll(`.${ALL_USERS_HEADER_CLASS}`).forEach(el => el.classList.remove(ALL_USERS_HEADER_CLASS));
        window.ga4Optimizer.conversionRate.columnDimensionMap.clear();
        window.ga4Optimizer.conversionRate.allUsersSegmentName = 'All Users'; // Reset to default
        lastParsedHeaderSignature = '';
        tableContainerElement = null;
        initializedLogShown = false;
        logCRDebug("CR styles removed, state reset.");
    };

    window.ga4Optimizer.conversionRate.runCalculation = function() {
        if (!initializedLogShown) {
            console.log("GA4 Optimizer: Conversion Rate Feature ACTIVATED (v7.4).");
            initializedLogShown = true;
        }
        if (!tableContainerElement || !document.body.contains(tableContainerElement)) {
            tableContainerElement = document.querySelector(TABLE_CONTAINER_SELECTOR);
            if (!tableContainerElement) {
                if (window.ga4Optimizer.conversionRate.columnDimensionMap.size > 0) this.remove();
                return;
            }
        }
        const { parsedMap, allUsersName, signature } = parseColumnHeaders(tableContainerElement);
        if (parsedMap.size === 0) {
            logCRDebug("runCalculation: No valid columns parsed.");
            if (window.ga4Optimizer.conversionRate.columnDimensionMap.size > 0) this.remove();
            return;
        }

        // Update state if headers changed significantly OR if detected allUsersName changed
        if (signature !== lastParsedHeaderSignature || allUsersName !== window.ga4Optimizer.conversionRate.allUsersSegmentName) {
             logCRDebug("Headers or AllUsers segment name changed. Updating state. New Sig:", signature, "New AllUsers Name:", allUsersName);
             lastParsedHeaderSignature = signature;
             window.ga4Optimizer.conversionRate.columnDimensionMap = parsedMap;
             window.ga4Optimizer.conversionRate.allUsersSegmentName = allUsersName; // Update the stored name
        }

        styleAllUsersHeaders(
             tableContainerElement,
             window.ga4Optimizer.conversionRate.columnDimensionMap,
             window.ga4Optimizer.conversionRate.allUsersSegmentName // Use the potentially updated name
        );
    };
})(); // End of IIFE
;