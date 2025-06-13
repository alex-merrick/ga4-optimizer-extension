document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const addMatchBtn = document.getElementById('add-match');
    const matchContainer = document.getElementById('match-container');
    const addDontMatchBtn = document.getElementById('add-dont-match');
    const dontMatchContainer = document.getElementById('dont-match-container');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    const resultsWrapper = document.getElementById('results-wrapper');
    const ga4CreationPanel = document.getElementById('ga4-creation-panel');
    const customDefinitionsPanel = document.getElementById('custom-definitions-panel');
    const uniquePanel = document.getElementById('unique-panel');
    const commonPanel = document.getElementById('common-panel');
    const nullPanel = document.getElementById('null-panel');
    const errorPanel = document.getElementById('error-panel');
    
    const tabs = document.querySelectorAll('.results-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    const matchLogicToggle = document.getElementById('match-logic-toggle');
    const exclusionLogicToggle = document.getElementById('exclusion-logic-toggle');

    // --- Event Listeners ---
    addMatchBtn.addEventListener('click', () => createTextarea(matchContainer, 'match-data', 'Paste another positive example log here...'));
    addDontMatchBtn.addEventListener('click', () => createTextarea(dontMatchContainer, 'dont-match-data', 'Paste another negative example log here...'));
    analyzeBtn.addEventListener('click', runAnalysis);
    resetBtn.addEventListener('click', resetForm);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetPanelId = tab.dataset.tab + '-panel';
            tabPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === targetPanelId);
            });
        });
    });

    function createTextarea(container, className, placeholder) {
        const newTextArea = document.createElement('textarea');
        newTextArea.className = 'tool-textarea fade-in';
        newTextArea.placeholder = placeholder;
        container.appendChild(newTextArea);
        setTimeout(() => newTextArea.classList.remove('fade-in'), 10);
    }

    function resetForm() {
        document.querySelectorAll('.tool-textarea').forEach((area, index) => {
            const container = area.parentElement;
            if (index > 1) {
                area.remove();
            } else {
                area.value = '';
            }
        });
        if (!matchContainer.querySelector('textarea')) createTextarea(matchContainer, 'match-data', 'Paste the log for your target click here...');
        if (!dontMatchContainer.querySelector('textarea')) createTextarea(dontMatchContainer, 'dont-match-data', 'Paste the log for a similar, non-target click here...');

        resultsWrapper.classList.add('hidden');
        matchLogicToggle.checked = false;
        exclusionLogicToggle.checked = false;
    }
    
    function robustTrim(str) {
        if (!str) return '';
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }

    function parseLogData(logText) {
        const paramsMap = new Map();
        const prefixRegex = /^js\?id=.*?:[0-9]+\s/gm;
        const cleanedLog = logText.replace(prefixRegex, '');
        const trimmedLog = robustTrim(cleanedLog);

        if (!trimmedLog) return paramsMap;

        if (trimmedLog.startsWith('{') && trimmedLog.endsWith('}')) {
            const innerContent = trimmedLog.substring(1, trimmedLog.length - 1);
            const pairs = innerContent.split(/,\s*(?=[a-zA-Z0-9\._-]+\s*:)/);
            for (const pair of pairs) {
                const firstColonIndex = pair.indexOf(':');
                if (firstColonIndex > -1) {
                    let key = robustTrim(pair.substring(0, firstColonIndex)).replace(/^"|"$/g, '');
                    let value = robustTrim(pair.substring(firstColonIndex + 1)).replace(/^"|"$/g, '');
                    if (key) paramsMap.set(key, value);
                }
            }
        }
        else {
             const lines = trimmedLog.split('\n').filter(line => robustTrim(line) !== '');
            for (const line of lines) {
                const firstColonIndex = line.indexOf(':');
                if (firstColonIndex > -1) {
                    const key = robustTrim(line.substring(0, firstColonIndex));
                    let value = robustTrim(line.substring(firstColonIndex + 1));

                    if (value.endsWith(',')) {
                        value = robustTrim(value.slice(0, -1));
                    }
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    
                    if (key && key !== '_et' && key !== 'tfd') {
                        paramsMap.set(key, value);
                    }
                }
            }
        }
        return paramsMap;
    }

    function runAnalysis() {
        try {
            const matchLogs = Array.from(matchContainer.querySelectorAll('textarea')).map(t => t.value).filter(v => v.trim());
            const exclusionLogs = Array.from(dontMatchContainer.querySelectorAll('textarea')).map(t => t.value).filter(v => v.trim());

            if (matchLogs.length === 0) return showError('You must provide at least one "Positive Example" log.');
            
            const allMatchParams = matchLogs.map(parseLogData);
            const allExclusionParams = exclusionLogs.map(parseLogData);
            const isMatchAnd = matchLogicToggle.checked;
            
            // --- REWRITTEN & CORRECTED ANALYSIS LOGIC (v3 - Definitive) ---

            // 1. Aggregate all key-value sets from negative logs for easy lookup.
            const negativeKeyValues = new Map();
            allExclusionParams.forEach(log => {
                log.forEach((value, key) => {
                    if (!negativeKeyValues.has(key)) negativeKeyValues.set(key, new Set());
                    negativeKeyValues.get(key).add(value);
                });
            });

            // 2. Calculate "Unique Parameters" based on the AND/OR toggle
            const uniqueParams = new Map();
            // Get a list of all keys that appear in any positive log
            const allPositiveKeys = new Set([].concat(...allMatchParams.map(log => Array.from(log.keys()))));

            for (const key of allPositiveKeys) {
                let isPresentInAllPositive = true;
                const positiveValuesForKey = new Set();
                
                for (const log of allMatchParams) {
                    if (log.has(key)) {
                        positiveValuesForKey.add(log.get(key));
                    } else {
                        isPresentInAllPositive = false;
                    }
                }

                // Apply AND logic constraint
                if (isMatchAnd && !isPresentInAllPositive) {
                    continue; // In AND mode, if a key is missing from any positive log, skip it.
                }

                const negativeValuesForKey = negativeKeyValues.get(key) || new Set();
                const trulyUniqueValues = new Set([...positiveValuesForKey].filter(v => !negativeValuesForKey.has(v)));

                if (trulyUniqueValues.size > 0) {
                    uniqueParams.set(key, Array.from(trulyUniqueValues).join('|'));
                }
            }

            // 3. Calculate "Common Parameters" (identical across ALL provided logs)
            const commonParams = new Map();
            const allLogs = [...allMatchParams, ...allExclusionParams];
            if (allLogs.length > 0) {
                const candidateCommon = new Map(allLogs[0]);
                for (let i = 1; i < allLogs.length; i++) {
                    const currentLog = allLogs[i];
                    for (const [key, value] of candidateCommon.entries()) {
                        if (!currentLog.has(key) || currentLog.get(key) !== value) {
                            candidateCommon.delete(key);
                        }
                    }
                }
                candidateCommon.forEach((value, key) => commonParams.set(key, value));
            }

            // 4. Calculate "Common Nulls" from the final common list
            const nullParams = new Map();
            for (const [key, value] of commonParams.entries()) {
                if (String(value).trim() === '' || String(value).toLowerCase() === 'null') {
                    nullParams.set(key, value);
                    commonParams.delete(key);
                }
            }

            displayResults(uniqueParams, commonParams, nullParams);

        } catch (error) {
            console.error("Analysis Error:", error);
            showError("An unexpected error occurred. Please check the console and ensure your log data is formatted correctly.");
        }
    }
    
    function displayResults(unique, common, nulls) {
        resultsWrapper.classList.remove('hidden');
        errorPanel.innerHTML = '';
        errorPanel.classList.remove('active');
        
        generateGa4CreationContent(unique, ga4CreationPanel);
        generateCustomDefinitionsContent(unique, customDefinitionsPanel);
        generateResultsTable(unique, uniquePanel, "No unique parameters found. Try adjusting the AND/OR logic or the logs provided.", 'value', true);
        generateResultsTable(common, commonPanel, "No parameters were found to be common across ALL examples provided.", 'value', false);
        generateResultsTable(nulls, nullPanel, "No common 'null' or empty value parameters were found across ALL examples.", 'key', false);
        
        if (unique.size > 0) {
            document.querySelector('.results-tab[data-tab="unique"]').click();
        } else if (common.size > 0) {
            document.querySelector('.results-tab[data-tab="common"]').click();
        } else {
            document.querySelector('.results-tab[data-tab="null"]').click();
        }
        
        resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function generateGa4CreationContent(paramsMap, panel) {
        panel.innerHTML = '';
        if (paramsMap.size === 0) {
            panel.innerHTML = `<div class="p-4 bg-slate-100 border border-slate-200 rounded-md text-slate-500"><p>Provide positive and negative examples to generate event creation conditions.</p></div>`;
            return;
        }

        let conditionsHtml = '';
        let eventName = 'click';
        paramsMap.forEach((value, key) => {
            if (key.toLowerCase() === 'event' || key.toLowerCase() === 'en') {
                eventName = value;
                return;
            }
            const operator = value.includes('|') ? 'matches RegEx' : 'equals';
            conditionsHtml += `<li><code>${key}</code> <i>${operator}</i> <code>${value}</code></li>`;
        });

        panel.innerHTML = `
            <p class="text-slate-600 mb-4">Use these conditions to create a new, more meaningful event directly within the GA4 interface—no GTM changes required.</p>
            <h3>How to Create Events in GA4</h3>
            <ol>
                <li>In the GA4 interface, navigate to <strong>Admin > Events > Create event</strong>.</li>
                <li>Click <strong>Create</strong> and give your new custom event a name (e.g., <code>main_cta_click</code>).</li>
                <li>Under "Matching conditions," configure the following:</li>
                <ol type="a" class="ml-6 my-2">
                    <li><code>event_name</code> <i>equals</i> <code>${eventName}</code></li>
                    ${conditionsHtml}
                </ol>
                <li>Click <strong>Create</strong>. GA4 will now log your new event whenever a <code>${eventName}</code> event with these specific parameters is collected.</li>
            </ol>
        `;
    }

    function generateCustomDefinitionsContent(paramsMap, panel) {
        panel.innerHTML = '';
        const customParams = new Map(Array.from(paramsMap).filter(([key]) => key.toLowerCase() !== 'event' && key.toLowerCase() !== 'en'));

        if (customParams.size === 0) {
            panel.innerHTML = `<div class="p-4 bg-slate-100 border border-slate-200 rounded-md text-slate-500"><p>No unique parameters were found that require registration as Custom Dimensions.</p></div>`;
            return;
        }

        let paramsListHtml = '';
        customParams.forEach((value, key) => {
            paramsListHtml += `<li><code>${key}</code></li>`;
        });

        panel.innerHTML = `
            <p class="text-slate-600 mb-4">To use your unique parameters in GA4 reports (like Explorations), you must register them as Custom Dimensions.</p>
            <h3>How to Register Custom Dimensions</h3>
            <ol>
                <li>In GA4, go to <strong>Admin > Custom definitions</strong>.</li>
                <li>Under the "Custom dimensions" tab, click <strong>Create custom dimensions</strong>.</li>
                <li>For each of the unique parameters below, create a new dimension:</li>
                <ul class="list-disc ml-6 my-2">
                    ${paramsListHtml}
                </ul>
                <li>When creating, use these settings:</li>
                <ul class="list-disc ml-6 my-2">
                    <li><strong>Dimension name:</strong> A user-friendly name (e.g., "Clicked Element Class" for <code>element_class</code>).</li>
                    <li><strong>Scope:</strong> Select <strong>Event</strong>.</li>
                    <li><strong>Event parameter:</strong> Enter the exact parameter name from the list above.</li>
                </ul>
            </ol>
            <div class="important-note">
                <strong>Note:</strong> It can take 24-48 hours for data from new custom dimensions to become available in your reports.
            </div>
        `;
    }

    function generateResultsTable(paramsMap, panel, notFoundMessage, copyTarget = 'value', allowRegexLabel = false) {
        panel.innerHTML = ''; 
        if (paramsMap.size === 0) {
            panel.innerHTML = `<div class="p-4 bg-slate-100 border border-slate-200 rounded-md text-slate-500"><p>${notFoundMessage}</p></div>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'results-table';
        table.innerHTML = `<thead><tr><th>Parameter Key</th><th>Value</th><th class="text-center">Actions</th></tr></thead><tbody></tbody>`;
        const tableBody = table.querySelector('tbody');

        paramsMap.forEach((value, key) => {
            const row = tableBody.insertRow();
            const isRegex = allowRegexLabel && String(value).includes('|');
            const regexLabel = isRegex ? '<span class="regex-label">(regex)</span>' : '';
            
            const tempDiv = document.createElement('div');
            tempDiv.textContent = value;
            const escapedValue = tempDiv.innerHTML;

            const displayValue = (value||"").trim() === '' || String(value||"").toLowerCase() === 'null' ? `<span class="text-slate-400 italic">Null / Not Set</span>` : escapedValue + regexLabel;
            const buttonText = copyTarget === 'key' ? 'Copy Key' : 'Copy Value';
            const textToCopy = copyTarget === 'key' ? key : value;
            
            row.innerHTML = `
                <td data-label="Key" class="key-cell">${key}</td>
                <td data-label="Value" class="value-cell">${displayValue}</td>
                <td data-label="Action" class="copy-btn-cell text-center">
                    <button class="copy-btn">${buttonText}</button>
                </td>`;
            row.querySelector('.copy-btn').addEventListener('click', (e) => copyToClipboard(textToCopy, e.target, buttonText));
        });
        panel.appendChild(table);
    }
    
    function showError(message) {
        resultsWrapper.classList.remove('hidden');
        tabs.forEach(t => t.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        errorPanel.classList.add('active');
        errorPanel.innerHTML = `<div class="p-4 bg-red-100 border border-red-300 rounded-md text-red-800"><strong class="font-semibold">Error!</strong><p class="text-sm mt-1">${message}</p></div>`;
        resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function copyToClipboard(text, buttonElement, originalButtonText) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            buttonElement.textContent = 'Copied!';
            buttonElement.style.backgroundColor = '#22c55e';
            buttonElement.style.color = 'white';
            setTimeout(() => {
                buttonElement.textContent = originalButtonText;
                buttonElement.style.backgroundColor = '';
                buttonElement.style.color = '';
            }, 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    }
});