/**
 * Remove a tag from the whiteboard (both stored and original)
 * @param {string} tag - The tag to remove
 */
function removeTag(tag) {
    // First check if it's a stored tag
    chrome.storage.local.get('pagetitle', function(bug) {
        let storedTags = bug.pagetitle || '';
        let tagRemoved = false;

        if (storedTags) {
            // Split tags and filter out the one to remove
            const tags = storedTags.split(',').map(t => t.trim()).filter(t => t !== tag);

            if (tags.length !== storedTags.split(',').map(t => t.trim()).length) {
                // Tag was found and removed from stored tags
                const newStoredTags = tags.join(', ');
                chrome.storage.local.set({'pagetitle': newStoredTags}, function() {
                    updateWhiteboardDisplayAfterRemoval(tag);
                });
                tagRemoved = true;
            }
        }

        // If tag wasn't in stored tags, try to remove from original whiteboard
        if (!tagRemoved) {
            removeTagFromOriginalWhiteboard(tag);
        }
    });
}

/**
 * Remove a tag from the original whiteboard content (local display only)
 * @param {string} tag - The tag to remove
 */
function removeTagFromOriginalWhiteboard(tag) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            console.error('No active tab found');
            return;
        }
        const tab = tabs[0];

        chrome.tabs.sendMessage(tab.id, {
            action: 'getSummary'
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.warn('Error getting whiteboard data:', chrome.runtime.lastError.message);
                return;
            }

            let originalWhiteboard = response && response.wb ? response.wb : '';
            if (!originalWhiteboard) {
                $('#errmsg').text(`"${tag}" not found!`);
                setTimeout(() => {
                    $('#errmsg').text('');
                }, 3000);
                return;
            }

            // Check if tag exists in original whiteboard
            const originalTags = originalWhiteboard.split(',').map(t => t.trim());
            const tagExists = originalTags.includes(tag);

            if (tagExists) {
                // Add tag to hidden tags list
                chrome.storage.local.get('hiddenTags', function(result) {
                    let hiddenTags = result.hiddenTags || [];
                    if (!hiddenTags.includes(tag)) {
                        hiddenTags.push(tag);
                        chrome.storage.local.set({'hiddenTags': hiddenTags}, function() {
                            // Update display with hidden tags filtered out
                            updateWhiteboardDisplayWithHiddenTags();
                            $('#errmsg').text(`"${tag}" removed from display!`);
                            setTimeout(() => {
                                $('#errmsg').text('');
                            }, 3000);
                        });
                    } else {
                        $('#errmsg').text(`"${tag}" already hidden!`);
                        setTimeout(() => {
                            $('#errmsg').text('');
                        }, 3000);
                    }
                });
            } else {
                // Tag not found in original tags
                $('#errmsg').text(`"${tag}" not found!`);
                setTimeout(() => {
                    $('#errmsg').text('');
                }, 3000);
            }
        });
    });
}

/**
 * Update the whiteboard display after a tag removal
 * @param {string} removedTag - The tag that was removed
 */
function updateWhiteboardDisplayAfterRemoval(removedTag) {
    updateWhiteboardDisplayWithHiddenTags();
}

/**
 * Update whiteboard display with hidden tags filtered out
 */
function updateWhiteboardDisplayWithHiddenTags() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            console.error('No active tab found');
            return;
        }
        const tab = tabs[0];

        chrome.tabs.sendMessage(tab.id, {
            action: 'getSummary'
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.warn('Error getting whiteboard data:', chrome.runtime.lastError.message);
                return;
            }

            let originalWhiteboard = response && response.wb ? response.wb : '';

            // Get current stored tags and hidden tags
            chrome.storage.local.get(['pagetitle', 'hiddenTags'], function(result) {
                let storedTags = result.pagetitle || '';
                let hiddenTags = result.hiddenTags || [];

                // Combine original and stored tags
                let allTags = [];
                if (originalWhiteboard) {
                    allTags = allTags.concat(originalWhiteboard.split(',').map(t => t.trim()));
                }
                if (storedTags) {
                    allTags = allTags.concat(storedTags.split(',').map(t => t.trim()));
                }

                // Filter out hidden tags
                const visibleTags = allTags.filter(tag => tag && !hiddenTags.includes(tag));

                // Create final whiteboard string
                const finalWhiteboard = visibleTags.length > 0 ? visibleTags.join(', ') : 'No whiteboard data';

                updateWhiteboardDisplay(finalWhiteboard);
            });
        });
    });
}

/**
 * Optimized helper function to add a tag to the whiteboard
 * @param {string} tag - The tag to add
 */
function addTag(tag) {
    // First get current stored tags, then check against full whiteboard
    chrome.storage.local.get('pagetitle', function(bug) {
        let storedTags = bug.pagetitle || '';

        // Check if tag already exists in stored tags
        if (storedTags.includes(tag)) {
            $('#errmsg').text(`"${tag}" already added!`);
            setTimeout(() => {
                $('#errmsg').text('');
            }, 3000);
            return;
        }

        // Now check if tag exists in the original whiteboard from page
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length === 0) {
                console.error('No active tab found');
                $('#errmsg').text(`"${tag}" already added!`);
                setTimeout(() => {
                    $('#errmsg').text('');
                }, 3000);
                return;
            }
            const tab = tabs[0];

            chrome.tabs.sendMessage(tab.id, {
                action: 'getSummary'
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.warn('Error getting whiteboard data:', chrome.runtime.lastError.message);
                    $('#errmsg').text(`"${tag}" already added!`);
                    setTimeout(() => {
                        $('#errmsg').text('');
                    }, 3000);
                    return;
                }

                let originalWhiteboard = response && response.wb ? response.wb : '';

                // Check if tag already exists in original whiteboard
                if (originalWhiteboard.includes(tag)) {
                    $('#errmsg').text(`"${tag}" already added!`);
                    setTimeout(() => {
                        $('#errmsg').text('');
                    }, 3000);
                    return;
                }

                // Now proceed to add the tag
                let pagetitlevar = storedTags ? storedTags + ',' + tag : tag;

                // Save immediately and update display with full whiteboard
                chrome.storage.local.set({'pagetitle': pagetitlevar}, function() {
                    // Record tag usage for frequent tags learning
                    recordTagUsage(tag);

                    // Combine original whiteboard with stored tags
                    let finalWhiteboard = originalWhiteboard;
                    if (pagetitlevar && pagetitlevar.trim()) {
                        finalWhiteboard = originalWhiteboard ? originalWhiteboard + ', ' + pagetitlevar : pagetitlevar;
                    }
                    updateWhiteboardDisplay(finalWhiteboard || 'No whiteboard data');
                });
            });
        });
    });
}



/**
 * Fast whiteboard display update with normal tag order
 * @param {string} whiteboardText - Raw whiteboard text
 */
function updateWhiteboardDisplay(whiteboardText) {
    if (!whiteboardText || whiteboardText === 'No whiteboard data') {
        $('#pagetitle').html(whiteboardText);
        return;
    }

    // Split and filter tags efficiently
    let tags = whiteboardText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    // Filter out hidden tags
    chrome.storage.local.get('hiddenTags', function(result) {
        const hiddenTags = result.hiddenTags || [];
        const visibleTags = tags.filter(tag => !hiddenTags.includes(tag));

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        let firstTag = true;

        for (const tag of visibleTags) {
            if (!firstTag) {
                fragment.appendChild(document.createTextNode(', '));
            }
            firstTag = false;

            const lowerTag = tag.toLowerCase();
            let className = 'tag-issue'; // default

            // Simple classification logic
            if (lowerTag.includes('triaged') || lowerTag.includes('eta')) {
                className = 'tag-date';
            } else if (lowerTag.includes('jn_triaged') || lowerTag.includes('site_') ||
                       lowerTag.includes('fixed_') || lowerTag.includes('more_clarification')) {
                className = 'tag-status';
            } else if (lowerTag.includes('logs_') || lowerTag.includes('navigation_') ||
                       lowerTag.includes('uui_closed') || lowerTag.includes('uui_dq_issues') ||
                       lowerTag.includes('uui_reopen_issues') || lowerTag.includes('uui_aged_bug')) {
                className = 'tag-special';
            }

            const span = document.createElement('span');
            span.className = className + ' tag-with-close';
            span.textContent = tag;

            // Add close button
            const closeBtn = document.createElement('span');
            closeBtn.className = 'tag-close-btn';
            closeBtn.textContent = 'x';
            closeBtn.title = `Remove "${tag}"`;
            closeBtn.onclick = function(e) {
                e.stopPropagation();
                removeTag(tag);
            };

            span.appendChild(closeBtn);
            fragment.appendChild(span);
        }

        $('#pagetitle').empty().append(fragment);
    });
}

/**
 * Get human-readable title for tag group
 * @param {string} groupKey - The group key
 * @returns {string} Human-readable title
 */
function getGroupTitle(groupKey) {
    const titles = {
        date: 'Date & Time Tags',
        status: 'Status Tags',
        special: 'Special Issue Tags',
        issue: 'General Issue Tags'
    };
    return titles[groupKey] || 'Tags';
}
// Tag buttons - all using optimized addTag function
$(function(){ $('button[id="UUI_Tool_Issue_No_Data_Found"]').click(function(){ addTag("UUI_Tool_Issue_No_Data_Found"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Deployment_Failed"]').click(function(){ addTag("UUI_Tool_Issue_Deployment_Failed"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Firemen_Failing"]').click(function(){ addTag("UUI_Tool_Issue_Firemen_Failing"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Missing_ST"]').click(function(){ addTag("UUI_Tool_Issue_Missing_ST"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Incorrect_ST"]').click(function(){ addTag("UUI_Tool_Issue_Incorrect_ST"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Missing_Error_Code"]').click(function(){ addTag("UUI_Tool_Issue_Missing_Error_Code"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Direct_Closure_Option"]').click(function(){ addTag("UUI_Tool_Issue_Direct_Closure_Option"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_FMPA_Enable_PagePrint_Close"]').click(function(){ addTag("UUI_Tool_Issue_FMPA_Enable_PagePrint_Close"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Version_Mismatch"]').click(function(){ addTag("UUI_Tool_Issue_Version_Mismatch"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Soft_Error_Placards"]').click(function(){ addTag("UUI_Tool_Issue_Soft_Error_Placards"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Analyze_Fix_Verify_Not_Enable"]').click(function(){ addTag("UUI_Tool_Issue_Analyze-Fix-Verify_Not_Enable"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Dump_Expire"]').click(function(){ addTag("UUI_Tool_Issue_Dump_Expire"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Tool_Down"]').click(function(){ addTag("UUI_Tool_Issue_Tool_Down"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Temporary_Issue"]').click(function(){ addTag("UUI_Tool_Issue_Temporary_Issue"); }); });
$(function(){ $('button[id="UUI_Tool_Issue"]').click(function(){ addTag("UUI_Tool_Issue"); }); });
$(function(){ $('button[id="JN_TRIAGED"]').click(function(){ addTag("JN_TRIAGED"); }); });
$(function(){ $('button[id="Complete_fail"]').click(function(){ addTag("Site_100%_failure"); }); });
$(function(){ $('button[id="UUI_Tool_Issue_Time_Out"]').click(function(){ addTag("UUI_Tool_Issue_Time_Out"); }); });
$(function(){ $('button[id="UUI_Non_Info_ABS_CR_Metadata_YAD_DB_Update"]').click(function(){ addTag("UUI_Non_Info_ABS_CR_Metadata_YAD_DB_Update"); }); });
$(function(){ $('button[id="UUI_Info_Issue"]').click(function(){ addTag("UUI_Info_Issue"); }); });
$(function(){ $('button[id="UUI_IAV_flow_issue"]').click(function(){ addTag("UUI_IAV_flow_issue"); }); });
$(function(){ $('button[id="UUI_Complete_Site_Handling"]').click(function(){ addTag("UUI_Complete_Site_Handling"); }); });
$(function(){ $('button[id="UUI_TTR_Issues"]').click(function(){ addTag("UUI_TTR_Issues"); }); });
$(function(){ $('button[id="UUI_Feed_Issue"]').click(function(){ addTag("UUI_Feed_Issue"); }); });
$(function(){ $('button[id="UUI_Infra_Issue"]').click(function(){ addTag("UUI_Infra_Issue"); }); });
$(function(){ $('button[id="UUI_MFA_Issue"]').click(function(){ addTag("UUI_MFA_Issue"); }); });
$(function(){ $('button[id="UUI_Aged_Bug"]').click(function(){ addTag("UUI_Aged_Bug"); }); });
$(function(){ $('button[id="UUI_Reopen_Issues"]').click(function(){ addTag("UUI_Reopen_Issues"); }); });
$(function(){ $('button[id="UUI_DQ_Issues"]').click(function(){ addTag("UUI_DQ_Issues"); }); });
$(function(){ $('button[id="UUI_Closed"]').click(function(){ addTag("UUI_Closed"); }); });
$(function(){ $('button[id="Logs_Expired_User_Sepecific"]').click(function(){ addTag("Logs_Expired_User_Sepecific"); }); });
$(function(){ $('button[id="Navigation_Required_User_Sepecific"]').click(function(){ addTag("Navigation_Required_User_Sepecific"); }); });
$(function(){ $('button[id="Fixed_MFA_User_need_to_confirm"]').click(function(){ addTag("Fixed_MFA_User_need_to_confirm"); }); });
$(function(){ $('button[id="Fixed_NON_MFA_User_need_to_confirm"]').click(function(){ addTag("Fixed_NON_MFA_User_need_to_confirm"); }); });
$(function(){ $('button[id="More_Clarification_Required"]').click(function(){ addTag("More_Clarification_Required"); }); });
$(function(){
    $('#execute').click(function(){
        // Get stored tags
        chrome.storage.local.get('pagetitle', function(bug) {
            var storedTags = bug.pagetitle || '';

            // Get the full whiteboard content (original + stored)
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length === 0) {
                    console.error('No active tab found');
                    $('#errmsg').text('No active tab found!');
                    return;
                }
                const tab = tabs[0];

                chrome.tabs.sendMessage(tab.id, {
                    action: 'getSummary'
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.warn('Error getting whiteboard data:', chrome.runtime.lastError.message);
                        $('#errmsg').text('Error getting page data!');
                        return;
                    }

                    let originalWhiteboard = response && response.wb ? response.wb : '';
                    let fullWhiteboard = originalWhiteboard;

                    // Combine with stored tags if any
                    if (storedTags && storedTags.trim()) {
                        fullWhiteboard = originalWhiteboard ? originalWhiteboard + ', ' + storedTags : storedTags;
                    }

                    // Check if JN_TRIAGED is present in the full whiteboard
                    if (!fullWhiteboard.toUpperCase().includes("JN_TRIAGED")) {
                        $('#errmsg').text('Keyword JN_TRIAGED is absent!!');
                        return;
                    }

                    // Set the full whiteboard to the page field
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (value) => {
                            const element = document.getElementById('status_whiteboard');
                            if (element) {
                                element.value = value;
                            }
                        },
                        args: [fullWhiteboard]
                    }, (result) => {
                        if (chrome.runtime.lastError) {
                            console.error('Script execution failed:', chrome.runtime.lastError);
                            $('#errmsg').text('Failed to update whiteboard!');
                        } else {
                            $('#errmsg').text('Whiteboard updated successfully!');
                            // Clear the message after 3 seconds
                            setTimeout(() => {
                                $('#errmsg').text('');
                            }, 3000);
                        }
                    });
                });
            });
        });
    });
})

$(function(){
    $('#reset-whiteboard').click(function(){
        // Clear the local storage for pagetitle and hiddenTags
        chrome.storage.local.remove(['pagetitle', 'hiddenTags'], function() {
            console.log('Local whiteboard data and hidden tags cleared');

            // Refresh the popup data to reload from the bug page
            if (typeof refreshPopupData === 'function') {
                refreshPopupData();
                $('#errmsg').text('Whiteboard reset to current bug content!');
                setTimeout(() => {
                    $('#errmsg').text('');
                }, 3000);
            } else {
                // Fallback: manually refresh whiteboard data
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (tabs.length === 0) {
                        console.error('No active tab found');
                        return;
                    }
                    const tab = tabs[0];

                    // Check if it's a bugzilla page
                    const isBugzillaPage = tab.url && tab.url.includes('blrbugzilla.yodlee.com/show_bug.cgi');
                    if (!isBugzillaPage) {
                        $('#errmsg').text('Not on a Bugzilla bug page!');
                        setTimeout(() => {
                            $('#errmsg').text('');
                        }, 3000);
                        return;
                    }

                    chrome.tabs.sendMessage(tab.id, {
                        action: 'getSummary'
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.warn('Error refreshing whiteboard:', chrome.runtime.lastError.message);
                            $('#errmsg').text('Error refreshing whiteboard data');
                            setTimeout(() => {
                                $('#errmsg').text('');
                            }, 3000);
                            return;
                        }
                        if (response && response.wb) {
                            // Update whiteboard display with the fresh data from bug page (no hidden tags filtering)
                            updateWhiteboardDisplay(response.wb || 'No whiteboard data');
                            $('#errmsg').text('Whiteboard reset to current bug content!');
                            setTimeout(() => {
                                $('#errmsg').text('');
                            }, 3000);
                        }
                    });
                });
            }
        });
    });
});

/**
 * Optimized ETA addition with fast display update
 * @param {number} etaDays - Number of business days for ETA
 */
function addETA(etaDays) {
    chrome.storage.local.get('pagetitle', function(bug) {
        let pagetitlevar = bug.pagetitle || '';
        const currdate = new Date();
        const triagedDate = formatDate(currdate, 0);
        const etaDate = formatDate(currdate, etaDays);

        // Remove existing ETA and Triaged entries efficiently
        const tags = pagetitlevar.split(',').map(tag => tag.trim()).filter(tag =>
            tag.length > 0 &&
            !tag.toLowerCase().includes('triaged:') &&
            !tag.toLowerCase().includes('eta:')
        );

        // Add new Triaged and ETA
        tags.push(`Triaged:${triagedDate}`);
        tags.push(`ETA:${etaDate}`);

        // Join back and save
        pagetitlevar = tags.join(', ');

        // Save and update display with full whiteboard
        chrome.storage.local.set({'pagetitle': pagetitlevar}, function() {
            // Get current whiteboard from page and update display
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs.length === 0) {
                    console.error('No active tab found');
                    updateWhiteboardDisplay(pagetitlevar);
                    return;
                }
                const tab = tabs[0];

                chrome.tabs.sendMessage(tab.id, {
                    action: 'getSummary'
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.warn('Error getting whiteboard data:', chrome.runtime.lastError.message);
                        updateWhiteboardDisplay(pagetitlevar);
                        return;
                    }
                    if (response && response.wb) {
                        // Combine original whiteboard with stored tags
                        let finalWhiteboard = response.wb;
                        if (pagetitlevar && pagetitlevar.trim()) {
                            finalWhiteboard = response.wb ? response.wb + ', ' + pagetitlevar : pagetitlevar;
                        }
                        updateWhiteboardDisplay(finalWhiteboard || 'No whiteboard data');
                    } else {
                        updateWhiteboardDisplay(pagetitlevar);
                    }
                });
            });
        });
    });
}

// ETA slider handler
$(function(){
    $('#eta-slider').on('input change', function(){
        const etaDays = parseInt(this.value);
        addETA(etaDays);
    });
});

// Clear ETA button handler
$(function(){
    $('#clear-eta').click(function(){
        chrome.storage.local.get('pagetitle', function(bug) {
            let storedTags = bug.pagetitle || '';

            if (!storedTags) {
                $('#errmsg').text('No ETA tags to clear!');
                setTimeout(() => {
                    $('#errmsg').text('');
                }, 3000);
                return;
            }

            // Split tags and filter out ETA/Triaged tags
            const tags = storedTags.split(',').map(tag => tag.trim()).filter(tag =>
                tag.length > 0 &&
                !tag.toLowerCase().includes('triaged:') &&
                !tag.toLowerCase().includes('eta:')
            );

            // Join back
            const newStoredTags = tags.join(', ');

            // Save updated tags
            chrome.storage.local.set({'pagetitle': newStoredTags}, function() {
                // Update display with full whiteboard
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (tabs.length === 0) {
                        console.error('No active tab found');
                        updateWhiteboardDisplay(newStoredTags || 'No whiteboard data');
                        return;
                    }
                    const tab = tabs[0];

                    chrome.tabs.sendMessage(tab.id, {
                        action: 'getSummary'
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.warn('Error getting whiteboard data:', chrome.runtime.lastError.message);
                            updateWhiteboardDisplay(newStoredTags || 'No whiteboard data');
                            return;
                        }

                        let originalWhiteboard = response && response.wb ? response.wb : '';
                        let finalWhiteboard = originalWhiteboard;

                        // Combine with updated stored tags
                        if (newStoredTags && newStoredTags.trim()) {
                            finalWhiteboard = originalWhiteboard ? originalWhiteboard + ', ' + newStoredTags : newStoredTags;
                        }

                        updateWhiteboardDisplay(finalWhiteboard || 'No whiteboard data');
                        $('#errmsg').text('ETA tags cleared!');
                        setTimeout(() => {
                            $('#errmsg').text('');
                        }, 3000);
                    });
                });
            });
        });
    });
});


/**
 * Calculate business days from a given date, skipping weekends
 * @param {Date} startDate - The starting date
 * @param {number} businessDays - Number of business days to add
 * @returns {string} Formatted date string DD-MM-YYYY
 */
function formatDate(startDate, businessDays) {
    // Create a new date object to avoid modifying the input
    const date = new Date(startDate);
    let addedDays = 0;

    while (addedDays < businessDays) {
        date.setDate(date.getDate() + 1);
        // Check if it's a weekday (Monday = 1, Tuesday = 2, ..., Friday = 5)
        if (date.getDay() >= 1 && date.getDay() <= 5) {
            addedDays++;
        }
    }

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-based
    const yyyy = date.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Filter tag buttons based on search input
 * @param {string} searchTerm - The search term to filter by
 */
function filterTags(searchTerm) {
    const tagButtons = document.querySelectorAll('.tag-buttons button');
    const lowerSearchTerm = searchTerm.toLowerCase();
    let hasVisibleButtons = false;

    tagButtons.forEach(button => {
        const buttonText = button.textContent.toLowerCase();
        const buttonId = button.id.toLowerCase();

        // Show button if search term is empty or if it matches the button text or ID
        if (lowerSearchTerm === '' ||
            buttonText.includes(lowerSearchTerm) ||
            buttonId.includes(lowerSearchTerm)) {
            button.style.display = '';
            if (button.id !== 'custom-tag-btn') { // Don't count custom button
                hasVisibleButtons = true;
            }
        } else {
            button.style.display = 'none';
        }
    });

    // Handle custom tag button
    const tagButtonsContainer = document.querySelector('.tag-buttons');
    let customButton = document.getElementById('custom-tag-btn');

    if (!hasVisibleButtons && lowerSearchTerm.trim() !== '') {
        // Show custom tag button
        if (!customButton) {
            customButton = document.createElement('button');
            customButton.id = 'custom-tag-btn';
            customButton.className = 'custom-tag-button';
            customButton.title = 'Add this as a custom tag';
            tagButtonsContainer.appendChild(customButton);
        }
        customButton.textContent = `Add "${searchTerm.trim()}" as tag`;
        customButton.style.display = '';
        customButton.onclick = function() {
            const tagToAdd = searchTerm.trim();
            if (tagToAdd) {
                addTag(tagToAdd);
                // Clear the search input
                document.getElementById('tag-search').value = '';
                // Re-filter to hide custom button
                filterTags('');
            }
        };
    } else {
        // Hide custom tag button
        if (customButton) {
            customButton.style.display = 'none';
        }
    }
}

// Track tag usage for frequent tags learning
let tagUsage = {};

// Load saved tag usage on startup
chrome.storage.local.get('tagUsage', function(result) {
    tagUsage = result.tagUsage || {};
    updateFrequentTags();
});

/**
 * Record tag usage and update frequent tags
 * @param {string} tag - The tag that was used
 */
function recordTagUsage(tag) {
    tagUsage[tag] = (tagUsage[tag] || 0) + 1;

    // Save to storage
    chrome.storage.local.set({'tagUsage': tagUsage}, function() {
        updateFrequentTags();
    });
}

/**
 * Update the frequent tags based on usage statistics
 */
function updateFrequentTags() {
    // Get top 5 most used tags
    const sortedTags = Object.entries(tagUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

    // Always include essential tags
    const essentialTags = ['JN_TRIAGED'];
    const frequentTags = [...new Set([...essentialTags, ...sortedTags])].slice(0, 5);

    // Update the frequent tags display
    const frequentContainer = document.querySelector('.frequent-tag-buttons');
    if (frequentContainer) {
        // Clear existing buttons
        frequentContainer.innerHTML = '';

        // Add frequent tag buttons
        frequentTags.forEach(tag => {
            const button = document.createElement('button');
            button.id = tag.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize ID
            button.textContent = tag;
            button.title = `Frequently used: ${tag}`;
            button.onclick = function() {
                addTag(tag);
                recordTagUsage(tag);
            };
            frequentContainer.appendChild(button);
        });
    }
}

// Group and display tag buttons by type
function updateGroupedTagButtons() {
    const tagButtonsContainer = document.querySelector('.tag-buttons');
    if (!tagButtonsContainer) return;

    // Clear existing content
    tagButtonsContainer.innerHTML = '';

    // Define tag groups with their buttons
    const tagGroups = {
        status: {
            label: 'Status',
            buttons: [
                { id: 'JN_TRIAGED', text: 'JN_TRIAGED' },
                { id: 'Complete_fail', text: 'Site_100%_failure' },
                { id: 'More_Clarification_Required', text: 'More_Clarification_Required' }
            ]
        },
        mfa: {
            label: 'MFA Issues',
            buttons: [
                { id: 'UUI_MFA_Issue', text: 'UUI_MFA_Issue' },
                { id: 'Fixed_MFA_User_need_to_confirm', text: 'Fixed_MFA_User_need_to_confirm' },
                { id: 'Fixed_NON_MFA_User_need_to_confirm', text: 'Fixed_NON_MFA_User_need_to_confirm' }
            ]
        },
        special: {
            label: 'Special Issues',
            buttons: [
                { id: 'UUI_Closed', text: 'UUI_Closed' },
                { id: 'UUI_DQ_Issues', text: 'UUI_DQ_Issues' },
                { id: 'UUI_Reopen_Issues', text: 'UUI_Reopen_Issues' },
                { id: 'UUI_Aged_Bug', text: 'UUI_Aged_Bug' },
                { id: 'UUI_Infra_Issue', text: 'UUI_Infra_Issue' },
                { id: 'UUI_Feed_Issue', text: 'UUI_Feed_Issue' },
                { id: 'UUI_TTR_Issues', text: 'UUI_TTR_Issues' },
                { id: 'UUI_Complete_Site_Handling', text: 'UUI_Complete_Site_Handling' },
                { id: 'UUI_IAV_flow_issue', text: 'UUI_IAV_flow_issue' },
                { id: 'UUI_Info_Issue', text: 'UUI_Info_Issue' },
                { id: 'UUI_Non_Info_ABS_CR_Metadata_YAD_DB_Update', text: 'UUI_Non_Info_ABS_CR_Metadata_YAD_DB_Update' },
                { id: 'Logs_Expired_User_Sepecific', text: 'Logs_Expired_User_Sepecific' },
                { id: 'Navigation_Required_User_Sepecific', text: 'Navigation_Required_User_Sepecific' }
            ]
        },
        tool: {
            label: 'Tool Issues',
            buttons: [
                { id: 'UUI_Tool_Issue_Time_Out', text: 'UUI_Tool_Issue_Time_Out' },
                { id: 'UUI_Tool_Issue_Deployment_Failed', text: 'UUI_Tool_Issue_Deployment_Failed' },
                { id: 'UUI_Tool_Issue_No_Data_Found', text: 'UUI_Tool_Issue_No_Data_Found' },
                { id: 'UUI_Tool_Issue_Firemen_Failing', text: 'UUI_Tool_Issue_Firemen_Failing' },
                { id: 'UUI_Tool_Issue_Missing_ST', text: 'UUI_Tool_Issue_Missing_ST' },
                { id: 'UUI_Tool_Issue_Incorrect_ST', text: 'UUI_Tool_Issue_Incorrect_ST' },
                { id: 'UUI_Tool_Issue_Missing_Error_Code', text: 'UUI_Tool_Issue_Missing_Error_Code' },
                { id: 'UUI_Tool_Issue_Direct_Closure_Option', text: 'UUI_Tool_Issue_Direct_Closure_Option' },
                { id: 'UUI_Tool_Issue_FMPA_Enable_PagePrint_Close', text: 'UUI_Tool_Issue_FMPA_Enable_PagePrint_Close' },
                { id: 'UUI_Tool_Issue_Version_Mismatch', text: 'UUI_Tool_Issue_Version_Mismatch' },
                { id: 'UUI_Tool_Issue_Soft_Error_Placards', text: 'UUI_Tool_Issue_Soft_Error_Placards' },
                { id: 'UUI_Tool_Issue_Analyze_Fix_Verify_Not_Enable', text: 'UUI_Tool_Issue_Analyze_Fix-Verify_Not_Enable' },
                { id: 'UUI_Tool_Issue_Dump_Expire', text: 'UUI_Tool_Issue_Dump_Expire' },
                { id: 'UUI_Tool_Issue_Temporary_Issue', text: 'UUI_Tool_Issue_Temporary_Issue' },
                { id: 'UUI_Tool_Issue_Tool_Down', text: 'UUI_Tool_Issue_Tool_Down' },
                { id: 'UUI_Tool_Issue', text: 'UUI_Tool_Issue' }
            ]
        }
    };

    // Create grouped display
    Object.entries(tagGroups).forEach(([groupKey, groupData]) => {
        // Add group header
        const groupHeader = document.createElement('div');
        groupHeader.className = 'tag-group-header';
        groupHeader.textContent = groupData.label;
        tagButtonsContainer.appendChild(groupHeader);

        // Add button container for this group
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tag-group-buttons';

        // Add buttons for this group
        groupData.buttons.forEach(buttonData => {
            const button = document.createElement('button');
            button.id = buttonData.id;
            button.textContent = buttonData.text;
            button.onclick = function() {
                addTag(buttonData.text);
            };
            buttonContainer.appendChild(button);
        });

        tagButtonsContainer.appendChild(buttonContainer);
    });
}

// Add click-to-copy functionality for bug ID
$(function(){
    $('#bugid').click(function(){
        const bugIdElement = $(this);
        const bugIdText = bugIdElement.text().trim();
        // Extract just the bug number (remove any prefix like "Bug" or symbols)
        const bugNumber = bugIdText.replace(/^[^\d]*/, '').replace(/[^\d]*$/, '');

        if (bugNumber) {
            // Copy to clipboard
            navigator.clipboard.writeText(bugNumber).then(function() {
                // Visual feedback: change text and color briefly (same as age display)
                const originalText = bugIdElement.text();
                bugIdElement.text('Copied!');
                bugIdElement.css('color', 'var(--success)');

                // Restore original text and remove inline color after 1 second
                setTimeout(function() {
                    bugIdElement.text(originalText);
                    bugIdElement.css('color', ''); // Remove inline color to let CSS classes take over
                }, 1000);

                console.log('Bug ID copied to clipboard:', bugNumber);
            }).catch(function(err) {
                console.error('Failed to copy bug ID: ', err);
                // Show error message
                $('#errmsg').text('Failed to copy bug ID!');
                setTimeout(() => {
                    $('#errmsg').text('');
                }, 3000);
            });
        }
    });
});

// Settings functionality
$(function(){
    // Settings button click
    $('#settings-btn').click(function(){
        $('#settings-panel').addClass('show');
    });

    // Close settings panel
    $('#close-settings').click(function(){
        $('#settings-panel').removeClass('show');
    });

    // Close settings when clicking outside (on overlay)
    $('.settings-overlay').click(function(){
        $('#settings-panel').removeClass('show');
    });

    // Theme toggle functionality
    $('#theme-toggle').change(function(){
        const isDark = $(this).is(':checked');
        toggleTheme(isDark);
    });
});

// Theme toggle function
function toggleTheme(isDark) {
    const body = document.body;
    if (isDark) {
        body.classList.add('dark-theme');
        // Save preference
        chrome.storage.local.set({'darkMode': true});
    } else {
        body.classList.remove('dark-theme');
        // Save preference
        chrome.storage.local.set({'darkMode': false});
    }
}

// Initialize theme on popup load
function initializeTheme() {
    chrome.storage.local.get('darkMode', function(result) {
        const isDark = result.darkMode || false;
        const themeToggle = document.getElementById('theme-toggle');

        if (isDark) {
            document.body.classList.add('dark-theme');
            if (themeToggle) themeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-theme');
            if (themeToggle) themeToggle.checked = false;
        }
    });
}

// Add search functionality when DOM is loaded
$(document).ready(function() {
    const searchInput = document.getElementById('tag-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterTags(this.value);
        });
    }

    // Initialize frequent tags
    updateFrequentTags();

    // Initialize grouped tag buttons
    updateGroupedTagButtons();

    // Initialize theme
    initializeTheme();
});
