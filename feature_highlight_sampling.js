/**
 * feature_highlight_sampling.js - Logic for Highlight Sampling Icon feature
 * Part of the GA4 Optimizer Extension
 * VERSION: 1.9 - Iterates over all sampling buttons and applies/removes highlight
 *                 to their respective containers individually.
 *               - Refined sampling detection logic.
 *               - Differentiated pulse animation: with shadow for Explorations,
 *                 without shadow (scale only) for Standard Reports.
 */
(function() { // Start of IIFE
    console.log("GA4 Optimizer: Highlight Sampling Feature script loaded (v1.9).");

    // --- Feature Namespace ---
    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.highlightSampling = {};

    // --- Debug Logging Helper ---
    const logHighlightDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (Highlight Sampling):", ...args); };
    const warnHighlightDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.warn("GA4 Optimizer (Highlight Sampling):", ...args); };
    const errorHighlight = (...args) => { console.error("GA4 Optimizer (Highlight Sampling):", ...args); };

    // --- Configuration ---
    const SAMPLING_STATUS_BUTTON_SELECTOR = 'ga-dialog-badge button.badge';
    const ANY_ICON_CONTAINER_SELECTOR = 'quality-icon, div.canvas-quality-icon';
    const HIGHLIGHT_CLASS = 'ga4-optimizer-highlight-sampling'; // General highlight (color, base scale)
    const PULSE_EXPLORATION_CLASS = 'ga4-optimizer-sampling-pulse-exploration'; // Pulse with shadow
    const PULSE_STANDARD_CLASS = 'ga4-optimizer-sampling-pulse-standard';   // Pulse without shadow

    // Keywords/text for determining sampling status
    const SAMPLED_KEYWORDS = ["mostly complete", "insufficient data"];
    const FULL_DATA_TEXT_LABEL = 'uses 100% of available data';
    const FULL_DATA_TEXT_TITLE = '100% of available data';


    window.ga4Optimizer.highlightSampling.runCalculation = function() {
        logHighlightDebug("Running calculation for sampling highlight...");

        const statusButtons = document.querySelectorAll(SAMPLING_STATUS_BUTTON_SELECTOR);
        const allPotentialIconContainersOnPage = document.querySelectorAll(ANY_ICON_CONTAINER_SELECTOR);
        const processedContainersInThisRun = new Set();
        
        // Refined check for Exploration pages vs Standard reports
        const currentHash = window.location.hash;
        const isExplorationPage = currentHash.includes('/analysis/');
        logHighlightDebug("Is Exploration Page:", isExplorationPage, "(Hash:", currentHash, ")");


        if (statusButtons.length === 0) {
            logHighlightDebug("No sampling status buttons found. Removing all highlights and pulse classes.");
            allPotentialIconContainersOnPage.forEach(container => {
                container.classList.remove(HIGHLIGHT_CLASS, PULSE_EXPLORATION_CLASS, PULSE_STANDARD_CLASS);
            });
            return;
        }

        statusButtons.forEach(statusButton => {
            const dialogBadge = statusButton.closest('ga-dialog-badge');
            if (!dialogBadge) {
                warnHighlightDebug("Could not find parent ga-dialog-badge for button:", statusButton);
                return;
            }

            const iconContainer = dialogBadge.closest(ANY_ICON_CONTAINER_SELECTOR);
            if (!iconContainer) {
                warnHighlightDebug("Could not find a valid icon container for dialog badge:", dialogBadge);
                return;
            }
            processedContainersInThisRun.add(iconContainer);

            const label = statusButton.getAttribute('aria-label')?.toLowerCase() || '';
            const title = statusButton.getAttribute('title')?.toLowerCase() || '';
            let shouldHighlight = false;

            const labelIsSampled = label && !label.includes(FULL_DATA_TEXT_LABEL) && SAMPLED_KEYWORDS.some(keyword => label.includes(keyword));
            const labelIsNonSampledExplicit = label && label.includes(FULL_DATA_TEXT_LABEL);
            const labelIsNonCommittal = label && !label.includes(FULL_DATA_TEXT_LABEL) && !SAMPLED_KEYWORDS.some(keyword => label.includes(keyword));
            const titleIsSampled = title && !title.includes(FULL_DATA_TEXT_TITLE) && SAMPLED_KEYWORDS.some(keyword => title.includes(keyword));

            if (labelIsSampled) {
                shouldHighlight = true;
            } else if (labelIsNonSampledExplicit) {
                if (titleIsSampled) shouldHighlight = true;
                else shouldHighlight = false;
            } else if (labelIsNonCommittal || !label) {
                if (titleIsSampled) shouldHighlight = true;
                else shouldHighlight = false;
            }
            logHighlightDebug(`Container:`, iconContainer, `ShouldHighlight: ${shouldHighlight}, Label: "${label}", Title: "${title}"`);

            // Apply or remove the base HIGHLIGHT_CLASS
            if (shouldHighlight) {
                if (!iconContainer.classList.contains(HIGHLIGHT_CLASS)) {
                    iconContainer.classList.add(HIGHLIGHT_CLASS);
                    logHighlightDebug("-> HIGHLIGHT_CLASS ADDED.");
                }
            } else {
                if (iconContainer.classList.contains(HIGHLIGHT_CLASS)) {
                    iconContainer.classList.remove(HIGHLIGHT_CLASS);
                    logHighlightDebug("-> HIGHLIGHT_CLASS REMOVED.");
                }
            }

            // Apply or remove specific pulse classes
            if (shouldHighlight) {
                if (isExplorationPage) {
                    if (!iconContainer.classList.contains(PULSE_EXPLORATION_CLASS)) {
                        iconContainer.classList.add(PULSE_EXPLORATION_CLASS);
                        logHighlightDebug("-> PULSE_EXPLORATION_CLASS ADDED.");
                    }
                    if (iconContainer.classList.contains(PULSE_STANDARD_CLASS)) {
                        iconContainer.classList.remove(PULSE_STANDARD_CLASS); // Ensure other pulse is off
                        logHighlightDebug("-> PULSE_STANDARD_CLASS (incorrectly present) REMOVED.");
                    }
                } else { // Standard Report page
                    if (!iconContainer.classList.contains(PULSE_STANDARD_CLASS)) {
                        iconContainer.classList.add(PULSE_STANDARD_CLASS);
                        logHighlightDebug("-> PULSE_STANDARD_CLASS ADDED.");
                    }
                    if (iconContainer.classList.contains(PULSE_EXPLORATION_CLASS)) {
                        iconContainer.classList.remove(PULSE_EXPLORATION_CLASS); // Ensure other pulse is off
                        logHighlightDebug("-> PULSE_EXPLORATION_CLASS (incorrectly present) REMOVED.");
                    }
                }
            } else { // Not highlighting, remove all pulse classes
                if (iconContainer.classList.contains(PULSE_EXPLORATION_CLASS)) {
                    iconContainer.classList.remove(PULSE_EXPLORATION_CLASS);
                    logHighlightDebug("-> PULSE_EXPLORATION_CLASS REMOVED (no highlight).");
                }
                if (iconContainer.classList.contains(PULSE_STANDARD_CLASS)) {
                    iconContainer.classList.remove(PULSE_STANDARD_CLASS);
                    logHighlightDebug("-> PULSE_STANDARD_CLASS REMOVED (no highlight).");
                }
            }
        });

        // Clean up any pulse classes on containers that were NOT processed
        allPotentialIconContainersOnPage.forEach(container => {
            if (!processedContainersInThisRun.has(container)) {
                if (container.classList.contains(HIGHLIGHT_CLASS)) container.classList.remove(HIGHLIGHT_CLASS);
                if (container.classList.contains(PULSE_EXPLORATION_CLASS)) container.classList.remove(PULSE_EXPLORATION_CLASS);
                if (container.classList.contains(PULSE_STANDARD_CLASS)) container.classList.remove(PULSE_STANDARD_CLASS);
                if (container.classList.contains(HIGHLIGHT_CLASS) || container.classList.contains(PULSE_EXPLORATION_CLASS) || container.classList.contains(PULSE_STANDARD_CLASS) ) {
                     logHighlightDebug("Stale classes REMOVED from:", container);
                }
            }
        });
    };

    window.ga4Optimizer.highlightSampling.remove = function() {
        logHighlightDebug("Removing sampling highlight explicitly via remove().");
        const allStyledElements = document.querySelectorAll(`.${HIGHLIGHT_CLASS}, .${PULSE_EXPLORATION_CLASS}, .${PULSE_STANDARD_CLASS}`);
        allStyledElements.forEach(el => {
            el.classList.remove(HIGHLIGHT_CLASS, PULSE_EXPLORATION_CLASS, PULSE_STANDARD_CLASS);
            logHighlightDebug("Removed all sampling style classes from element:", el);
        });
    };

})(); // End of IIFE