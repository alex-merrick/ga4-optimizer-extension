/**
 * feature_sticky_calculator.js - Logic for the Sticky Conversion Calculator
 * Part of the GA4 Optimizer Extension
 * VERSION: 1.7.7 - Reliably opens panel in viewport on first open and subsequent opens.
 *                 - Uses panel.offsetLeft/Top as base for viewport adjustments.
 */
(function() { // Start of IIFE
    console.log("GA4 Optimizer: Sticky Calculator Feature script loaded (v1.7.7).");

    window.ga4Optimizer = window.ga4Optimizer || {};
    window.ga4Optimizer.stickyCalculator = {
        isInitialized: false,
        isPanelOpen: false,
        isPanelDragging: false, 
        isWidgetDragging: false, 
        widgetDragMoved: false, 
        dragThreshold: 5,
        initialMouseX: 0, initialMouseY: 0,
        dragStartMouseX: 0, dragStartMouseY: 0,
        dragStartElementLeft: 0, dragStartElementTop: 0,
        elements: {
            widgetContainer: null,
            toggleButton: null,
            calculatorPanel: null,
            panelHeader: null,
            conv1Input: null,
            total1Input: null,
            cr1Result: null,
            conv2Input: null,
            total2Input: null,
            cr2Result: null,
            absDiffResult: null,
            relUpliftResult: null,
            clearButton: null,
            closePanelButton: null
        }
    };

    const logCalcDebug = (...args) => { if (window.ga4Optimizer?.debugModeEnabled) console.log("GA4 Optimizer (StickyCalc):", ...args); };
    const CALCULATOR_WIDGET_POSITION_KEY = 'ga4oStickyCalcWidgetPosition';

    const NATIVE_TOOLTIP_PANEL_SELECTORS_CALC = [
        '#ga-shared-tooltip-popup',
        '.mat-mdc-tooltip.mdc-tooltip',
        '.mat-tooltip.mat-tooltip-panel',
        '.cdk-overlay-container .mat-mdc-tooltip.mdc-tooltip',
        '.cdk-overlay-container .mat-tooltip.mat-tooltip-panel'
    ].join(', ');
    const MAT_TOOLTIP_SHOWN_CLASS_CALC = 'mat-mdc-tooltip-trigger--shown';

    function hideNativeGa4TooltipsForDrag() {
        const tooltipPanels = document.querySelectorAll(NATIVE_TOOLTIP_PANEL_SELECTORS_CALC);
        tooltipPanels.forEach(panel => {
            const style = window.getComputedStyle(panel);
            if (style.visibility !== 'hidden' && style.opacity !== '0' && style.display !== 'none') {
                panel.style.visibility = 'hidden';
                panel.style.opacity = '0';
            }
        });
        const tooltipTriggers = document.querySelectorAll(`.${MAT_TOOLTIP_SHOWN_CLASS_CALC}`);
        tooltipTriggers.forEach(trigger => {
            trigger.classList.remove(MAT_TOOLTIP_SHOWN_CLASS_CALC);
            if (typeof trigger.blur === 'function') trigger.blur();
        });
    }

    function createSVGIcon(pathData, viewBox = "0 0 24 24") {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", viewBox);
        svg.style.width = "24px";
        svg.style.height = "24px";
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", pathData);
        svg.appendChild(path);
        return svg;
    }

    async function loadWidgetPosition() {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.elements.widgetContainer) return;
        try {
            const result = await new Promise(resolve => chrome.storage.sync.get([CALCULATOR_WIDGET_POSITION_KEY], resolve));
            if (chrome.runtime.lastError) {
                logCalcDebug("Error loading widget position:", chrome.runtime.lastError.message); return;
            }
            const position = result[CALCULATOR_WIDGET_POSITION_KEY];
            if (position && position.left !== undefined && position.top !== undefined) {
                sc.elements.widgetContainer.style.left = position.left;
                sc.elements.widgetContainer.style.top = position.top;
                sc.elements.widgetContainer.style.right = 'auto';
                sc.elements.widgetContainer.style.bottom = 'auto';
                sc.elements.widgetContainer.dataset.widgetHasBeenDragged = 'true';
            } else {
                sc.elements.widgetContainer.style.left = ''; 
                sc.elements.widgetContainer.style.top = '';  
                sc.elements.widgetContainer.style.right = '';
                sc.elements.widgetContainer.style.bottom = '';
                delete sc.elements.widgetContainer.dataset.widgetHasBeenDragged;
            }
        } catch (e) { logCalcDebug("Exception loading widget position:", e); }
    }

    function saveWidgetPosition() {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.elements.widgetContainer || sc.elements.widgetContainer.dataset.widgetHasBeenDragged !== 'true') {
            if (chrome.runtime?.id) {
                chrome.storage.sync.remove([CALCULATOR_WIDGET_POSITION_KEY], () => {
                    if (chrome.runtime.lastError) logCalcDebug("Error clearing widget position:", chrome.runtime.lastError.message);
                });
            }
            return;
        }
        const position = { left: sc.elements.widgetContainer.style.left, top: sc.elements.widgetContainer.style.top };
        if (chrome.runtime?.id) {
            chrome.storage.sync.set({ [CALCULATOR_WIDGET_POSITION_KEY]: position }, () => {
                if (chrome.runtime.lastError) logCalcDebug("Error saving widget position:", chrome.runtime.lastError.message);
            });
        }
    }

    function buildHTML() {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (sc.elements.widgetContainer) return;

        sc.elements.widgetContainer = document.createElement('div');
        sc.elements.widgetContainer.id = 'ga4o-sticky-calculator-widget';
        loadWidgetPosition();

        sc.elements.toggleButton = document.createElement('button');
        sc.elements.toggleButton.id = 'ga4o-sticky-calc-toggle';
        sc.elements.toggleButton.title = 'Open/Close & Drag Calculator Widget';
        sc.elements.toggleButton.appendChild(createSVGIcon("M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4H7V7h10v2z"));
        sc.elements.widgetContainer.appendChild(sc.elements.toggleButton);

        sc.elements.calculatorPanel = document.createElement('div');
        sc.elements.calculatorPanel.id = 'ga4o-sticky-calc-panel';
        sc.elements.calculatorPanel.style.display = 'none';

        let html = `
            <div class="ga4o-calc-header" id="ga4o-calc-panel-header">
                <span>Quick CR Calculator</span>
                <button id="ga4o-calc-close-panel" title="Close Calculator">×</button>
            </div>
            <div class="ga4o-calc-section">
                <label>CR 1:</label>
                <div class="ga4o-calc-row">
                    <input type="number" id="ga4o-calc-conv1" placeholder="Conv." aria-label="Conversions for CR1"> /
                    <input type="number" id="ga4o-calc-total1" placeholder="Total" aria-label="Total for CR1">
                    <span class="ga4o-calc-result">= <span id="ga4o-calc-cr1-result">-</span> %</span>
                </div>
            </div>
            <div class="ga4o-calc-section">
                <label>CR 2:</label>
                <div class="ga4o-calc-row">
                    <input type="number" id="ga4o-calc-conv2" placeholder="Conv." aria-label="Conversions for CR2"> /
                    <input type="number" id="ga4o-calc-total2" placeholder="Total" aria-label="Total for CR2">
                    <span class="ga4o-calc-result">= <span id="ga4o-calc-cr2-result">-</span> %</span>
                </div>
            </div>
            <div class="ga4o-calc-section">
                <label>Compare (CR2 vs CR1):</label>
                <div class="ga4o-calc-comparison-results">
                    <div>Abs. Diff: <strong id="ga4o-calc-abs-diff">-</strong> pp</div>
                    <div>Rel. Uplift: <strong id="ga4o-calc-rel-uplift">-</strong> %</div>
                </div>
            </div>
            <div class="ga4o-calc-actions">
                <button id="ga4o-calc-clear">Clear All</button>
            </div>
        `;
        sc.elements.calculatorPanel.innerHTML = html;
        sc.elements.widgetContainer.appendChild(sc.elements.calculatorPanel);
        document.body.appendChild(sc.elements.widgetContainer);

        // Cache other elements
        sc.elements.panelHeader = document.getElementById('ga4o-calc-panel-header');
        sc.elements.conv1Input = document.getElementById('ga4o-calc-conv1');
        sc.elements.total1Input = document.getElementById('ga4o-calc-total1');
        sc.elements.cr1Result = document.getElementById('ga4o-calc-cr1-result');
        sc.elements.conv2Input = document.getElementById('ga4o-calc-conv2');
        sc.elements.total2Input = document.getElementById('ga4o-calc-total2');
        sc.elements.cr2Result = document.getElementById('ga4o-calc-cr2-result');
        sc.elements.absDiffResult = document.getElementById('ga4o-calc-abs-diff');
        sc.elements.relUpliftResult = document.getElementById('ga4o-calc-rel-uplift');
        sc.elements.clearButton = document.getElementById('ga4o-calc-clear');
        sc.elements.closePanelButton = document.getElementById('ga4o-calc-close-panel');
    }

    function calculateAndDisplay() {
        const sc = window.ga4Optimizer.stickyCalculator;
        const conv1 = parseFloat(sc.elements.conv1Input.value);
        const total1 = parseFloat(sc.elements.total1Input.value);
        const conv2 = parseFloat(sc.elements.conv2Input.value);
        const total2 = parseFloat(sc.elements.total2Input.value);
        let cr1 = NaN;
        if (!isNaN(conv1) && !isNaN(total1) && total1 > 0) {
            cr1 = (conv1 / total1) * 100;
            sc.elements.cr1Result.textContent = cr1.toFixed(2);
        } else { sc.elements.cr1Result.textContent = '-'; }
        let cr2 = NaN;
        if (!isNaN(conv2) && !isNaN(total2) && total2 > 0) {
            cr2 = (conv2 / total2) * 100;
            sc.elements.cr2Result.textContent = cr2.toFixed(2);
        } else { sc.elements.cr2Result.textContent = '-'; }
        if (!isNaN(cr1) && !isNaN(cr2)) {
            const absDiff = cr2 - cr1;
            sc.elements.absDiffResult.textContent = absDiff.toFixed(2);
            if (cr1 !== 0) {
                const relUplift = (absDiff / Math.abs(cr1)) * 100;
                sc.elements.relUpliftResult.textContent = relUplift.toFixed(2);
            } else { sc.elements.relUpliftResult.textContent = (cr2 > 0) ? '∞' : (cr2 < 0 ? '-∞' : '-'); }
        } else {
            sc.elements.absDiffResult.textContent = '-';
            sc.elements.relUpliftResult.textContent = '-';
        }
    }

    function clearAllFields() {
        const sc = window.ga4Optimizer.stickyCalculator;
        sc.elements.conv1Input.value = ''; sc.elements.total1Input.value = '';
        sc.elements.conv2Input.value = ''; sc.elements.total2Input.value = '';
        calculateAndDisplay();
    }

    function ensurePanelInViewport(panel, widgetContainer) {
        const panelRect = panel.getBoundingClientRect(); // Panel's absolute screen position
        
        // Use panel.offsetLeft and panel.offsetTop as the base for current relative position
        // These reflect the panel's actual rendered top/left relative to widgetContainer
        // whether positioned by CSS or previous JS dragging/adjustment.
        const currentRelativeLeft = panel.offsetLeft;
        const currentRelativeTop = panel.offsetTop;
        
        let screenAdjustX = 0;
        let screenAdjustY = 0;

        if (panelRect.left < 0) screenAdjustX = -panelRect.left;
        else if (panelRect.right > window.innerWidth) screenAdjustX = window.innerWidth - panelRect.right;
        
        if (panelRect.top < 0) screenAdjustY = -panelRect.top;
        else if (panelRect.bottom > window.innerHeight && panelRect.height < window.innerHeight) screenAdjustY = window.innerHeight - panelRect.bottom;
        
        if (screenAdjustX !== 0 || screenAdjustY !== 0) {
            const newRelativeLeft = currentRelativeLeft + screenAdjustX;
            const newRelativeTop = currentRelativeTop + screenAdjustY;

            panel.style.left = `${newRelativeLeft}px`;
            panel.style.top = `${newRelativeTop}px`;
            panel.style.right = 'auto'; 
            panel.style.bottom = 'auto'; 
            panel.dataset.viewportAdjusted = 'true'; 
            logCalcDebug("Panel position viewport-adjusted. New relative L/T:", newRelativeLeft, newRelativeTop);
        } else {
            // If no adjustment was made, clear the flag if it exists,
            // so that if !panelHeaderDragged, it can revert to CSS next time.
             delete panel.dataset.viewportAdjusted;
        }
    }


    function togglePanel(forceOpen) {
        const sc = window.ga4Optimizer.stickyCalculator;
        const panel = sc.elements.calculatorPanel;
        const open = typeof forceOpen === 'boolean' ? forceOpen : !sc.isPanelOpen;

        if (open) {
            panel.style.display = 'flex';
            
            // If the panel was NOT dragged by its own header, reset its explicit positioning
            // to allow CSS to dictate its initial placement for the current widgetContainer position.
            // ensurePanelInViewport will then adjust this CSS-derived position if needed.
            if (panel.dataset.panelHeaderDragged !== 'true') {
                panel.style.top = 'auto'; 
                panel.style.left = 'auto'; 
                panel.style.bottom = '';  // Allow CSS `bottom: calc(100% + 8px)`
                panel.style.right = '';   // Allow CSS `right: 50%` and `transform`
                delete panel.dataset.viewportAdjusted; // Start fresh for viewport check
            }
            // If panelHeaderDragged IS true, its explicit style.left/top (relative to widget)
            // will be used as the starting point by ensurePanelInViewport.
            
            requestAnimationFrame(() => {
                if (sc.elements.calculatorPanel && sc.elements.widgetContainer) { // Ensure elements still exist
                    ensurePanelInViewport(sc.elements.calculatorPanel, sc.elements.widgetContainer);
                }
            });

            sc.elements.toggleButton.classList.add('active');
            sc.elements.toggleButton.title = 'Close & Drag Calculator Widget';
            sc.isPanelOpen = true;
        } else {
            panel.style.display = 'none';
            sc.elements.toggleButton.classList.remove('active');
            sc.elements.toggleButton.title = 'Open & Drag Calculator Widget';
            sc.isPanelOpen = false;
        }
    }

    function onPanelDragStart(event) {
        if (event.button !== 0 || !event.target.closest('#ga4o-calc-panel-header')) return;
        event.preventDefault();
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.elements.calculatorPanel) return;
        hideNativeGa4TooltipsForDrag();
        sc.isPanelDragging = true;
        sc.elements.calculatorPanel.classList.add('ga4o-dragging');
        sc.elements.panelHeader.style.cursor = 'grabbing';
        sc.dragStartElementLeft = sc.elements.calculatorPanel.offsetLeft;
        sc.dragStartElementTop = sc.elements.calculatorPanel.offsetTop;
        sc.dragStartMouseX = event.clientX; sc.dragStartMouseY = event.clientY;
        
        sc.elements.calculatorPanel.dataset.panelHeaderDragged = 'true'; // User is dragging header
        delete sc.elements.calculatorPanel.dataset.viewportAdjusted; // User drag overrides viewport adjustment logic for this instance

        document.addEventListener('mousemove', onPanelDragMove);
        document.addEventListener('mouseup', onPanelDragEnd);
    }

    function onPanelDragMove(event) {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.isPanelDragging) return;
        const deltaX = event.clientX - sc.dragStartMouseX;
        const deltaY = event.clientY - sc.dragStartMouseY;
        let newPanelLeft = sc.dragStartElementLeft + deltaX;
        let newPanelTop = sc.dragStartElementTop + deltaY;
        sc.elements.calculatorPanel.style.left = newPanelLeft + 'px';
        sc.elements.calculatorPanel.style.top = newPanelTop + 'px';
        sc.elements.calculatorPanel.style.right = 'auto'; 
        sc.elements.calculatorPanel.style.bottom = 'auto';
    }

    function onPanelDragEnd() {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.isPanelDragging) return;
        sc.isPanelDragging = false;
        if (sc.elements.calculatorPanel) sc.elements.calculatorPanel.classList.remove('ga4o-dragging');
        if (sc.elements.panelHeader) sc.elements.panelHeader.style.cursor = 'grab';
        document.removeEventListener('mousemove', onPanelDragMove); // Use the correct function reference
        document.removeEventListener('mouseup', onPanelDragEnd);     // Use the correct function reference
        setTimeout(hideNativeGa4TooltipsForDrag, 0);
    }

    function onWidgetDragStart(event) {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (event.button !== 0 || event.target !== sc.elements.toggleButton) return; 
        event.preventDefault();
        if (!sc.elements.widgetContainer || !sc.elements.toggleButton) return;
        hideNativeGa4TooltipsForDrag();
        sc.isWidgetDragging = true;
        sc.widgetDragMoved = false;
        sc.initialMouseX = event.clientX; sc.initialMouseY = event.clientY;
        sc.elements.toggleButton.style.cursor = 'grabbing';
        sc.elements.widgetContainer.style.userSelect = 'none';
        const rect = sc.elements.widgetContainer.getBoundingClientRect();
        sc.dragStartElementLeft = rect.left; sc.dragStartElementTop = rect.top;
        sc.dragStartMouseX = event.clientX; sc.dragStartMouseY = event.clientY;
        document.addEventListener('mousemove', onWidgetDragMove); // Use correct function reference
        document.addEventListener('mouseup', onWidgetDragEnd);     // Use correct function reference
    }

    function onWidgetDragMove(event) {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.isWidgetDragging) return;
        const currentX = event.clientX; const currentY = event.clientY;
        const deltaX = currentX - sc.dragStartMouseX;
        const deltaY = currentY - sc.dragStartMouseY;
        if (!sc.widgetDragMoved) {
            const moveX = Math.abs(currentX - sc.initialMouseX);
            const moveY = Math.abs(currentY - sc.initialMouseY);
            if (moveX > sc.dragThreshold || moveY > sc.dragThreshold) sc.widgetDragMoved = true;
        }
        let newWidgetLeft = sc.dragStartElementLeft + deltaX;
        let newWidgetTop = sc.dragStartElementTop + deltaY;
        const widgetRect = sc.elements.widgetContainer.getBoundingClientRect();
        newWidgetLeft = Math.max(0, Math.min(newWidgetLeft, window.innerWidth - widgetRect.width));
        newWidgetTop = Math.max(0, Math.min(newWidgetTop, window.innerHeight - widgetRect.height));
        sc.elements.widgetContainer.style.left = newWidgetLeft + 'px';
        sc.elements.widgetContainer.style.top = newWidgetTop + 'px';
        sc.elements.widgetContainer.style.right = 'auto'; sc.elements.widgetContainer.style.bottom = 'auto';
        sc.elements.widgetContainer.dataset.widgetHasBeenDragged = 'true';
    }

    function onWidgetDragEnd() {
        const sc = window.ga4Optimizer.stickyCalculator;
        if (!sc.isWidgetDragging) return;
        sc.isWidgetDragging = false;
        if(sc.elements.toggleButton) sc.elements.toggleButton.style.cursor = 'grab';
        if(sc.elements.widgetContainer) sc.elements.widgetContainer.style.userSelect = '';
        document.removeEventListener('mousemove', onWidgetDragMove); // Use correct function reference
        document.removeEventListener('mouseup', onWidgetDragEnd);     // Use correct function reference
        if (sc.widgetDragMoved) saveWidgetPosition();
        setTimeout(hideNativeGa4TooltipsForDrag, 0);
    }

    function addEventListeners() {
        const sc = window.ga4Optimizer.stickyCalculator;
        sc.elements.toggleButton.addEventListener('click', (event) => {
            if (sc.widgetDragMoved) {
                sc.widgetDragMoved = false; 
                event.preventDefault(); event.stopImmediatePropagation(); return;
            }
            togglePanel();
        });
        sc.elements.toggleButton.addEventListener('mousedown', onWidgetDragStart);
        
        sc.elements.closePanelButton.addEventListener('click', () => togglePanel(false));
        sc.elements.panelHeader.addEventListener('mousedown', onPanelDragStart);
        const inputs = [
            sc.elements.conv1Input, sc.elements.total1Input,
            sc.elements.conv2Input, sc.elements.total2Input
        ];
        inputs.forEach(input => {
            input.addEventListener('input', calculateAndDisplay);
            input.addEventListener('keypress', (e) => {
                if (!((e.key >= '0' && e.key <= '9') || e.key === '.' || 
                      e.key === 'Backspace' || e.key === 'Delete' || 
                      e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab')) {
                    e.preventDefault();
                }
            });
        });
        sc.elements.clearButton.addEventListener('click', clearAllFields);
    }

    window.ga4Optimizer.stickyCalculator.runCalculation = function() {
        logCalcDebug("runCalculation called.");
        const sc = window.ga4Optimizer.stickyCalculator;
        if (sc.isInitialized) {
            if (sc.elements.widgetContainer && !document.body.contains(sc.elements.widgetContainer)) {
                document.body.appendChild(sc.elements.widgetContainer);
            }
            if (sc.elements.widgetContainer) {
                sc.elements.widgetContainer.style.display = 'block';
            }
            loadWidgetPosition();
            return;
        }
        buildHTML();
        addEventListeners();
        sc.isInitialized = true;
        logCalcDebug("Sticky Calculator Initialized.");
    };

    window.ga4Optimizer.stickyCalculator.remove = function() {
        logCalcDebug("remove called.");
        const sc = window.ga4Optimizer.stickyCalculator;
        if (sc.elements.panelHeader) sc.elements.panelHeader.removeEventListener('mousedown', onPanelDragStart);
        document.removeEventListener('mousemove', onPanelDragMove); // Remove correct reference
        document.removeEventListener('mouseup', onPanelDragEnd);     // Remove correct reference

        if (sc.elements.toggleButton) {
            sc.elements.toggleButton.removeEventListener('mousedown', onWidgetDragStart);
        }
        document.removeEventListener('mousemove', onWidgetDragMove); // Remove correct reference
        document.removeEventListener('mouseup', onWidgetDragEnd);     // Remove correct reference

        if (sc.elements.widgetContainer) sc.elements.widgetContainer.remove();
        
        Object.keys(sc.elements).forEach(key => { sc.elements[key] = null; });

        sc.isInitialized = false;
        sc.isPanelOpen = false;
        sc.isPanelDragging = false;
        sc.isWidgetDragging = false;
        sc.widgetDragMoved = false;
        logCalcDebug("Sticky Calculator Removed.");
    };

})(); // End of IIFE