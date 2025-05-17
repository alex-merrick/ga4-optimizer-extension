/**
 * feature_copy_cell.js - Logic for Click to Copy Cell Content feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 4.31 - Updated double-click feedback text. Fixed potential text overflow issue.
 * - Single Click: Copies clicked line (or full tooltip for 1st ROW header sub-col). Shows "Copied!"/"Partially Copied!".
 * - Double Click: Copies full SVG cell/label text. Shows "Copied! ⚠️Check for extra spaces".
 * - Triple Click (Exploration Data Cells Only): Copies formatted hover tooltip data (%, CR, SegComp). Shows "Tooltip Copied!".
 * - Feedback tooltips have a dark gray background.
 */
(function() { // Start of IIFE
    console.log("GA4 Optimizer: Click to Copy Cell Feature script loaded (v4.31).");

    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.copyCell = {};

    // --- Debug Logging Helper ---
    const logCopyDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Copy Cell):", ...args); };
    const warnCopyDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Copy Cell):", ...args); };
    const errorCopy = (...args) => { console.error("GA4 Optimizer (Copy Cell):", ...args); };

    // --- Configuration ---
    const EXPLORATION_DATA_CELL_SELECTOR = 'div.cells-wrapper g.cell[row-index][column-index]';
    const EXPLORATION_ROW_HEADER_SELECTOR = 'div.row-headers-wrapper g.header-value[row-header-row-index][row-header-column-index]';
    const EXPLORATION_COL_HEADER_SELECTOR = 'div.column-headers-wrapper g.header-value[column-header-column-index]';
    const EXPLORATION_ROW_LABEL_SELECTOR = 'div.labels-wrapper g.row-label';
    const EXPLORATION_COL_LABEL_SELECTOR = 'div.labels-wrapper g.column-label';
    const EXPLORATION_ANY_TARGET_G_SELECTOR = `
        ${EXPLORATION_DATA_CELL_SELECTOR},
        ${EXPLORATION_ROW_HEADER_SELECTOR},
        ${EXPLORATION_COL_HEADER_SELECTOR},
        ${EXPLORATION_ROW_LABEL_SELECTOR},
        ${EXPLORATION_COL_LABEL_SELECTOR}
    `;
    const EXPLORATION_TEXT_SELECTOR = 'text:not(.row-index)';

    const REPORT_DATA_CELL_SELECTOR = 'table.mat-mdc-table td.mat-mdc-cell';
    const REPORT_HEADER_CELL_SELECTOR = 'table.mat-mdc-table th.mat-mdc-header-cell';

    const PERCENTAGE_TSPAN_CLASS = 'ga4-percentage-tspan';
    const TOOLTIP_ID = 'ga4-optimizer-copy-tooltip';
    const TOOLTIP_VISIBLE_CLASS = 'visible'; // This class might be redundant now
    const TOOLTIP_DURATION_NORMAL = 1000;
    const TOOLTIP_DURATION_DOUBLE = 3000;
    const TOOLTIP_DURATION_TRIPLE = 2000;
    const STANDARD_CELL_EXCLUDE_SELECTORS = [
        'mat-icon', 'button', 'mat-checkbox', '.percent-of-total', '.mat-sort-header-arrow'
    ].join(',');
    const Y_COORD_TOLERANCE = 1;
    const Y_THRESHOLD_FOR_SPACE = 5;

    // --- Feature State ---
    let listenerAttached = false;
    let feedbackTooltipElement = null;
    let feedbackTimeoutId = null;

    // --- Helper Functions ---

    function decodeHtmlEntities(encodedString) {
        if (!encodedString || typeof encodedString !== 'string') {
            return encodedString;
        }
        try {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = encodedString;
            return textarea.value;
        } catch (e) {
            errorCopy("Error decoding HTML entities:", e);
            return encodedString;
        }
    }

    function combineSvgTextWithHeuristicSpacing(sortedElements) {
        let combinedText = '';
        let previousY = -Infinity;
        sortedElements.forEach(textElement => {
            const clone = textElement.cloneNode(true);
            clone.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
            const text = (clone.textContent || '').trim();
            if (text) {
                const currentY = parseFloat(textElement.getAttribute('y') || '0');
                if (combinedText !== '' && (currentY - previousY) > Y_THRESHOLD_FOR_SPACE) {
                    logCopyDebug(`(Heuristic) Adding space before "${text}" due to Y diff`);
                    combinedText += ' ';
                }
                combinedText += text;
                previousY = currentY;
            }
        });
        return combinedText;
    }

    function getFormattedTooltipDataForCopy(targetCell) {
        let lines = [];
        let hasData = false;

        // 1. Percentage of Column Total
        if (window.ga4Optimizer.featureStates.percentagesEnabled && typeof window.ga4Optimizer.percentages?.getPercentageData === 'function') {
            const percValue = window.ga4Optimizer.percentages.getPercentageData(targetCell);
            if (typeof percValue === 'number' && isFinite(percValue)) {
                lines.push(`${(percValue * 100).toFixed(2)}% of Column Total`);
                hasData = true;
            }
        }

        // 2. Percentage of All Users
        if (window.ga4Optimizer.featureStates.conversionRateEnabled && typeof window.ga4Optimizer.conversionRate?.getCRData === 'function') {
            const crValue = window.ga4Optimizer.conversionRate.getCRData(targetCell);
            let crText = null;
            if (typeof crValue === 'number' && isFinite(crValue)) {
                crText = `${(crValue * 100).toFixed(2)}% of All Users segment`;
            } else if (typeof crValue === 'string') {
                crText = crValue;
            }
            if (crText) {
                 lines.push(crText);
                 hasData = true;
            }
        }

        // 3. Segment Variation Comparison
        if (window.ga4Optimizer.featureStates.segmentComparisonEnabled && typeof window.ga4Optimizer.segmentComparison?.getSegCompData === 'function') {
            const segCompData = window.ga4Optimizer.segmentComparison.getSegCompData(targetCell);
            if (segCompData && typeof segCompData === 'object') {
                let countDiffText = null;
                let crDiffText = null;
                if (segCompData.countDiff !== null && segCompData.countDiff !== undefined) {
                    const countDiffValue = segCompData.countDiff;
                    if (typeof countDiffValue === 'number' && isFinite(countDiffValue)) {
                        const percentage = (countDiffValue * 100).toFixed(2);
                        const sign = countDiffValue >= 0 ? '+' : '';
                        countDiffText = `${sign}${percentage}% vs Control Count`;
                    } else if (typeof countDiffValue === 'string') countDiffText = countDiffValue;
                    if (countDiffText) { lines.push(countDiffText); hasData = true; }
                }
                if (segCompData.crDiff !== null && segCompData.crDiff !== undefined) {
                    const crDiffValue = segCompData.crDiff;
                    if (typeof crDiffValue === 'number' && isFinite(crDiffValue)) {
                        const percentage = (crDiffValue * 100).toFixed(2);
                        const sign = crDiffValue >= 0 ? '+' : '';
                        crDiffText = `${sign}${percentage}% CR vs Control`;
                    } else if (typeof crDiffValue === 'string') crDiffText = crDiffValue;
                     if (crDiffText) { lines.push(crDiffText); hasData = true; }
                }
            }
        }
        return hasData ? lines.join('\n') : '';
    }


    function getTextToCopyInfo(targetCell, clickedElement, clickCount) {
        if (!targetCell || !clickedElement) return { text: '', copyMode: 'none' };
        let textToCopy = '';
        let copyMode = 'none';

        // Standard HTML Cells
        if (targetCell.tagName.toLowerCase() === 'td' || targetCell.tagName.toLowerCase() === 'th') {
            if (clickCount > 2) return { text: '', copyMode: 'none' };
            logCopyDebug("Processing as HTML cell.");
            const childNodes = Array.from(targetCell.childNodes);
            const linkElement = childNodes.find(node => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a');
            const otherElements = childNodes.filter(node => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'a');
            const hasOnlyWhitespaceText = childNodes.every(node => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()));
            if (linkElement && otherElements.length === 0 && hasOnlyWhitespaceText) textToCopy = linkElement.textContent;
            else {
                 const clonedCell = targetCell.cloneNode(true);
                 clonedCell.querySelectorAll(STANDARD_CELL_EXCLUDE_SELECTORS + ', a, .' + PERCENTAGE_TSPAN_CLASS).forEach(el => el.remove());
                 textToCopy = clonedCell.textContent;
            }
            textToCopy = textToCopy.replace(/\s+/g, ' ').trim();
            copyMode = 'copied';
            return { text: textToCopy, copyMode: copyMode };
        }

        // SVG Cells & Labels
        if (targetCell.tagName.toLowerCase() === 'g' && targetCell.closest(EXPLORATION_ANY_TARGET_G_SELECTOR)) {
            const parentG = targetCell;
            const isDataCell = parentG.matches(EXPLORATION_DATA_CELL_SELECTOR);
            const isHeaderCell = parentG.classList.contains('header-value');
            const isLabelCell = parentG.classList.contains('row-label') || parentG.classList.contains('column-label');
            const isRowHeader = isHeaderCell && parentG.closest('div.row-headers-wrapper') !== null;
            let isFirstRowHeaderSubCol = false;
            if (isRowHeader) {
                const colIndexAttr = parentG.getAttribute('row-header-column-index');
                if (colIndexAttr === '0') isFirstRowHeaderSubCol = true;
            }

            // Triple Click (Data Cells Only)
            if (clickCount === 3 && isDataCell) {
                logCopyDebug("Triple click detected on data cell. Attempting to copy tooltip data.");
                textToCopy = getFormattedTooltipDataForCopy(parentG);
                copyMode = textToCopy ? 'tooltipCopied' : 'none';
                if (copyMode === 'none') logCopyDebug("No tooltip data found or features disabled.");
                return { text: textToCopy, copyMode: copyMode };
            }
            if (clickCount === 3 && !isDataCell) {
                 logCopyDebug("Triple click ignored on non-data cell.");
                 return { text: '', copyMode: 'none' };
            }

            // Single/Double Click
            const allTextElements = parentG.querySelectorAll(EXPLORATION_TEXT_SELECTOR);
            if (!allTextElements || allTextElements.length === 0) {
                 const clickedTextElement = clickedElement.closest('text');
                 return { text: (clickedTextElement?.textContent || '').trim(), copyMode: 'copied' };
            }
            const sortedAllElements = Array.from(allTextElements).sort((a, b) => {
                const yA = parseFloat(a.getAttribute('y') || '0'); const yB = parseFloat(b.getAttribute('y') || '0');
                if (Math.abs(yA - yB) > Y_COORD_TOLERANCE) return yA - yB;
                const xA = parseFloat(a.getAttribute('x') || '0'); const xB = parseFloat(b.getAttribute('x') || '0');
                return xA - xB;
            });

            if (clickCount === 2) {
                if (isFirstRowHeaderSubCol) return { text: '', copyMode: 'none' };
                logCopyDebug("Double click detected. Copying full cell/label with heuristic spacing.");
                textToCopy = combineSvgTextWithHeuristicSpacing(sortedAllElements);
                copyMode = 'copiedWithSpaces'; // Will trigger specific message
                return { text: textToCopy.trim(), copyMode: copyMode };
            }

            if (clickCount === 1) {
                const clickedTextElement = clickedElement.closest('text');
                if (!clickedTextElement) return { text: '', copyMode: 'none' };
                const clickedY = parseFloat(clickedTextElement.getAttribute('y') || '0');
                let clickedLineText = '';
                const sameLineElements = sortedAllElements.filter(el => Math.abs(parseFloat(el.getAttribute('y') || '0') - clickedY) <= Y_COORD_TOLERANCE);
                sameLineElements.forEach(textElement => {
                    const clone = textElement.cloneNode(true);
                    clone.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
                    const text = (clone.textContent || '').trim();
                    if (text) clickedLineText += text;
                });
                textToCopy = clickedLineText;
                copyMode = 'copied';
                let isPartial = false;
                if (!isLabelCell) {
                    const yCoordinates = new Set(sortedAllElements.map(el => parseFloat(el.getAttribute('y') || '0')));
                    if (yCoordinates.size > 1) isPartial = true;
                }
                let tooltipUsed = false;
                if (isFirstRowHeaderSubCol) {
                    const tooltipRect = parentG.querySelector('rect.cellPane.ga-help-tooltip');
                    const tooltipHtml = tooltipRect?.getAttribute('tooltip-html');
                    if (tooltipHtml) {
                        try {
                            const tempDiv = document.createElement('div'); tempDiv.innerHTML = tooltipHtml;
                            tempDiv.querySelector('p.ga-help-popup-subtitle')?.remove();
                            let tooltipText = tempDiv.textContent?.trim();
                            if (tooltipText) { textToCopy = decodeHtmlEntities(tooltipText); isPartial = false; tooltipUsed = true; }
                            else { warnCopyDebug("Tooltip found but no text content (header index 0)."); }
                        } catch (e) { errorCopy("Error parsing tooltip-html (header index 0):", e); }
                    } else { logCopyDebug("No tooltip found for header index 0."); }
                }
                if (!tooltipUsed && isPartial) copyMode = 'partiallyCopied';
                else copyMode = 'copied';
                return { text: textToCopy.trim(), copyMode: copyMode };
            }
        }
        return { text: '', copyMode: 'none' };
    }

     // --- Tooltip Management ---
     function createFeedbackTooltip() {
        if (document.getElementById(TOOLTIP_ID)) {
            feedbackTooltipElement = document.getElementById(TOOLTIP_ID);
            return;
        }
        feedbackTooltipElement = document.createElement('div');
        feedbackTooltipElement.id = TOOLTIP_ID;
        // Basic styles - background handled by CSS
        feedbackTooltipElement.style.position = 'absolute';
        feedbackTooltipElement.style.color = 'white';
        feedbackTooltipElement.style.padding = '4px 8px';
        feedbackTooltipElement.style.borderRadius = '3px';
        feedbackTooltipElement.style.fontSize = '11px';
        feedbackTooltipElement.style.fontFamily = "'Inter', Roboto, sans-serif";
        feedbackTooltipElement.style.zIndex = '10002';
        feedbackTooltipElement.style.visibility = 'hidden';
        feedbackTooltipElement.style.opacity = '0';
        feedbackTooltipElement.style.pointerEvents = 'none';
        // *** Ensure text wrapping is allowed by default ***
        feedbackTooltipElement.style.whiteSpace = 'normal';
        feedbackTooltipElement.style.textAlign = 'center'; // Center text
        feedbackTooltipElement.style.maxWidth = '200px'; // Keep max width
        feedbackTooltipElement.style.transition = 'opacity 0.15s ease-in-out';

        document.body.appendChild(feedbackTooltipElement);
        logCopyDebug("Copy feedback tooltip element created.");
    }

    function showFeedbackTooltip(event, copyMode) {
        if (!feedbackTooltipElement) createFeedbackTooltip();
        if (!feedbackTooltipElement) return;
        if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId);

        let message = "Copied!";
        let duration = TOOLTIP_DURATION_NORMAL;

        if (copyMode === 'partiallyCopied') {
            message = "Line Clicked Copied!";
        } else if (copyMode === 'copiedWithSpaces') {
            // *** UPDATED TEXT for double-click ***
            message = "Copied! ⚠️Check for extra spaces";
            duration = TOOLTIP_DURATION_DOUBLE;
        } else if (copyMode === 'tooltipCopied') {
            message = "Tooltip Copied!";
            duration = TOOLTIP_DURATION_TRIPLE;
        }
        feedbackTooltipElement.textContent = message;
        logCopyDebug(`Showing feedback tooltip: "${message}" for ${duration}ms`);

        const xOffset = 10; const yOffset = -25;

        requestAnimationFrame(() => {
            if (!feedbackTooltipElement) return;
            // *** Recalculate position *after* setting text content ***
            let left = event.pageX + xOffset;
            let top = event.pageY + yOffset;
            const tooltipRect = feedbackTooltipElement.getBoundingClientRect(); // Get bounds *after* content is set

            if (left + tooltipRect.width > window.innerWidth) left = event.pageX - tooltipRect.width - xOffset;
            if (left < 0) left = 5;
            if (top + tooltipRect.height > window.innerHeight) top = event.pageY - tooltipRect.height - yOffset;
            if (top < 0) top = 5;

            feedbackTooltipElement.style.left = `${left}px`;
            feedbackTooltipElement.style.top = `${top}px`;
            feedbackTooltipElement.style.visibility = 'visible';
            feedbackTooltipElement.style.opacity = '1';
        });

        feedbackTimeoutId = setTimeout(() => {
            if (feedbackTooltipElement) {
                feedbackTooltipElement.style.opacity = '0';
                 setTimeout(() => {
                    if(feedbackTooltipElement) feedbackTooltipElement.style.visibility = 'hidden';
                 }, 150);
            }
            feedbackTimeoutId = null;
        }, duration);
    }

    // --- Event Handler ---
    function handleCellClick(event) {
        if (event.button !== 0) return;
        if (event.detail < 1 || event.detail > 3) return;

        const clickedElement = event.target;
        const targetCell = clickedElement.closest(`
            ${EXPLORATION_ANY_TARGET_G_SELECTOR},
            ${REPORT_DATA_CELL_SELECTOR},
            ${REPORT_HEADER_CELL_SELECTOR}
        `);
        if (!targetCell) return;

        const { text: textToCopy, copyMode } = getTextToCopyInfo(targetCell, clickedElement, event.detail);
        if (textToCopy === '' || copyMode === 'none') return;

        logCopyDebug(`Attempting to copy text: "${textToCopy}", Mode: ${copyMode}`);
        navigator.clipboard.writeText(textToCopy).then(() => {
            logCopyDebug("Text copied successfully!");
            showFeedbackTooltip(event, copyMode);
        }).catch(err => {
            errorCopy('Failed to copy text: ', err);
        });
    }

    // --- Core Feature Functions ---
    window.ga4Optimizer.copyCell.runCalculation = function() {
        if (listenerAttached) return;
        logCopyDebug("Attaching click listener for copy cell feature.");
        document.body.addEventListener('click', handleCellClick, true);
        listenerAttached = true;
        createFeedbackTooltip();
    };

    window.ga4Optimizer.copyCell.remove = function() {
        if (!listenerAttached) return;
        logCopyDebug("Removing click listener for copy cell feature.");
        document.body.removeEventListener('click', handleCellClick, true);
        listenerAttached = false;
        if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId);
        feedbackTimeoutId = null;
        if (feedbackTooltipElement) feedbackTooltipElement.remove();
        feedbackTooltipElement = null;
    };

})(); // End of IIFE
;
