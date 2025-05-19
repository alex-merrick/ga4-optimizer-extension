/**
 * feature_copy_cell.js - Logic for Click to Copy Cell Content feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 4.34 - Correctly copies text from standard report cells containing nested links (e.g., Event Name).
 * - Single Click: Copies clicked line (or full tooltip for 1st ROW header sub-col). Shows "Copied!"/"Partially Copied!".
 * - Double Click: Copies full SVG cell/label text. Shows "Copied! ⚠️Check for extra spaces".
 * - Triple Click (Exploration Data Cells Only): Copies formatted hover tooltip data (%, CR, SegComp). Shows "Tooltip Copied!".
 */
(function() { // Start of IIFE
if (window.ga4Optimizer?.debugModeEnabled) {
    console.log("GA4 Optimizer: Click to Copy Cell Feature script loaded (v4.34).");
}
    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.copyCell = {};

    // --- Debug Logging Helper ---
    const logCopyDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Copy Cell v4.34):", ...args); };
    const warnCopyDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Copy Cell v4.34):", ...args); };
    const errorCopy = (...args) => { console.error("GA4 Optimizer (Copy Cell v4.34):", ...args); };

    // --- Configuration (Same as v4.33) ---
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
    const TOOLTIP_DURATION_NORMAL = 1000;
    const TOOLTIP_DURATION_DOUBLE = 3000;
    const TOOLTIP_DURATION_TRIPLE = 2000;
    const STANDARD_CELL_EXCLUDE_SELECTORS = [
        'mat-icon', 'button', 'mat-checkbox', '.percent-of-total', '.mat-sort-header-arrow',
        'ga-sparkline-svg', 'div.report-table-sparkline', // Exclude sparklines specifically
        'div.adv-table-plot-container', // Another sparkline/plot container
        '.adv-sparkline-wrapper'
    ].join(',');
    const Y_COORD_TOLERANCE = 2;
    const Y_THRESHOLD_FOR_SPACE = 5;

    // --- Feature State (Same as v4.33) ---
    let listenerAttached = false;
    let feedbackTooltipElement = null;
    let feedbackTimeoutId = null;

    // --- Helper Functions (Same as v4.33) ---
    function decodeHtmlEntities(encodedString) { /* ... (same) ... */
        if (!encodedString || typeof encodedString !== 'string') { return encodedString; }
        try { const textarea = document.createElement('textarea'); textarea.innerHTML = encodedString; return textarea.value; }
        catch (e) { errorCopy("Error decoding HTML entities:", e); return encodedString; }
    }
    function combineSvgTextWithHeuristicSpacing(sortedElements) { /* ... (same) ... */
        let combinedText = ''; let previousY = -Infinity;
        sortedElements.forEach(textElement => {
            const clone = textElement.cloneNode(true); clone.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove();
            const text = (clone.textContent || '').trim();
            if (text) {
                const currentY = parseFloat(textElement.getAttribute('y') || '0');
                if (combinedText !== '' && (currentY - previousY) > Y_THRESHOLD_FOR_SPACE) { combinedText += ' '; }
                combinedText += text; previousY = currentY;
            }
        });
        return combinedText;
    }
    function getFormattedTooltipDataForCopy(targetCell) { /* ... (same as v4.33) ... */
        let lines = []; let hasData = false;
        if (window.ga4Optimizer.featureStates.percentagesEnabled && typeof window.ga4Optimizer.percentages?.getPercentageData === 'function') {
            const percValue = window.ga4Optimizer.percentages.getPercentageData(targetCell);
            if (typeof percValue === 'number' && isFinite(percValue)) { lines.push(`${(percValue * 100).toFixed(2)}% of Column Total`); hasData = true;}
        }
        if (window.ga4Optimizer.featureStates.conversionRateEnabled && typeof window.ga4Optimizer.conversionRate?.getCRData === 'function') {
            const crValue = window.ga4Optimizer.conversionRate.getCRData(targetCell);
            let crText = null;
            if (typeof crValue === 'number' && isFinite(crValue)) { crText = `${(crValue * 100).toFixed(2)}% of All Users segment`;}
            else if (typeof crValue === 'string') { crText = crValue;}
            if (crText) { lines.push(crText); hasData = true;}
        }
        if (window.ga4Optimizer.featureStates.segmentComparisonEnabled && typeof window.ga4Optimizer.segmentComparison?.getSegCompData === 'function') {
            const segCompData = window.ga4Optimizer.segmentComparison.getSegCompData(targetCell);
            if (segCompData && typeof segCompData === 'object') {
                let countDiffText = null; let crDiffText = null;
                if (segCompData.countDiff !== null && segCompData.countDiff !== undefined) {
                    const countDiffValue = segCompData.countDiff;
                    if (typeof countDiffValue === 'number' && isFinite(countDiffValue)) { const percentage = (countDiffValue * 100).toFixed(2); const sign = countDiffValue >= 0 ? '+' : ''; countDiffText = `${sign}${percentage}% vs Control Count`;}
                    else if (typeof countDiffValue === 'string') countDiffText = countDiffValue;
                    if (countDiffText) { lines.push(countDiffText); hasData = true; }
                }
                if (segCompData.crDiff !== null && segCompData.crDiff !== undefined) {
                    const crDiffValue = segCompData.crDiff;
                    if (typeof crDiffValue === 'number' && isFinite(crDiffValue)) { const percentage = (crDiffValue * 100).toFixed(2); const sign = crDiffValue >= 0 ? '+' : ''; crDiffText = `${sign}${percentage}% CR vs Control`;}
                    else if (typeof crDiffValue === 'string') crDiffText = crDiffValue;
                    if (crDiffText) { lines.push(crDiffText); hasData = true; }
                }
            }
        }
        return hasData ? lines.join('\n') : '';
    }


    // --- getTextToCopyInfo ---
    function getTextToCopyInfo(targetCell, clickedElement, clickCount, clickClientY) {
        if (!targetCell || !clickedElement) return { text: '', copyMode: 'none' };
        let textToCopy = '';
        let copyMode = 'none';

        // Standard HTML Cells (td, th)
        if (targetCell.tagName.toLowerCase() === 'td' || targetCell.tagName.toLowerCase() === 'th') {
            if (clickCount > 2) return { text: '', copyMode: 'none' }; // No triple click for HTML cells
            logCopyDebug("Processing as HTML cell:", targetCell);

            // Attempt to find a primary link within the cell first
            const primaryLink = targetCell.querySelector('a.link, a'); // Prioritize 'a.link' if present
            let onlyLinkAndWhitespace = false;

            if (primaryLink) {
                // Check if the cell *mostly* contains just this link
                // by seeing if the cell's trimmed text content is the same as the link's.
                // This is a heuristic.
                const cellTextContent = (targetCell.textContent || '').replace(/\s+/g, ' ').trim();
                const linkTextContent = (primaryLink.textContent || '').replace(/\s+/g, ' ').trim();

                if (cellTextContent === linkTextContent) {
                    onlyLinkAndWhitespace = true;
                }
                 // More robust check: clone, remove link, check remaining content
                const tempClone = targetCell.cloneNode(true);
                const linkInClone = tempClone.querySelector('a.link, a');
                if (linkInClone) linkInClone.remove();
                if (!tempClone.textContent.trim()) { // If nothing left after removing link
                    onlyLinkAndWhitespace = true;
                }


            }

            if (primaryLink && onlyLinkAndWhitespace) {
                textToCopy = (primaryLink.textContent || '').trim();
                logCopyDebug("HTML Cell: Found primary link, using its text:", textToCopy);
            } else {
                // General case: clone, remove interactive/decorative elements, then get text
                const clonedCell = targetCell.cloneNode(true);
                // Ensure 'a' tags are NOT removed by default in this path,
                // unless they are part of something explicitly excluded.
                // STANDARD_CELL_EXCLUDE_SELECTORS should handle icons, buttons etc.
                // We also want to keep our tspan if it's a standard report with injected percentages (unlikely but safe)
                let selectorsToExclude = STANDARD_CELL_EXCLUDE_SELECTORS;
                // Don't remove 'a' tags universally here if we might want their text as part of a larger cell content.
                // clonedCell.querySelectorAll(selectorsToExclude + ', .' + PERCENTAGE_TSPAN_CLASS).forEach(el => el.remove());
                clonedCell.querySelectorAll(selectorsToExclude).forEach(el => el.remove());
                clonedCell.querySelectorAll('.' + PERCENTAGE_TSPAN_CLASS).forEach(el => el.remove());


                textToCopy = (clonedCell.textContent || '').replace(/\s+/g, ' ').trim();
                logCopyDebug("HTML Cell: General text extraction:", textToCopy);
            }
            copyMode = 'copied';
            return { text: textToCopy, copyMode: copyMode };
        }

        // SVG Cells & Labels
        if (targetCell.tagName.toLowerCase() === 'g' && targetCell.closest(EXPLORATION_ANY_TARGET_G_SELECTOR)) {
            // ... (SVG Logic from v4.33 is unchanged) ...
            const parentG = targetCell;
            const isDataCell = parentG.matches(EXPLORATION_DATA_CELL_SELECTOR);
            const isHeaderCell = parentG.classList.contains('header-value');
            const isLabelCell = parentG.classList.contains('row-label') || parentG.classList.contains('column-label');
            const isRowHeader = isHeaderCell && parentG.closest('div.row-headers-wrapper') !== null;
            let isFirstRowHeaderSubCol = false;
            if (isRowHeader) { const colIndexAttr = parentG.getAttribute('row-header-column-index'); if (colIndexAttr === '0') isFirstRowHeaderSubCol = true; }

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

            const allTextElements = parentG.querySelectorAll(EXPLORATION_TEXT_SELECTOR);
            if (!allTextElements || allTextElements.length === 0) {
                 const directClickedTextElement = clickedElement.closest('text');
                 logCopyDebug("SVG Cell: No text elements found via selector. Fallback to direct clicked or parentG text.");
                 textToCopy = (directClickedTextElement?.textContent || parentG.textContent || '').trim().replace(/\s+/g, ' ');
                 copyMode = textToCopy ? (clickCount === 2 ? 'copiedWithSpaces' : 'copied') : 'none';
                 return { text: textToCopy, copyMode: copyMode };
            }
            const sortedAllElements = Array.from(allTextElements).sort((a, b) => {
                const yA = parseFloat(a.getAttribute('y') || '0'); const yB = parseFloat(b.getAttribute('y') || '0');
                if (Math.abs(yA - yB) > Y_COORD_TOLERANCE) return yA - yB;
                const xA = parseFloat(a.getAttribute('x') || '0'); const xB = parseFloat(b.getAttribute('x') || '0');
                return xA - xB;
            });

            if (clickCount === 2) {
                if (isFirstRowHeaderSubCol) { logCopyDebug("Double click ignored on first row header sub-column (uses tooltip for single click)."); return { text: '', copyMode: 'none' }; }
                logCopyDebug("Double click detected. Copying full cell/label with heuristic spacing.");
                textToCopy = combineSvgTextWithHeuristicSpacing(sortedAllElements); copyMode = 'copiedWithSpaces';
                return { text: textToCopy.trim(), copyMode: copyMode };
            }

            if (clickCount === 1) {
                let isPartial = false; let tooltipUsed = false;
                if (isFirstRowHeaderSubCol) {
                    const tooltipRect = parentG.querySelector('rect.cellPane.ga-help-tooltip'); const tooltipHtml = tooltipRect?.getAttribute('tooltip-html');
                    if (tooltipHtml) { try { const tempDiv = document.createElement('div'); tempDiv.innerHTML = tooltipHtml; tempDiv.querySelector('p.ga-help-popup-subtitle')?.remove(); let tooltipText = tempDiv.textContent?.trim(); if (tooltipText) { textToCopy = decodeHtmlEntities(tooltipText); isPartial = false; tooltipUsed = true; logCopyDebug("Single click on first row header sub-column: Copied from tooltip-html."); } else { warnCopyDebug("Tooltip found but no text content (header index 0). Falling back to SVG text."); } } catch (e) { errorCopy("Error parsing tooltip-html (header index 0):", e); } } else { logCopyDebug("No tooltip-html found for first row header sub-column. Will use SVG text."); }
                }

                if (!tooltipUsed) {
                    let targetSvgY; let clickedTextElement = clickedElement.closest('text');
                    if (clickedTextElement && parentG.contains(clickedTextElement)) { targetSvgY = parseFloat(clickedTextElement.getAttribute('y') || '0'); logCopyDebug(`Single click on text element. Target SVG Y: ${targetSvgY}`);
                    } else if (sortedAllElements.length > 0 && clickClientY !== undefined) {
                        let minDistance = Infinity; let nearestElement = null;
                        sortedAllElements.forEach(el => { const elRect = el.getBoundingClientRect(); const elCenterY = elRect.top + elRect.height / 2; const distance = Math.abs(clickClientY - elCenterY); if (distance < minDistance) { minDistance = distance; nearestElement = el; } });
                        if (nearestElement) { targetSvgY = parseFloat(nearestElement.getAttribute('y') || '0'); logCopyDebug(`Single click on cell background. Nearest text line SVG Y: ${targetSvgY} (clickClientY: ${clickClientY} and element center: ${nearestElement.getBoundingClientRect().top + nearestElement.getBoundingClientRect().height / 2})`);
                        } else { targetSvgY = parseFloat(sortedAllElements[0].getAttribute('y') || '0'); logCopyDebug(`Single click on cell background but no nearest found (fallback). Defaulting to Y of first text: ${targetSvgY}`); }
                    } else if (sortedAllElements.length > 0) { targetSvgY = parseFloat(sortedAllElements[0].getAttribute('y') || '0'); logCopyDebug(`Single click, no direct text & no clickClientY. Defaulting to Y of first text: ${targetSvgY}`);
                    } else { return { text: '', copyMode: 'none' }; }

                    let clickedLineText = '';
                    const sameLineElements = sortedAllElements.filter(el => Math.abs(parseFloat(el.getAttribute('y') || '0') - targetSvgY) <= Y_COORD_TOLERANCE);
                    sameLineElements.forEach(textElementNode => { const clone = textElementNode.cloneNode(true); clone.querySelector(`.${PERCENTAGE_TSPAN_CLASS}`)?.remove(); const text = (clone.textContent || '').trim(); if (text) { clickedLineText += (clickedLineText ? ' ' : '') + text; } });
                    textToCopy = clickedLineText;
                    if (!isLabelCell) { const yCoordinates = new Set(); sortedAllElements.forEach(el => { yCoordinates.add(parseFloat(el.getAttribute('y') || '0').toFixed(1)); }); if (yCoordinates.size > 1) isPartial = true; }
                }
                copyMode = isPartial ? 'partiallyCopied' : 'copied';
                return { text: textToCopy.trim(), copyMode: copyMode };
            }
        }
        return { text: '', copyMode: 'none' };
    }

    // --- Tooltip Management (Same as v4.33) ---
    function createFeedbackTooltip() { /* ... (same) ... */
        if (document.getElementById(TOOLTIP_ID)) { feedbackTooltipElement = document.getElementById(TOOLTIP_ID); return; }
        feedbackTooltipElement = document.createElement('div'); feedbackTooltipElement.id = TOOLTIP_ID;
        feedbackTooltipElement.style.position = 'absolute'; feedbackTooltipElement.style.color = 'white';
        feedbackTooltipElement.style.padding = '4px 8px'; feedbackTooltipElement.style.borderRadius = '3px';
        feedbackTooltipElement.style.fontSize = '11px'; feedbackTooltipElement.style.fontFamily = "'Inter', Roboto, sans-serif";
        feedbackTooltipElement.style.zIndex = '10012'; feedbackTooltipElement.style.visibility = 'hidden';
        feedbackTooltipElement.style.opacity = '0'; feedbackTooltipElement.style.pointerEvents = 'none';
        feedbackTooltipElement.style.whiteSpace = 'normal'; feedbackTooltipElement.style.textAlign = 'center';
        feedbackTooltipElement.style.maxWidth = '200px'; feedbackTooltipElement.style.transition = 'opacity 0.15s ease-in-out';
        feedbackTooltipElement.style.backgroundColor = '#333333'; document.body.appendChild(feedbackTooltipElement);
    }
    function showFeedbackTooltip(event, copyMode) { /* ... (same) ... */
        if (!feedbackTooltipElement) createFeedbackTooltip(); if (!feedbackTooltipElement) return;
        if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId); let message = "Copied!"; let duration = TOOLTIP_DURATION_NORMAL;
        if (copyMode === 'partiallyCopied') { message = "Line Clicked Copied!";}
        else if (copyMode === 'copiedWithSpaces') { message = "Copied! ⚠️Check for extra spaces"; duration = TOOLTIP_DURATION_DOUBLE;}
        else if (copyMode === 'tooltipCopied') { message = "Tooltip Copied!"; duration = TOOLTIP_DURATION_TRIPLE;}
        feedbackTooltipElement.textContent = message;
        const xOffset = 10; const yOffset = -25;
        requestAnimationFrame(() => {
            if (!feedbackTooltipElement) return; let left = event.pageX + xOffset; let top = event.pageY + yOffset;
            const tooltipRect = feedbackTooltipElement.getBoundingClientRect();
            if (left + tooltipRect.width > window.innerWidth) left = event.pageX - tooltipRect.width - xOffset;
            if (left < 0) left = 5; if (top + tooltipRect.height > window.innerHeight) top = event.pageY - tooltipRect.height - yOffset;
            if (top < 0) top = 5; feedbackTooltipElement.style.left = `${left}px`; feedbackTooltipElement.style.top = `${top}px`;
            feedbackTooltipElement.style.visibility = 'visible'; feedbackTooltipElement.style.opacity = '1';
        });
        feedbackTimeoutId = setTimeout(() => {
            if (feedbackTooltipElement) { feedbackTooltipElement.style.opacity = '0'; setTimeout(() => { if(feedbackTooltipElement) feedbackTooltipElement.style.visibility = 'hidden';}, 150); }
            feedbackTimeoutId = null;
        }, duration);
    }

    // --- Event Handler (Same as v4.33) ---
    function handleCellClick(event) {
        if (event.button !== 0) return; if (event.detail < 1 || event.detail > 3) return;
        const clickedElement = event.target;
        const targetCell = clickedElement.closest(` ${EXPLORATION_ANY_TARGET_G_SELECTOR}, ${REPORT_DATA_CELL_SELECTOR}, ${REPORT_HEADER_CELL_SELECTOR} `);
        if (!targetCell) return;
        const { text: textToCopy, copyMode } = getTextToCopyInfo(targetCell, clickedElement, event.detail, event.clientY);
        if (textToCopy === '' || copyMode === 'none') return;
        navigator.clipboard.writeText(textToCopy).then(() => { logCopyDebug(`Text copied: "${textToCopy}", Mode: ${copyMode}`); showFeedbackTooltip(event, copyMode); }).catch(err => { errorCopy('Failed to copy text: ', err); });
    }

    // --- Core Feature Functions (Same as v4.33) ---
    window.ga4Optimizer.copyCell.runCalculation = function() { /* ... (same) ... */
        if (listenerAttached) return; logCopyDebug("Attaching click listener for copy cell feature.");
        document.body.addEventListener('click', handleCellClick, true); listenerAttached = true; createFeedbackTooltip();
    };
    window.ga4Optimizer.copyCell.remove = function() { /* ... (same) ... */
        if (!listenerAttached) return; logCopyDebug("Removing click listener for copy cell feature.");
        document.body.removeEventListener('click', handleCellClick, true); listenerAttached = false;
        if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId); feedbackTimeoutId = null;
        if (feedbackTooltipElement && feedbackTooltipElement.parentElement) { feedbackTooltipElement.parentElement.removeChild(feedbackTooltipElement); }
        feedbackTooltipElement = null;
    };

})(); // End of IIFE
;