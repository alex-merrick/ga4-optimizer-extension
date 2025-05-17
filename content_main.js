/**
 * content_main.js - Core logic for GA4 Optimizer Extension
 * VERSION: 6.0.5 - Corrected ReferenceError for panel toggle selectors in observer (final fix).
 */

console.log("GA4 Optimizer: Core script loaded. Frame:", window.location.href);

window.ga4Optimizer = window.ga4Optimizer || {};

window.ga4Optimizer.featureStates = {
    percentagesEnabled: true,
    autoDetailedEnabled: false,
    conversionRateEnabled: true,
    copyCellEnabled: true,
    stickyHeaderEnabled: true,
    highlightSamplingEnabled: true,
    segmentComparisonEnabled: true,
    panelToggleEnabled: true,
    stickyCalculatorEnabled: true,
};
window.ga4Optimizer.isModifyingDOM = false;
window.ga4Optimizer.featureModules = {};
window.ga4Optimizer.debugModeEnabled = false;

let observer = null;
let featureDebounceTimer = null;
let autoDetailedDebounceTimer = null;
let initialLoadComplete = false;
let activationCheckIntervalId = null;
const ACTIVATION_CHECK_INTERVAL = 500;
const FEATURE_READINESS_RETRY_DELAY = 200;
const FEATURE_READINESS_MAX_RETRIES = 15;

const COMBINED_TOOLTIP_ID = 'ga4-optimizer-combined-tooltip';
let combinedTooltipElement = null;
let combinedTooltipHideTimeoutId = null;
let combinedTooltipActiveMouseMoveListener = null;
const COMBINED_TOOLTIP_HIDE_TRANSITION_MS = 150;
const COMBINED_TOOLTIP_PADDING = 5;
let currentHoveredCell = null;

const NATIVE_TOOLTIP_SELECTOR = '#ga-shared-tooltip-popup';
const NATIVE_TOOLTIP_ADJUST_CLASS = 'ga4-optimizer-native-tooltip-adjusted';
const NATIVE_TOOLTIP_CHECK_INTERVAL = 100;
let nativeTooltipAdjustIntervalId = null;
let lastAdjustedNativeTooltip = null;

let popupUpdateDebounceTimer = null;
const POPUP_UPDATE_DEBOUNCE_DELAY = 100;

const OPTIMIZER_NOTIFICATION_BASE_ID = 'ga4-optimizer-notification-';

// Define these selectors here as they are used by the observer for panel toggle sensitivity
const PANEL_TOGGLE_MAIN_LAYOUT_SELECTOR_FOR_OBSERVER = 'ga-analysis-view';
const PANEL_TOGGLE_MINIMIZED_CONTAINER_SELECTOR_FOR_OBSERVER = '.minimized-analysis-panels';


function showOptimizerNotification(message, duration = 3500, idSuffix = 'general') {
    logDebug("Attempting to show optimizer notification:", message, "ID Suffix:", idSuffix);
    const notificationId = OPTIMIZER_NOTIFICATION_BASE_ID + idSuffix;
    let notificationElement = document.getElementById(notificationId);

    if (window.ga4Optimizer[notificationId + '_timeout']) {
        clearTimeout(window.ga4Optimizer[notificationId + '_timeout']);
        delete window.ga4Optimizer[notificationId + '_timeout'];
    }

    if (notificationElement) {
        logDebug("Optimizer notification element exists, updating content for ID:", notificationId);
        notificationElement.textContent = message;
        notificationElement.style.opacity = '0';
        notificationElement.style.transform = 'translateX(-50%) translateY(100px)';
    } else {
        logDebug("Creating new optimizer notification element with ID:", notificationId);
        notificationElement = document.createElement('div');
        notificationElement.id = notificationId;
        notificationElement.style.position = 'fixed';
        notificationElement.style.bottom = '20px';
        notificationElement.style.left = '50%';
        notificationElement.style.transform = 'translateX(-50%) translateY(100px)';
        notificationElement.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        notificationElement.style.color = 'white';
        notificationElement.style.padding = '10px 20px';
        notificationElement.style.borderRadius = '5px';
        notificationElement.style.zIndex = '20000';
        notificationElement.style.fontSize = '14px';
        notificationElement.style.fontFamily = 'Roboto, sans-serif';
        notificationElement.style.opacity = '0';
        notificationElement.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        notificationElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notificationElement.style.textAlign = 'center';
        notificationElement.style.pointerEvents = 'none';
        notificationElement.textContent = message;
        document.body.appendChild(notificationElement);
    }

    requestAnimationFrame(() => {
        if (document.body.contains(notificationElement)) {
            notificationElement.style.opacity = '1';
            notificationElement.style.transform = 'translateX(-50%) translateY(0)';
        }
    });

    window.ga4Optimizer[notificationId + '_timeout'] = setTimeout(() => {
        if (document.body.contains(notificationElement)) {
            notificationElement.style.opacity = '0';
            notificationElement.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => {
                if (notificationElement && notificationElement.parentElement) {
                    notificationElement.parentElement.removeChild(notificationElement);
                }
                delete window.ga4Optimizer[notificationId + '_timeout'];
            }, 300);
        }
    }, duration);
}

function isEditPage() {
    const hash = window.location.hash;
    return hash && (hash.includes('/edit/') || /\/analysis\/(p\d+\/)?(edit|analyse)\//.test(hash));
}

const logDebug = (...args) => { if (window.ga4Optimizer.debugModeEnabled) console.log("[CS Main]", ...args); };
const warnDebug = (...args) => { if (window.ga4Optimizer.debugModeEnabled) console.warn("[CS Main]", ...args); };
const errorDebug = (...args) => { console.error("[CS Main]", ...args); };


function ensureFeatureReadyAndRun(featureName, actionType, ...actionArgs) {
    let retries = 0;
    const callback = (actionArgs.length > 0 && typeof actionArgs[actionArgs.length - 1] === 'function') ? actionArgs[actionArgs.length - 1] : null;
    const coreActionArgs = callback ? actionArgs.slice(0, -1) : [...actionArgs];

    const attemptRun = () => {
        const featureModule = window.ga4Optimizer[featureName];
        if (featureModule && typeof featureModule[actionType] === 'function') {
            try {
                logDebug(`[Readiness] Running ${featureName}.${actionType}`);
                if (callback) {
                    featureModule[actionType](...coreActionArgs, callback);
                } else {
                    featureModule[actionType](...coreActionArgs);
                }
            } catch (error) {
                 errorDebug(`[Readiness] ERROR running ${featureName}.${actionType}:`, error);
                 if (callback) {
                    try { callback(error); } catch (cbError) { /* ignore */ }
                 }
            }
        } else {
            retries++;
            if (retries <= FEATURE_READINESS_MAX_RETRIES) {
                logDebug(`[Readiness] Feature '${featureName}' or action '${actionType}' not ready. Retry ${retries}/${FEATURE_READINESS_MAX_RETRIES}.`);
                setTimeout(attemptRun, FEATURE_READINESS_RETRY_DELAY);
            } else {
                errorDebug(`[Readiness] Feature '${featureName}' or action '${actionType}' FAILED after ${FEATURE_READINESS_MAX_RETRIES} retries.`);
                if (callback) {
                     try { callback(new Error(`Feature ${featureName}.${actionType} timed out`)); } catch (cbError) { /* ignore */ }
                }
            }
        }
    };
    attemptRun();
}

function checkAndAdjustNativeTooltip() {
    if (!combinedTooltipElement || combinedTooltipElement.style.visibility !== 'visible') {
        stopNativeTooltipAdjustmentCheck(); return;
    }
    try {
        const nativeTooltip = document.querySelector(NATIVE_TOOLTIP_SELECTOR);
        if (nativeTooltip && !nativeTooltip.classList.contains(NATIVE_TOOLTIP_ADJUST_CLASS)) {
            nativeTooltip.classList.add(NATIVE_TOOLTIP_ADJUST_CLASS);
            lastAdjustedNativeTooltip = nativeTooltip;
        } else if (!nativeTooltip && lastAdjustedNativeTooltip) {
             lastAdjustedNativeTooltip = null;
        }
    } catch (error) { stopNativeTooltipAdjustmentCheck(); }
}
function startNativeTooltipAdjustmentCheck() {
    if (nativeTooltipAdjustIntervalId === null) {
        removeNativeTooltipAdjustment();
        nativeTooltipAdjustIntervalId = setInterval(checkAndAdjustNativeTooltip, NATIVE_TOOLTIP_CHECK_INTERVAL);
    }
}
function stopNativeTooltipAdjustmentCheck() {
    if (nativeTooltipAdjustIntervalId !== null) {
        clearInterval(nativeTooltipAdjustIntervalId);
        nativeTooltipAdjustIntervalId = null;
    }
}
function removeNativeTooltipAdjustment() {
     const adjustedTooltips = document.querySelectorAll(`.${NATIVE_TOOLTIP_ADJUST_CLASS}`);
     adjustedTooltips.forEach(tooltip => tooltip.classList.remove(NATIVE_TOOLTIP_ADJUST_CLASS));
     lastAdjustedNativeTooltip = null;
}
function createCombinedTooltip() {
    if (document.getElementById(COMBINED_TOOLTIP_ID)) {
        combinedTooltipElement = document.getElementById(COMBINED_TOOLTIP_ID);
        combinedTooltipElement.style.position = 'fixed';
        combinedTooltipElement.style.transition = `opacity ${COMBINED_TOOLTIP_HIDE_TRANSITION_MS / 1000}s ease-in-out`;
        return;
    }
    combinedTooltipElement = document.createElement('div');
    combinedTooltipElement.id = COMBINED_TOOLTIP_ID;
    Object.assign(combinedTooltipElement.style, { position: 'fixed', visibility: 'hidden', opacity: '0', pointerEvents: 'none', transition: `opacity ${COMBINED_TOOLTIP_HIDE_TRANSITION_MS / 1000}s ease-in-out` });
    combinedTooltipElement.classList.add('ga4-optimizer-tooltip-base', 'ga4-optimizer-combined-tooltip-style');
    document.body.appendChild(combinedTooltipElement);
}
function updateCombinedTooltipPosition(event) {
    if (!combinedTooltipElement || combinedTooltipElement.style.visibility === 'hidden') {
        removeCombinedTooltipMouseMoveListener(); return;
    }
    const xOffset = 15; const yOffset = 10;
    let left = event.clientX + xOffset; let top = event.clientY + yOffset;
    const tooltipWidth = combinedTooltipElement.offsetWidth;
    const tooltipHeight = combinedTooltipElement.offsetHeight;
    if (left + tooltipWidth > window.innerWidth) left = event.clientX - tooltipWidth - xOffset;
    if (left < 0) left = COMBINED_TOOLTIP_PADDING;
    if (top + tooltipHeight > window.innerHeight) top = event.clientY - tooltipHeight - yOffset - COMBINED_TOOLTIP_PADDING;
    if (top < 0) top = COMBINED_TOOLTIP_PADDING;
    combinedTooltipElement.style.left = `${left}px`;
    combinedTooltipElement.style.top = `${top}px`;
}
function addCombinedTooltipMouseMoveListener() {
    removeCombinedTooltipMouseMoveListener();
    combinedTooltipActiveMouseMoveListener = updateCombinedTooltipPosition;
    document.body.addEventListener('mousemove', combinedTooltipActiveMouseMoveListener);
}
function removeCombinedTooltipMouseMoveListener() {
    if (combinedTooltipActiveMouseMoveListener) {
        document.body.removeEventListener('mousemove', combinedTooltipActiveMouseMoveListener);
        combinedTooltipActiveMouseMoveListener = null;
    }
}
function showCombinedTooltip(event, tooltipData) {
    if (!combinedTooltipElement) createCombinedTooltip();
    if (!combinedTooltipElement) return;
    let htmlContent = ''; let hasContent = false;
    if (tooltipData.percentage !== null && tooltipData.percentage !== undefined) {
        const percValue = tooltipData.percentage;
        if (typeof percValue === 'number' && isFinite(percValue)) { htmlContent += `<div class="tooltip-line-wrapper perc-line-wrapper"><span class="tooltip-line perc-line">${(percValue * 100).toFixed(2)}% of Column Total</span></div>`; hasContent = true; }
    }
    if (tooltipData.conversionRate !== null && tooltipData.conversionRate !== undefined) {
        const crValue = tooltipData.conversionRate; let crText = null;
        if (typeof crValue === 'number' && isFinite(crValue)) crText = `${(crValue * 100).toFixed(2)}% of All Users segment`;
        else if (typeof crValue === 'string' && crValue.trim() !== '') crText = crValue;
        if (crText !== null) { htmlContent += `<div class="tooltip-line-wrapper cr-line-wrapper"><span class="tooltip-line cr-line">${crText}</span></div>`; hasContent = true; }
    }
    if (tooltipData.segmentComparison !== null && typeof tooltipData.segmentComparison === 'object') {
        const segCompData = tooltipData.segmentComparison; let countDiffText = null; let crDiffText = null;
        if (segCompData.countDiff !== null && segCompData.countDiff !== undefined) {
            const countDiffValue = segCompData.countDiff;
            if (typeof countDiffValue === 'number' && isFinite(countDiffValue)) { const percentage = (countDiffValue * 100).toFixed(2); const sign = countDiffValue >= 0 ? '+' : ''; countDiffText = `${sign}${percentage}% vs Control Count`; }
            else if (typeof countDiffValue === 'string' && countDiffValue.trim() !== '') countDiffText = countDiffValue;
            if (countDiffText) { htmlContent += `<div class="tooltip-line-wrapper segcomp-count-line-wrapper"><span class="tooltip-line segcomp-count-line">${countDiffText}</span></div>`; hasContent = true;}
        }
        if (segCompData.crDiff !== null && segCompData.crDiff !== undefined) {
            const crDiffValue = segCompData.crDiff;
            if (typeof crDiffValue === 'number' && isFinite(crDiffValue)) { const percentage = (crDiffValue * 100).toFixed(2); const sign = crDiffValue >= 0 ? '+' : ''; crDiffText = `${sign}${percentage}% CR vs Control`; }
            else if (typeof crDiffValue === 'string' && crDiffValue.trim() !== '') crDiffText = crDiffValue;
            if (crDiffText) { htmlContent += `<div class="tooltip-line-wrapper segcomp-cr-line-wrapper"><span class="tooltip-line segcomp-cr-line">${crDiffText}</span></div>`; hasContent = true;}
        }
    }
    if (!hasContent) { hideCombinedTooltip(); return; }
    if (combinedTooltipHideTimeoutId) { clearTimeout(combinedTooltipHideTimeoutId); combinedTooltipHideTimeoutId = null; }
    combinedTooltipElement.innerHTML = htmlContent;
    updateCombinedTooltipPosition(event);
    combinedTooltipElement.style.visibility = 'visible';
    combinedTooltipElement.style.opacity = '1';
    addCombinedTooltipMouseMoveListener();
    startNativeTooltipAdjustmentCheck();
}
function hideCombinedTooltip() {
    removeCombinedTooltipMouseMoveListener();
    stopNativeTooltipAdjustmentCheck(); removeNativeTooltipAdjustment();
    if (combinedTooltipElement) {
        combinedTooltipElement.style.opacity = '0';
        if (combinedTooltipHideTimeoutId) { clearTimeout(combinedTooltipHideTimeoutId); }
        combinedTooltipHideTimeoutId = setTimeout(() => {
            if (combinedTooltipElement) { combinedTooltipElement.style.visibility = 'hidden'; combinedTooltipElement.innerHTML = ''; }
            combinedTooltipHideTimeoutId = null;
        }, COMBINED_TOOLTIP_HIDE_TRANSITION_MS);
    }
    currentHoveredCell = null;
}

const DATA_CELL_SELECTOR_FOR_COMBINED = 'div.cells-wrapper g.cell[row-index][column-index]';
function handleCombinedCellMouseEnter(event) {
    const cellG = event.currentTarget; currentHoveredCell = cellG;
    const tooltipData = { percentage: null, conversionRate: null, segmentComparison: null }; let hasAnyData = false;
    if (window.ga4Optimizer.featureStates.percentagesEnabled && window.ga4Optimizer.percentages?.getPercentageData) { try { tooltipData.percentage = window.ga4Optimizer.percentages.getPercentageData(cellG); if (tooltipData.percentage !== null && tooltipData.percentage !== undefined) hasAnyData = true; } catch (e) { /*ignore*/ } }
    if (window.ga4Optimizer.featureStates.conversionRateEnabled && window.ga4Optimizer.conversionRate?.getCRData) { try { tooltipData.conversionRate = window.ga4Optimizer.conversionRate.getCRData(cellG); if (tooltipData.conversionRate !== null && tooltipData.conversionRate !== undefined) hasAnyData = true; } catch (e) { /*ignore*/ } }
    if (window.ga4Optimizer.featureStates.segmentComparisonEnabled && window.ga4Optimizer.segmentComparison?.getSegCompData) { try { tooltipData.segmentComparison = window.ga4Optimizer.segmentComparison.getSegCompData(cellG); if (tooltipData.segmentComparison !== null && tooltipData.segmentComparison !== undefined) hasAnyData = true; } catch (e) { /*ignore*/ }}
    if (hasAnyData) showCombinedTooltip(event, tooltipData); else hideCombinedTooltip();
}
function handleCombinedCellMouseLeave(event) {
    const relatedTarget = event.relatedTarget;
    if (currentHoveredCell && relatedTarget && currentHoveredCell.contains(relatedTarget)) return;
    hideCombinedTooltip();
}

let combinedTooltipListenersAttached = false;
let currentTableContainer = null;
function addCombinedTooltipListeners(container) {
    if (!container || (combinedTooltipListenersAttached && currentTableContainer === container)) return;
    if (combinedTooltipListenersAttached && currentTableContainer) removeCombinedTooltipListeners(currentTableContainer);
    container.addEventListener('mouseover', handleCombinedCellMouseEnterDelegated);
    container.addEventListener('mouseout', handleCombinedCellMouseLeaveDelegated);
    combinedTooltipListenersAttached = true; currentTableContainer = container;
    logDebug("Combined tooltip listeners ADDED to container:", container);
}
function removeCombinedTooltipListeners(container) {
    if (!container || !combinedTooltipListenersAttached || (container !== currentTableContainer && currentTableContainer !== null)) return;
    const targetContainer = container || currentTableContainer;
    if (!targetContainer) return;

    targetContainer.removeEventListener('mouseover', handleCombinedCellMouseEnterDelegated);
    targetContainer.removeEventListener('mouseout', handleCombinedCellMouseLeaveDelegated);
    combinedTooltipListenersAttached = false;
    currentTableContainer = null;
    hideCombinedTooltip();
    logDebug("Combined tooltip listeners REMOVED from container:", targetContainer);
}

function handleCombinedCellMouseEnterDelegated(event) {
    const targetCell = event.target.closest(DATA_CELL_SELECTOR_FOR_COMBINED);
    if (targetCell && targetCell !== currentHoveredCell) {
        handleCombinedCellMouseEnter({ currentTarget: targetCell, clientX: event.clientX, clientY: event.clientY });
    }
}
function handleCombinedCellMouseLeaveDelegated(event) {
    const targetCell = event.target.closest(DATA_CELL_SELECTOR_FOR_COMBINED);
    if (targetCell && targetCell === currentHoveredCell) {
        if (!event.relatedTarget || !targetCell.contains(event.relatedTarget)) {
            handleCombinedCellMouseLeave({ currentTarget: targetCell, relatedTarget: event.relatedTarget });
        }
    } else if (currentHoveredCell && !targetCell) {
        if (!event.relatedTarget || !currentHoveredCell.contains(event.relatedTarget)){
             handleCombinedCellMouseLeave({ currentTarget: currentHoveredCell, relatedTarget: event.relatedTarget });
        }
    }
}

function performCleanup(cleanupAll = false) {
    logDebug(`performCleanup called. cleanupAll: ${cleanupAll}`);
    if (activationCheckIntervalId !== null) { clearInterval(activationCheckIntervalId); activationCheckIntervalId = null; }
    if (observer && cleanupAll) {
        logDebug("performCleanup: Disconnecting observer (cleanupAll=true).");
        observer.disconnect(); observer = null;
    } else if (observer && !cleanupAll && !isEditPage()) {
        logDebug("performCleanup: Disconnecting observer (not on edit page, not cleanupAll).");
        observer.disconnect(); observer = null;
    }

    logDebug("performCleanup: Removing combined tooltip listeners from currentTableContainer:", currentTableContainer);
    removeCombinedTooltipListeners(currentTableContainer);
    ensureFeatureReadyAndRun('percentages', 'removeAndReset');
    ensureFeatureReadyAndRun('conversionRate', 'remove');
    ensureFeatureReadyAndRun('segmentComparison', 'remove');

    if (cleanupAll || !isEditPage()) {
        ensureFeatureReadyAndRun('panelToggle', 'remove');
    }

    if (cleanupAll) {
        logDebug("performCleanup: Cleaning up global features (copyCell, stickyHeader, etc.).");
        ensureFeatureReadyAndRun('copyCell', 'remove');
        ensureFeatureReadyAndRun('stickyHeader', 'remove');
        ensureFeatureReadyAndRun('highlightSampling', 'remove');
        ensureFeatureReadyAndRun('stickyCalculator', 'remove');
    }
    stopNativeTooltipAdjustmentCheck(); removeNativeTooltipAdjustment();
    logDebug("performCleanup finished.");
}

function pollForActivation() {
    if (isEditPage()) {
        logDebug("pollForActivation: Now on an edit page. Clearing interval and running features.");
        if (activationCheckIntervalId !== null) { clearInterval(activationCheckIntervalId); activationCheckIntervalId = null; }
        runActiveFeatures();
    } else {
        logDebug("pollForActivation: Still not on an edit page.");
    }
}

function runActiveFeatures(isPopupUpdate = false) {
    if (!initialLoadComplete && !isPopupUpdate) {
        logDebug(">>> runActiveFeatures SKIPPED (initialLoadComplete is false and not a popup update).");
        return;
    }
    const onEditPage = isEditPage();
    logDebug(`>>> runActiveFeatures START. PopupUpdate: ${isPopupUpdate}, OnEditPage: ${onEditPage}, initialLoadComplete: ${initialLoadComplete}, isModifyingDOM: ${window.ga4Optimizer.isModifyingDOM}`);

    window.ga4Optimizer.isModifyingDOM = true;
    try {
        logDebug("runActiveFeatures: Set isModifyingDOM to true.");

        const anyExplorationTooltipFeatureEnabled = window.ga4Optimizer.featureStates.percentagesEnabled ||
                                                window.ga4Optimizer.featureStates.conversionRateEnabled ||
                                                window.ga4Optimizer.featureStates.segmentComparisonEnabled;
        const anyOtherExplorationFeatureEnabled = window.ga4Optimizer.featureStates.autoDetailedEnabled || window.ga4Optimizer.featureStates.panelToggleEnabled;

        if (onEditPage) {
            logDebug(">>> Branch: Running ON Exploration page logic.");
            if (activationCheckIntervalId !== null) {
                logDebug("runActiveFeatures: On edit page, clearing pollForActivation interval.");
                clearInterval(activationCheckIntervalId);
                activationCheckIntervalId = null;
            }

            if (window.ga4Optimizer.featureStates.percentagesEnabled) {
                logDebug("runActiveFeatures: Calling percentages.runCalculation");
                ensureFeatureReadyAndRun('percentages', 'runCalculation');
            } else {
                logDebug("runActiveFeatures: Calling percentages.removeAndReset");
                ensureFeatureReadyAndRun('percentages', 'removeAndReset');
            }

            if (window.ga4Optimizer.featureStates.conversionRateEnabled) {
                logDebug("runActiveFeatures: Calling conversionRate.runCalculation");
                ensureFeatureReadyAndRun('conversionRate', 'runCalculation');
            } else {
                logDebug("runActiveFeatures: Calling conversionRate.remove");
                ensureFeatureReadyAndRun('conversionRate', 'remove');
            }

            if (window.ga4Optimizer.featureStates.segmentComparisonEnabled) {
                logDebug("runActiveFeatures: Calling segmentComparison.runCalculation");
                ensureFeatureReadyAndRun('segmentComparison', 'runCalculation');
            } else {
                logDebug("runActiveFeatures: Calling segmentComparison.remove");
                ensureFeatureReadyAndRun('segmentComparison', 'remove');
            }

            if (window.ga4Optimizer.featureStates.panelToggleEnabled) {
                logDebug("runActiveFeatures: Calling panelToggle.runCalculation (on edit page)");
                ensureFeatureReadyAndRun('panelToggle', 'runCalculation');
            } else {
                logDebug("runActiveFeatures: Calling panelToggle.remove (on edit page, but feature disabled)");
                ensureFeatureReadyAndRun('panelToggle', 'remove');
            }

            if (window.ga4Optimizer.featureStates.autoDetailedEnabled) {
                logDebug("runActiveFeatures: AutoDetailed is enabled, calling runAutoDetailedWithDebounce (on edit page)");
                runAutoDetailedWithDebounce();
            } else {
                 logDebug("runActiveFeatures: AutoDetailed is disabled or not on edit page, not running.");
            }

            if (anyExplorationTooltipFeatureEnabled) {
                const tableContainer = document.querySelector('div.aplos-chart-container');
                if (tableContainer) {
                    logDebug("runActiveFeatures: Adding/Ensuring combined tooltip listeners.");
                    addCombinedTooltipListeners(tableContainer);
                } else {
                    logDebug("runActiveFeatures: Table container not found for combined tooltips. Removing if any.");
                    removeCombinedTooltipListeners(currentTableContainer);
                }
            } else {
                logDebug("runActiveFeatures: No exploration tooltip features enabled. Removing combined tooltip listeners.");
                removeCombinedTooltipListeners(currentTableContainer || document.querySelector('div.aplos-chart-container'));
            }

        } else {
            logDebug(">>> Branch: Running NOT on Exploration page logic.");
            performCleanup(false);

            logDebug("runActiveFeatures: Calling panelToggle.remove (not on edit page)");
            ensureFeatureReadyAndRun('panelToggle', 'remove');

            if ((anyExplorationTooltipFeatureEnabled || anyOtherExplorationFeatureEnabled) && activationCheckIntervalId === null) {
                logDebug("runActiveFeatures: Not on edit page, but some exploration features are on. Starting pollForActivation.");
                activationCheckIntervalId = setInterval(pollForActivation, ACTIVATION_CHECK_INTERVAL);
            } else if (!(anyExplorationTooltipFeatureEnabled || anyOtherExplorationFeatureEnabled) && activationCheckIntervalId !== null) {
                 logDebug("runActiveFeatures: Not on edit page, and no exploration features on. Stopping pollForActivation.");
                 clearInterval(activationCheckIntervalId);
                 activationCheckIntervalId = null;
            }
        }

        if (window.ga4Optimizer.featureStates.copyCellEnabled) {
            logDebug("runActiveFeatures: Calling copyCell.runCalculation");
            ensureFeatureReadyAndRun('copyCell', 'runCalculation');
        } else {
            logDebug("runActiveFeatures: Calling copyCell.remove");
            ensureFeatureReadyAndRun('copyCell', 'remove');
        }

        if (window.ga4Optimizer.featureStates.stickyHeaderEnabled) {
            logDebug("runActiveFeatures: Calling stickyHeader.runCalculation");
            ensureFeatureReadyAndRun('stickyHeader', 'runCalculation');
        } else {
            logDebug("runActiveFeatures: Calling stickyHeader.remove");
            ensureFeatureReadyAndRun('stickyHeader', 'remove');
        }

        if (window.ga4Optimizer.featureStates.highlightSamplingEnabled) {
            logDebug("runActiveFeatures: Calling highlightSampling.runCalculation");
            ensureFeatureReadyAndRun('highlightSampling', 'runCalculation');
        } else {
            logDebug("runActiveFeatures: Calling highlightSampling.remove");
            ensureFeatureReadyAndRun('highlightSampling', 'remove');
        }

        if (window.ga4Optimizer.featureStates.stickyCalculatorEnabled) {
            logDebug("runActiveFeatures: Calling stickyCalculator.runCalculation");
            ensureFeatureReadyAndRun('stickyCalculator', 'runCalculation');
        } else {
            logDebug("runActiveFeatures: Calling stickyCalculator.remove");
            ensureFeatureReadyAndRun('stickyCalculator', 'remove');
        }

        logDebug("runActiveFeatures: Checking if observer setup is needed (initialLoadComplete:", initialLoadComplete, ")");
        if (initialLoadComplete) {
            setupObserver();
        }

    } catch (error) {
        errorDebug("<<<<< CRITICAL ERROR within runActiveFeatures main block:", error);
    } finally {
        requestAnimationFrame(() => {
            window.ga4Optimizer.isModifyingDOM = false;
            logDebug("<<< runActiveFeatures END. isModifyingDOM reset to false.");
        });
    }
}


function runFeaturesWithDebounce() {
    logDebug("runFeaturesWithDebounce: Debounce triggered.");
    clearTimeout(featureDebounceTimer);
    featureDebounceTimer = setTimeout(() => {
        logDebug("runFeaturesWithDebounce: Debounced timeout executing runActiveFeatures.");
        runActiveFeatures();
    }, 750);
}

function runAutoDetailedWithDebounce() {
    logDebug("runAutoDetailedWithDebounce: Debounce triggered.");
    clearTimeout(autoDetailedDebounceTimer);
    autoDetailedDebounceTimer = setTimeout(() => {
        logDebug("runAutoDetailedWithDebounce: Debounced timeout executing autoDetailed.triggerSequence.");
        if (initialLoadComplete && isEditPage() && window.ga4Optimizer.featureStates.autoDetailedEnabled) {
            ensureFeatureReadyAndRun('autoDetailed', 'triggerSequence');
        } else {
            logDebug("runAutoDetailedWithDebounce: Conditions not met for autoDetailed.triggerSequence (initialLoadComplete:", initialLoadComplete, "isEditPage:", isEditPage(), "autoDetailedEnabled:", window.ga4Optimizer.featureStates.autoDetailedEnabled,")");
        }
    }, 500);
}

function observerCallback(mutationsList, observerInstance) {
    if (window.ga4Optimizer.isModifyingDOM) {
        return;
    }
     if (!initialLoadComplete && !observerInstance?.forcedByPopup) {
        logDebug("ObserverCallback: Skipped due to initialLoadComplete = false and not forced by popup.");
        return;
     }

    let relevantChangeDetected = false;
    for (const mutation of mutationsList) {
        if ( mutation.type === 'childList' || (mutation.type === 'attributes' && ['class', 'style', 'hidden', 'aria-label', 'title'].includes(mutation.attributeName)) ) {
            const targetElement = mutation.target;

            const relevantAreaSelectors = [
                'div.aplos-chart-container',
                'ga-exploration-view',
                'ga-canvas',
                '.exploration-sidebar',
                '.report-options-panel',
                'ga-reporting-table',
                '.table-scroller',
                'ga-responsive-panel-layout',
                'ga-data-panel',
                'ga-settings-panel',
                'ga-dialog-badge',
                'vero-analysis-data-quality-icon',
                'quality-icon',
                'div.canvas-quality-icon',
                PANEL_TOGGLE_MAIN_LAYOUT_SELECTOR_FOR_OBSERVER,
                PANEL_TOGGLE_MINIMIZED_CONTAINER_SELECTOR_FOR_OBSERVER
            ].join(',');

            if (targetElement && targetElement.nodeType === Node.ELEMENT_NODE) {
                if (!targetElement.closest('#ga4-optimizer-copy-tooltip, #' + COMBINED_TOOLTIP_ID + ', #ga4o-panel-toggle-button, #ga4o-sticky-calculator-widget, [id^="ga4-optimizer-notification-"]')) {
                    if (targetElement.closest(relevantAreaSelectors) || relevantAreaSelectors.split(',').some(sel => targetElement.matches(sel.trim()))) {
                        logDebug("ObserverCallback: Relevant change detected in/on target:", targetElement, "Mutation type:", mutation.type, "Attribute:", mutation.attributeName);
                        relevantChangeDetected = true;
                        break;
                    }
                }
            }
        }
    }

    if (relevantChangeDetected) {
        logDebug("ObserverCallback: Relevant change detected. Triggering runFeaturesWithDebounce.");
        runFeaturesWithDebounce();
    }
};

function setupObserver() {
    const observerNeeded = Object.values(window.ga4Optimizer.featureStates).some(state => state === true);
    logDebug(`setupObserver: Called. Observer needed: ${observerNeeded}, InitialLoadComplete: ${initialLoadComplete}, Observer exists: ${!!observer}`);

    if (!initialLoadComplete) {
        logDebug("setupObserver: Bailed, initialLoadComplete is false.");
        return;
    }

    if (observerNeeded && !observer) {
        observer = new MutationObserver(observerCallback);
        const targetNode = document.body;
        if (!targetNode) {
            errorDebug("setupObserver: Cannot setup observer: document.body is null.");
            observer = null; return;
        }
        const observerConfig = { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-label', 'title'] };
        try {
            observer.observe(targetNode, observerConfig);
            logDebug("setupObserver: MutationObserver STARTED observing document.body.");
        } catch (error) {
            errorDebug("setupObserver: Error observing targetNode:", error);
            observer = null;
        }
    } else if (!observerNeeded && observer) {
        logDebug("setupObserver: No features active that need an observer, or observer already exists but not needed. Disconnecting.");
        observer.disconnect();
        observer = null;
    } else if (observerNeeded && observer) {
        logDebug("setupObserver: Observer already exists and is needed. No action.");
    } else {
        logDebug("setupObserver: Observer not needed and does not exist. No action.");
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logDebug(`(Message) Received: Action='${request.action}'`);
  let messageProcessed = false;

  if (request.action === "updateFeatureState") {
      messageProcessed = true;
      if (!request.featureKey || typeof request.enabled !== 'boolean') {
          errorDebug("(Message) Invalid updateFeatureState message:", request);
          sendResponse({ status: "Invalid message" }); return true;
      }
      if (request.featureKey === 'ga4DebuggingEnabled') {
          window.ga4Optimizer.featureStates[request.featureKey] = request.enabled;
          window.ga4Optimizer.debugModeEnabled = request.enabled;
          logDebug(`(Message) Debugging for content script directly set to: ${request.enabled}`);
          sendResponse({ status: "State noted for ga4DebuggingEnabled by content script", enabled: request.enabled }); return true;
      }
      const featureKey = request.featureKey;
      const newState = request.enabled;
      if (window.ga4Optimizer.featureStates.hasOwnProperty(featureKey)) {
          const oldState = window.ga4Optimizer.featureStates[featureKey];
          if (oldState !== newState || popupUpdateDebounceTimer) {
              window.ga4Optimizer.featureStates[featureKey] = newState;
              logDebug(`(Message) State updated for ${featureKey} to ${newState}. Scheduling debounced feature run.`);
              clearTimeout(popupUpdateDebounceTimer);
              popupUpdateDebounceTimer = setTimeout(() => {
                  logDebug(`(Message) Debounced single update: Triggering feature check (forced by popup).`);
                  runActiveFeatures(true);
                  popupUpdateDebounceTimer = null;
              }, POPUP_UPDATE_DEBOUNCE_DELAY);

              if (featureKey === 'autoDetailedEnabled' && newState === true && isEditPage()) {
                  logDebug("(Message) AutoDetailed enabled by popup, triggering its debounce.");
                  runAutoDetailedWithDebounce();
              }
              sendResponse({ status: `State updated for ${featureKey}`, enabled: newState });
          } else {
              logDebug(`(Message) State already set for ${featureKey} to ${newState}. No action needed.`);
              sendResponse({ status: `State already set for ${featureKey}`, enabled: newState });
          }
      } else {
          warnDebug("(Message) Unknown/background feature key received for single update:", featureKey);
          sendResponse({ status: "Unknown/background feature key" });
      }
      return true;
  } else if (request.action === "updateMultipleFeatureStates") {
      messageProcessed = true;
      if (request.changedStates && typeof request.changedStates === 'object') {
          let anyStateActuallyChanged = false;
          logDebug("(Message) Processing multiple feature states update:", request.changedStates);
          Object.keys(request.changedStates).forEach(featureKey => {
              if (featureKey === 'ga4DebuggingEnabled') {
                  const newDebugState = !!request.changedStates[featureKey];
                  window.ga4Optimizer.featureStates[featureKey] = newDebugState;
                  window.ga4Optimizer.debugModeEnabled = newDebugState;
                  logDebug(`(Message) Debugging for content script directly set to (multi): ${newDebugState}`);
                  return;
              }
              if (window.ga4Optimizer.featureStates.hasOwnProperty(featureKey)) {
                  const newState = !!request.changedStates[featureKey];
                  if (window.ga4Optimizer.featureStates[featureKey] !== newState) {
                      window.ga4Optimizer.featureStates[featureKey] = newState;
                      logDebug(`(Message) Multi-update for ${featureKey} to ${newState}`);
                      anyStateActuallyChanged = true;
                      if (featureKey === 'autoDetailedEnabled' && newState === true && isEditPage()) {
                          logDebug("(Message) AutoDetailed enabled by multi-update, triggering its debounce.");
                          runAutoDetailedWithDebounce();
                      }
                  }
              } else {
                  warnDebug("(Message) Unknown/background feature key received in multi-update:", featureKey);
              }
          });

          if (anyStateActuallyChanged || popupUpdateDebounceTimer) {
              logDebug(`(Message) Multi-update processed. Triggering debounced feature check (forced by popup). anyStateActuallyChanged: ${anyStateActuallyChanged}`);
              clearTimeout(popupUpdateDebounceTimer);
              popupUpdateDebounceTimer = setTimeout(() => {
                  runActiveFeatures(true);
                  popupUpdateDebounceTimer = null;
              }, POPUP_UPDATE_DEBOUNCE_DELAY);
          }
          sendResponse({ status: "Multiple states processed", allChanged: anyStateActuallyChanged });
      } else {
          errorDebug("(Message) Invalid multiple states message:", request);
          sendResponse({ status: "Invalid multiple states message" });
      }
      return true;
  } else if (request.action === "showMasterToggleNotification") {
      messageProcessed = true;
      if (request.notificationType) {
          logDebug(`(Message) Received request to show master toggle notification: ${request.notificationType}`);
          let message = "";
          let idSuffix = "";
          if (request.notificationType === "allDisabled") {
              message = "All GA4 Optimizer features disabled. A page reload may be required for some changes.";
              idSuffix = "master_all_disabled";
          } else if (request.notificationType === "recommendedEnabled") {
              message = "Recommended GA4 Optimizer features enabled. A page reload may be required for some changes.";
              idSuffix = "master_reco_enabled";
          }
          if (message) {
              showOptimizerNotification(message, 4000, idSuffix);
              sendResponse({ status: "Master toggle notification displayed" });
          } else {
              warnDebug("(Message) Unknown master toggle notification type:", request.notificationType);
              sendResponse({ status: "Unknown master toggle notification type" });
          }
      } else {
          errorDebug("(Message) Invalid master toggle notification message:", request);
          sendResponse({ status: "Invalid master toggle notification message" });
      }
      return true;
  } else if (request.action === "updateFeatureStateFromContent") {
      messageProcessed = true;
      if (!request.featureKey || typeof request.enabled !== 'boolean') {
          errorDebug("(Message) Invalid updateFeatureStateFromContent message:", request);
          sendResponse({ status: "Invalid message from content module" }); return true;
      }
      const featureKey = request.featureKey;
      const newState = request.enabled;
      if (window.ga4Optimizer.featureStates.hasOwnProperty(featureKey)) {
          const oldState = window.ga4Optimizer.featureStates[featureKey];
          if (oldState !== newState) {
              window.ga4Optimizer.featureStates[featureKey] = newState;
              logDebug(`(Message) State for ${featureKey} updated by content module to ${newState}. Saving to storage.`);
              chrome.storage.sync.set({ [featureKey]: newState }, () => {
                  if (chrome.runtime.lastError) errorDebug(`(Message) Failed to save state from content for ${featureKey}: ${chrome.runtime.lastError.message}`);
                  else logDebug(`(Message) Successfully saved ${featureKey}:${newState} to storage from content module.`);
              });
              sendResponse({ status: `State updated by content for ${featureKey}`, enabled: newState });
          } else {
              sendResponse({ status: `State already set by content for ${featureKey}`, enabled: newState });
          }
      } else {
          warnDebug("(Message) Unknown feature key from content module:", featureKey);
          sendResponse({ status: "Unknown feature key from content" });
      }
      return true;
  }

  if (!messageProcessed) {
    logDebug(`(Message) Action '${request.action}' not handled explicitly for async response or was synchronous.`);
  }
  return !messageProcessed;
});


function initializeExtension() {
    logDebug("(Init) Starting initializeExtension.");

    const absoluteDefaultStates = {
        percentagesEnabled: true, autoDetailedEnabled: false, conversionRateEnabled: true,
        copyCellEnabled: true, stickyHeaderEnabled: true, highlightSamplingEnabled: true,
        segmentComparisonEnabled: true, panelToggleEnabled: true, stickyCalculatorEnabled: true,
        ga4DebuggingEnabled: false
    };

    if (!chrome.storage || !chrome.storage.sync) {
        errorDebug("(Init) chrome.storage.sync API not available! Using initial defaults.");
        Object.keys(absoluteDefaultStates).forEach(key => {
             if (window.ga4Optimizer.featureStates.hasOwnProperty(key)) {
                window.ga4Optimizer.featureStates[key] = absoluteDefaultStates[key];
            }
        });
        window.ga4Optimizer.debugModeEnabled = absoluteDefaultStates.ga4DebuggingEnabled;

        initialLoadComplete = true;
        logDebug("(Init) Initial load complete (no storage API). Final states:", JSON.parse(JSON.stringify(window.ga4Optimizer.featureStates)));
        runActiveFeatures();
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('popstate', handlePopState);
        return;
    }

    const allKeysToFetch = Object.keys(window.ga4Optimizer.featureStates);
    chrome.storage.sync.get(allKeysToFetch, (result) => {
        if (chrome.runtime.lastError) {
            errorDebug(`(Init) Error loading settings: ${chrome.runtime.lastError.message}. Using defined defaults.`);
            allKeysToFetch.forEach(key => {
                window.ga4Optimizer.featureStates[key] = absoluteDefaultStates[key];
            });
        } else {
            logDebug("(Init) Settings loaded from storage:", result);
            allKeysToFetch.forEach(key => {
                window.ga4Optimizer.featureStates[key] = result[key] !== undefined ? !!result[key] : absoluteDefaultStates[key];
            });
        }
        window.ga4Optimizer.debugModeEnabled = !!window.ga4Optimizer.featureStates.ga4DebuggingEnabled;

        initialLoadComplete = true;
        logDebug("(Init) Initial load complete. Final states:", JSON.parse(JSON.stringify(window.ga4Optimizer.featureStates)));
        runActiveFeatures();
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('popstate', handlePopState);
    });
}

function handleHashChange() {
    logDebug("handleHashChange: Hash changed to", window.location.hash, ". Calling performCleanup and runActiveFeatures.");
    performCleanup(false);
    runActiveFeatures();
}
function handlePopState() {
    logDebug("handlePopState: Popstate event. Calling performCleanup and runActiveFeatures.");
    performCleanup(false);
    runActiveFeatures();
}

window.ga4Optimizer.toggleContentScriptDebug = function(enable) {
    window.ga4Optimizer.debugModeEnabled = typeof enable === 'boolean' ? enable : !window.ga4Optimizer.debugModeEnabled;
    console.log(`GA4 Optimizer (CS): Debug logging set to ${window.ga4Optimizer.debugModeEnabled}.`);
};

initializeExtension();
console.log("GA4 Optimizer: Core script initialization started (v6.0.5). Loading state from storage...");
;