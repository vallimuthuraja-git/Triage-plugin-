
/**
 * Format whiteboard tags with different styling based on category
 * @param {string} whiteboardText - Raw whiteboard text
 * @returns {string} HTML with styled tags
 */
function formatWhiteboardTags(whiteboardText) {
    if (!whiteboardText || whiteboardText === 'No whiteboard data') {
        return whiteboardText;
    }

    // Split by comma and clean up whitespace
    const tags = whiteboardText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    // Categorize each tag
    const categorizedTags = tags.map(tag => {
        const lowerTag = tag.toLowerCase();

        // Date-related tags (Triaged, ETA)
        if (lowerTag.includes('triaged') || lowerTag.includes('eta')) {
            return `<span class="tag-date">${tag}</span>`;
        }

        // Status tags (JN_TRIAGED, Site_100%_failure)
        if (lowerTag.includes('jn_triaged') || lowerTag.includes('site_') ||
            lowerTag.includes('fixed_') || lowerTag.includes('more_clarification')) {
            return `<span class="tag-status">${tag}</span>`;
        }

        // Special tags (Logs, Navigation, etc.)
        if (lowerTag.includes('logs_') || lowerTag.includes('navigation_') ||
            lowerTag.includes('uui_closed') || lowerTag.includes('uui_dq_issues') ||
            lowerTag.includes('uui_reopen_issues') || lowerTag.includes('uui_aged_bug')) {
            return `<span class="tag-special">${tag}</span>`;
        }

        // Default: Issue tags (UUI issues)
        return `<span class="tag-issue">${tag}</span>`;
    });

    return categorizedTags.join(', ');
}

// Track the current active tab ID
let currentActiveTabId = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'tabActivated') {
        // Refresh data when active tab changes
        setTimeout(refreshPopupData, 100); // Small delay to ensure tab is ready
    }
});

/**
 * Refresh popup data from the current active tab
 */
function refreshPopupData() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            console.error('No active tab found');
            document.getElementById('pagetitle').innerText = 'No active tab';
            updateAgeDisplay(null);
            currentActiveTabId = null;
            return;
        }
        const tab = tabs[0];
        // Update the current active tab ID for age updates
        currentActiveTabId = tab.id;

        // Check page type and show appropriate message/functionality
        const isBugzillaDomain = tab.url && tab.url.includes('blrbugzilla.yodlee.com');
        const isSpecificBugPage = tab.url && tab.url.includes('blrbugzilla.yodlee.com/show_bug.cgi');

        if (!isBugzillaDomain) {
            // Non-Bugzilla page
            const pageTitleElement = document.getElementById('pagetitle');
            pageTitleElement.innerText = 'This extension works on Bugzilla pages only';
            pageTitleElement.style.color = '#dc3545'; // Red color
            pageTitleElement.style.fontWeight = 'bold';
            updateAgeDisplay(null);
            // Hide all buttons on non-Bugzilla pages
            document.querySelectorAll('button').forEach(btn => {
                btn.style.display = 'none';
            });
            return;
        }

        if (!isSpecificBugPage) {
            // Bugzilla domain but not a specific bug page
            const pageTitleElement = document.getElementById('pagetitle');
            pageTitleElement.innerText = 'Open any IAE bugs to use this extension';
            pageTitleElement.style.color = '#007bff'; // Blue color
            pageTitleElement.style.fontWeight = 'bold';
            updateAgeDisplay(null);
            // Hide all buttons except refresh on non-bug pages
            document.querySelectorAll('button').forEach(btn => {
                if (btn.id !== 'refreshData') btn.style.display = 'none';
            });
            return;
        }

        // Specific bug page - show all functionality
        document.querySelectorAll('button').forEach(btn => {
            btn.style.display = ''; // Reset display property
        });

        // Retry mechanism for loading data
        loadBugDataWithRetry(tab.id, 3, 1000); // 3 retries, 1 second delay
    });
}

/**
 * Load bug data with retry mechanism
 * @param {number} tabId - Tab ID to message
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 */
function loadBugDataWithRetry(tabId, maxRetries, delay) {
    let retries = 0;

    function attemptLoad() {
        chrome.tabs.sendMessage(tabId, {
            action: 'getSummary'
        }, function(response) {
            if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message || 'Unknown runtime error';
                console.warn(`Data load attempt ${retries + 1} failed:`, errorMsg);

                if (retries < maxRetries) {
                    retries++;
                    setTimeout(attemptLoad, delay);
                } else {
                    console.error('All data load attempts failed, trying content script injection...');
                    injectContentScript(tabId);
                }
                return;
            }

            if (response == null) {
                console.warn('No response received from content script');

                if (retries < maxRetries) {
                    retries++;
                    setTimeout(attemptLoad, delay);
                } else {
                    document.getElementById('pagetitle').innerText = 'No data available - content script may not be loaded';
                    updateAgeDisplay(null);
                }
                return;
            }

            // Successfully got data
            processBugData(response);
        });
    }

    attemptLoad();
}

/**
 * Process the bug data received from content script
 * @param {Object} response - Response from content script
 */
function processBugData(response) {
    const wbVar = response.wb || '';
    const rdateVar = response.rd || 'No report date';
    const bugCreationData = response.bcd; // Bug creation timestamp
    const bugId = response.bid || 'Bug ID not found'; // Bug ID

    // Update bug ID display
    updateBugIdDisplay(bugId);

    // Get any additional tags from local storage and append them to the original content
    chrome.storage.local.get('pagetitle', function(stored) {
        let finalWhiteboard = wbVar;

        // Always append stored tags to the original whiteboard content
        if (stored.pagetitle && stored.pagetitle.trim()) {
            finalWhiteboard = wbVar ? wbVar + ', ' + stored.pagetitle : stored.pagetitle;
        }

        // Update whiteboard display with optimized function
        updateWhiteboardDisplay(finalWhiteboard || 'No whiteboard data');
    });

    // Start live age updates with the creation data
    updateAgeDisplay(bugCreationData);
}

/**
 * Inject content script manually as fallback mechanism
 * @param {number} tabId - Tab ID to inject content script into
 */
function injectContentScript(tabId) {
    console.log('Attempting to inject content script for tab:', tabId);

    // First, check if content script is already running by trying a quick message
    const pingTimeout = setTimeout(() => {
        console.log('Ping timeout, assuming content script not running, proceeding with injection');
        injectNow();
    }, 500);

    chrome.tabs.sendMessage(tabId, { action: 'ping' }, function(response) {
        clearTimeout(pingTimeout);
        if (!chrome.runtime.lastError && response && response.pong) {
            console.log('Content script is already running, skipping injection');
            // Content script is already running, retry data load
            setTimeout(() => {
                loadBugDataWithRetry(tabId, 2, 500);
            }, 200);
            return;
        }

        // Content script is not running or ping failed, inject it
        injectNow();
    });

    function injectNow() {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content1.js']
        }, function(results) {
            if (chrome.runtime.lastError) {
                console.error('Content script injection failed:', chrome.runtime.lastError.message);
                document.getElementById('pagetitle').innerText = 'Unable to load data - content script injection failed. Try refreshing the page.';
                updateAgeDisplay(null);
            } else {
                console.log('Content script injected successfully, retrying data load...');
                // Wait a moment for the script to initialize, then retry
                setTimeout(() => {
                    loadBugDataWithRetry(tabId, 2, 500); // 2 more retries with shorter delay
                }, 1500);
            }
        });
    }
}

/**
 * Update age display with live seconds and scrolling digit animation
 * @param {Object} bugData - Bug creation data {timestamp, idleDays}
 */
function updateAgeDisplay(bugData) {
    // Clear any existing age update interval
    if (window.ageUpdateInterval) {
        clearInterval(window.ageUpdateInterval);
        window.ageUpdateInterval = null;
    }

    if (!bugData || !bugData.timestamp) {
        document.getElementById('bugage').innerHTML = 'N/A';
        return;
    }

    const bugTimestamp = new Date(bugData.timestamp).getTime();
    const idleMs = (bugData.idleDays || 0) * 24 * 60 * 60 * 1000;

    // Initialize the digit display structure
    initializeDigitDisplay();

    // Store previous values for animation (initialize to 0 to avoid initial animation)
    let prevDays = 0, prevHours = 0, prevMinutes = 0, prevSeconds = 0;

    function calculateAndDisplayAge() {
        const now = Date.now();
        let ageMs = now - bugTimestamp;

        // Subtract idle time
        ageMs -= (idleMs);

        // Ensure non-negative age
        ageMs = Math.max(0, ageMs);

        const ageinseconds = Math.floor(ageMs / 1000);
        const days = Math.floor(ageinseconds / 86400);
        const hours = Math.floor((ageinseconds % 86400) / 3600);
        const minutes = Math.floor((ageinseconds % 3600) / 60);
        const seconds = Math.floor(ageinseconds % 60);

        // Update digits with animation
        updateDigitsWithAnimation('days', prevDays, days);
        updateDigitsWithAnimation('hours', prevHours, hours);
        updateDigitsWithAnimation('minutes', prevMinutes, minutes);
        updateDigitsWithAnimation('seconds', prevSeconds, seconds);

        // Update previous values
        prevDays = days;
        prevHours = hours;
        prevMinutes = minutes;
        prevSeconds = seconds;

        // Apply age-based styling
        const ageDisplay = document.getElementById('bugage');
        updateAgeStyling(ageDisplay, days);
    }

    // Display immediately
    calculateAndDisplayAge();

    // Update every second
    window.ageUpdateInterval = setInterval(calculateAndDisplayAge, 1000);
}

/**
 * Initialize the digit display structure once
 */
function initializeDigitDisplay() {
    const ageDisplay = document.getElementById('bugage');

    // Create the digit structure with stacked digits 0-9
    const createDigitStack = () => {
        let stack = '';
        for (let n = 0; n <= 9; n++) {
            stack += `<span style="top: ${n * 14}px">${n}</span>`;
        }
        return stack;
    };

    const ageHTML = `
        <span class="age-label">Age:</span>
        <span class="digit-container" data-unit="days">
            <span class="digit-stack">${createDigitStack()}</span>
            <span class="digit-stack">${createDigitStack()}</span>
            <span class="digit-stack">${createDigitStack()}</span>
        </span><span class="unit-letter unit-days">d</span>
        <span class="digit-container" data-unit="hours">
            <span class="digit-stack">${createDigitStack()}</span>
            <span class="digit-stack">${createDigitStack()}</span>
        </span><span class="unit-letter unit-hours">h</span>
        <span class="digit-container" data-unit="minutes">
            <span class="digit-stack">${createDigitStack()}</span>
            <span class="digit-stack">${createDigitStack()}</span>
        </span><span class="unit-letter unit-minutes">m</span>
        <span class="digit-container" data-unit="seconds">
            <span class="digit-stack">${createDigitStack()}</span>
            <span class="digit-stack">${createDigitStack()}</span>
        </span><span class="unit-letter unit-seconds">s</span>
    `;

    ageDisplay.innerHTML = ageHTML;
}

/**
 * Update digits with scrolling animation
 * @param {string} unit - The time unit (days, hours, minutes, seconds)
 * @param {number} oldValue - Previous value
 * @param {number} newValue - New value
 */
function updateDigitsWithAnimation(unit, oldValue, newValue) {
    if (oldValue === newValue) return;

    const container = document.querySelector(`.digit-container[data-unit="${unit}"]`);
    if (!container) return;

    // Get the digit string representations
    const oldDigits = String(oldValue).padStart(unit === 'days' ? 3 : 2, '0');
    const newDigits = String(newValue).padStart(unit === 'days' ? 3 : 2, '0');

    // Update only digits that have changed
    for (let i = 0; i < oldDigits.length; i++) {
        if (oldDigits[i] !== newDigits[i]) {
            const digitStack = container.children[i];
            const digit = parseInt(newDigits[i], 10);
            const translateY = -digit * 14; // Each digit is 14px tall

            // Apply transform to all spans in the stack
            const spans = digitStack.querySelectorAll('span');
            spans.forEach(span => {
                span.style.transform = `translateY(${translateY}px)`;
            });
        }
    }
}

/**
 * Create HTML for scrolling digit age display
 * @param {number} days - Days
 * @param {number} hours - Hours
 * @param {number} minutes - Minutes
 * @param {number} seconds - Seconds
 * @returns {string} HTML string
 */
function createScrollingAgeDisplay(days, hours, minutes, seconds) {
    const padNumber = (num, digits) => String(num).padStart(digits, '0');

    const createDigitContainer = (value, unit) => {
        const digits = padNumber(value, unit === 'days' ? 3 : 2);
        const spans = digits.split('').map(digit =>
            `<span class="digit-scroll">${digit}</span>`
        ).join('');
        return `<span class="digit-container" data-unit="${unit}">${spans}</span>`;
    };

    return `
        <span class="age-label">Age:</span>
        ${createDigitContainer(days, 'days')}d
        ${createDigitContainer(hours, 'hours')}h
        ${createDigitContainer(minutes, 'minutes')}m
        ${createDigitContainer(seconds, 'seconds')}s
    `;
}

/**
 * Animate digit change with scrolling effect
 * @param {string} unit - The time unit (days, hours, minutes, seconds)
 * @param {number} oldValue - Previous value
 * @param {number} newValue - New value
 */
function animateDigitChange(unit, oldValue, newValue) {
    if (oldValue === newValue) return;

    const container = document.querySelector(`.digit-container[data-unit="${unit}"]`);
    if (!container) return;

    // Get the digit string representations
    const oldDigits = String(oldValue).padStart(unit === 'days' ? 3 : 2, '0');
    const newDigits = String(newValue).padStart(unit === 'days' ? 3 : 2, '0');

    // Find which digits changed and animate them
    for (let i = 0; i < oldDigits.length; i++) {
        if (oldDigits[i] !== newDigits[i]) {
            const digitElement = container.children[i];
            if (digitElement) {
                // Remove any existing animation classes
                digitElement.classList.remove('scroll-up', 'scroll-down');

                // Set up the animation: create both old and new digits
                const oldDigit = oldDigits[i];
                const newDigit = newDigits[i];

                // Create the animation sequence
                animateSingleDigit(digitElement, oldDigit, newDigit);
            }
        }
    }
}

/**
 * Animate a single digit change
 * @param {HTMLElement} digitElement - The digit span element
 * @param {string} oldDigit - The old digit character
 * @param {string} newDigit - The new digit character
 */
function animateSingleDigit(digitElement, oldDigit, newDigit) {
    // Set the current digit
    digitElement.textContent = oldDigit;
    digitElement.style.top = '0px';

    // Force a reflow to ensure the initial state is applied
    digitElement.offsetHeight;

    // Start the scroll animation
    digitElement.style.top = '-14px';

    // After animation completes, update to new digit
    setTimeout(() => {
        digitElement.textContent = newDigit;
        digitElement.style.top = '0px';
    }, 300);
}

/**
 * Initialize theme based on system preference
 */
function initializeTheme() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const body = document.body;

    // Function to apply theme
    function applyTheme(isDark) {
        if (isDark) {
            body.classList.add('dark-theme');
            console.log('Dark theme applied');
        } else {
            body.classList.remove('dark-theme');
            console.log('Light theme applied');
        }
    }

    // Apply initial theme
    applyTheme(darkModeMediaQuery.matches);

    // Listen for changes to system preference
    darkModeMediaQuery.addEventListener('change', (e) => {
        applyTheme(e.matches);
    });

    console.log('Theme initialization complete, following system preference');
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme based on system preference
    initializeTheme();

    // Always refresh data when popup opens (every time user clicks extension icon)
    refreshPopupData();

    // Also refresh whiteboard data periodically (but not age, since it's live)
    setInterval(refreshWhiteboardData, 15000); // Refresh every 15 seconds (reduced frequency)

    // Add click-to-copy functionality for the age display
    const bugAgeElement = document.getElementById('bugage');
    if (bugAgeElement) {
        bugAgeElement.addEventListener('click', function() {
            copyAgeToClipboard();
        });
        bugAgeElement.style.cursor = 'pointer';
        bugAgeElement.title = 'Click to copy age';
    }

    // Add refresh button functionality
    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            refreshDataFromPage();
        });
    }
});

/**
 * Copy the current bug age to clipboard with visual feedback
 */
function copyAgeToClipboard() {
    const ageToCopy = getVisibleAgeText();

    // Don't copy if age is not available
    if (!ageToCopy || ageToCopy === 'N/A' || ageToCopy === 'Date is still Loading..') {
        console.log('No age available to copy');
        return;
    }

    // Use the Clipboard API if available, fallback to execCommand
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(ageToCopy).then(function() {
            showCopyFeedback(ageToCopy);
        }).catch(function(err) {
            console.error('Failed to copy age using Clipboard API:', err);
            fallbackCopyTextToClipboard(ageToCopy);
        });
    } else {
        fallbackCopyTextToClipboard(ageToCopy);
    }
}

/**
 * Get the visible age text by reading the current digit positions
 * @returns {string} The visible age text
 */
function getVisibleAgeText() {
    const bugAgeElement = document.getElementById('bugage');
    if (!bugAgeElement || bugAgeElement.textContent === 'N/A') {
        return 'N/A';
    }

    let visibleText = 'Age: ';

    // Get days
    const daysContainer = bugAgeElement.querySelector('.digit-container[data-unit="days"]');
    if (daysContainer) {
        visibleText += getVisibleDigits(daysContainer) + 'd ';
    }

    // Get hours
    const hoursContainer = bugAgeElement.querySelector('.digit-container[data-unit="hours"]');
    if (hoursContainer) {
        visibleText += getVisibleDigits(hoursContainer) + 'h ';
    }

    // Get minutes
    const minutesContainer = bugAgeElement.querySelector('.digit-container[data-unit="minutes"]');
    if (minutesContainer) {
        visibleText += getVisibleDigits(minutesContainer) + 'm ';
    }

    // Get seconds
    const secondsContainer = bugAgeElement.querySelector('.digit-container[data-unit="seconds"]');
    if (secondsContainer) {
        visibleText += getVisibleDigits(secondsContainer) + 's';
    }

    return visibleText.trim();
}

/**
 * Get visible digits from a digit container
 * @param {HTMLElement} container - The digit container element
 * @returns {string} The visible digits as a string
 */
function getVisibleDigits(container) {
    let digits = '';

    // For each digit stack in the container
    for (let i = 0; i < container.children.length; i++) {
        const digitStack = container.children[i];
        const spans = digitStack.querySelectorAll('span');

        // Find which span is currently visible (effective position closest to 0)
        let visibleDigit = '0';
        let closestDistance = Infinity;

        spans.forEach(span => {
            // Get initial top position
            const topMatch = span.style.top.match(/(\d+)px/);
            const initialTop = topMatch ? parseInt(topMatch[1], 10) : 0;

            // Get transform translateY
            const transform = span.style.transform || '';
            const translateYMatch = transform.match(/translateY\(([-0-9]+)px\)/);
            const translateY = translateYMatch ? parseInt(translateYMatch[1], 10) : 0;

            // Calculate effective position
            const effectiveTop = initialTop + translateY;
            const distance = Math.abs(effectiveTop);

            if (distance < closestDistance) {
                closestDistance = distance;
                visibleDigit = span.textContent;
            }
        });

        digits += visibleDigit;
    }

    return digits;
}

/**
 * Fallback method for copying text to clipboard (for older browsers)
 * @param {string} text - Text to copy
 */
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback(text);
        } else {
            console.error('Fallback copy method failed');
        }
    } catch (err) {
        console.error('Fallback copy method error:', err);
    }

    document.body.removeChild(textArea);
}

/**
 * Update age display styling based on bug age
 * @param {HTMLElement} ageElement - The age display element
 * @param {number} days - Number of days since bug creation
 */
function updateAgeStyling(ageElement, days) {
    // Remove existing age classes
    ageElement.classList.remove('age-recent', 'age-medium', 'age-old');

    // Apply age-based styling
    if (days < 7) {
        ageElement.classList.add('age-recent'); // Green for recent bugs
    } else if (days < 30) {
        ageElement.classList.add('age-medium'); // Yellow/Orange for medium age
    } else {
        ageElement.classList.add('age-old'); // Red for old bugs
    }
}

/**
 * Update bug ID display
 * @param {string} bugId - The bug ID to display
 */
function updateBugIdDisplay(bugId) {
    const bugIdElement = document.getElementById('bugid');
    if (bugIdElement) {
        bugIdElement.textContent = `Bug ${bugId}`;
    }
}

/**
 * Show visual feedback when age is copied
 * @param {string} copiedAge - The age text that was copied
 */
function showCopyFeedback(copiedAge) {
    const bugAgeElement = document.getElementById('bugage');

    // Store current display state
    const originalDisplay = bugAgeElement.style.display;
    const originalInnerHTML = bugAgeElement.innerHTML;

    // Temporarily hide the age display and show "Copied!" message
    bugAgeElement.style.display = 'none';
    bugAgeElement.insertAdjacentHTML('afterend', '<div id="copy-feedback" style="color: #28a745; font-weight: bold; font-family: \'Segoe UI\', Tahoma, sans-serif; font-size: 12px; position: absolute; right: 0; top: 2px;">Copied!</div>');

    // Restore after 1 second
    setTimeout(function() {
        const feedbackElement = document.getElementById('copy-feedback');
        if (feedbackElement) {
            feedbackElement.remove();
        }
        bugAgeElement.style.display = originalDisplay;
    }, 1000);

    console.log('Age copied to clipboard:', copiedAge);
}

/**
 * Refresh data from the current page by forcing a reload of bug information
 */
function refreshDataFromPage() {
    const refreshButton = document.getElementById('refreshData');
    const refreshIcon = refreshButton.querySelector('.refresh-icon');

    // Prevent multiple clicks during refresh
    if (refreshButton.disabled) {
        return;
    }

    // Visual feedback: show spinning animation on the icon only
    if (refreshIcon) {
        refreshIcon.classList.add('spinning');
    }
    refreshButton.disabled = true;

    // Clear any existing messages
    document.getElementById('errmsg').textContent = '';

    // Force refresh popup data
    refreshPopupData();

    // Restore button after a reasonable delay (longer to account for data loading)
    setTimeout(() => {
        if (refreshIcon) {
            refreshIcon.classList.remove('spinning');
        }
        refreshButton.disabled = false;
    }, 2000); // Increased from 1000ms to 2000ms for better UX

    console.log('Manual data refresh initiated');
}

/**
 * Refresh only whiteboard data (age is updated live)
 */
function refreshWhiteboardData() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            return;
        }
        const tab = tabs[0];

        // Check if it's a bugzilla page
        const isBugzillaPage = tab.url && tab.url.includes('blrbugzilla.yodlee.com/show_bug.cgi');
        if (!isBugzillaPage) {
            return;
        }

        chrome.tabs.sendMessage(tab.id, {
            action: 'getSummary'
        }, function(response) {
            if (chrome.runtime.lastError) {
                // Silently ignore errors for periodic updates
                const errorMsg = chrome.runtime.lastError.message || 'Runtime error';
                console.warn('Periodic refresh error:', errorMsg);
                return;
            }
            if (response && response.wb) {
                // Update whiteboard data by appending stored tags to original content
                chrome.storage.local.get('pagetitle', function(stored) {
                    let finalWhiteboard = response.wb;

                    // Always append stored tags to the original whiteboard content
                    if (stored.pagetitle && stored.pagetitle.trim()) {
                        finalWhiteboard = response.wb ? response.wb + ', ' + stored.pagetitle : stored.pagetitle;
                    }

                    // Update whiteboard display with optimized function
                    updateWhiteboardDisplay(finalWhiteboard || 'No whiteboard data');
                    // Don't update age here - it's updated live
                });
            }
        });
    });
}
