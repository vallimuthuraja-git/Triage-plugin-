chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'ping') {
        sendResponse({ pong: true });
        return true;
    }

    if (request.action === 'getSummary') {
        try {
            const whiteboardElement = document.getElementById('status_whiteboard');
            const wbVar = whiteboardElement ? whiteboardElement.value : 'Whiteboard not found';

            const commentTimeElements = document.getElementsByClassName("bz_comment_time");
            const rdateVar = commentTimeElements.length > 0 ? commentTimeElements[0].innerText : 'Report date not found';

            // Extract bug ID from URL
            let bugId = 'Bug ID not found';
            try {
                const url = window.location.href;
                const idMatch = url.match(/[?&]id=(\d+)/);
                if (idMatch && idMatch[1]) {
                    bugId = idMatch[1];
                }
            } catch (error) {
                console.warn('Error extracting bug ID:', error);
            }

            // Extract bug creation data for live age calculation
            const bugCreationData = extractBugCreationData();

            sendResponse({
                wb: wbVar,
                rd: rdateVar,
                bcd: bugCreationData, // Bug creation data
                bid: bugId // Bug ID
            });
        } catch (error) {
            console.error('Error in getSummary:', error);
            sendResponse({
                wb: 'Error loading whiteboard',
                rd: 'Error loading date',
                bcd: null
            });
        }
    } else {
        sendResponse({
            resp: "Unknown action"
        });
    }
});

/**
 * Extract bug creation timestamp and idle days for live age calculation
 */
function extractBugCreationData() {
    try {
        // Validate department
        const deptElement = document.getElementById("cf_department");
        if (!deptElement || !deptElement.options || deptElement.selectedIndex < 0) {
            return null;
        }

        const department = deptElement.options[deptElement.selectedIndex].text;
        if (!department || !department.toUpperCase().includes('IAE')) {
            return null;
        }

        // Get creation timestamp
        const timeElements = document.getElementsByClassName("bz_comment_time");
        if (!timeElements || timeElements.length === 0) {
            return null;
        }

        const timeText = timeElements[0].innerText;
        if (!timeText || timeText.length < 19) {
            return null;
        }

        // Parse timestamp with proper timezone handling
        const timestampMatch = timeText.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
        if (!timestampMatch) {
            return null;
        }

        const timestamp = timestampMatch[1];
        let timezoneOffset = 0;

        // Check for timezone indicators and calculate offset to UTC
        if (timeText.includes('PST')) {
            timezoneOffset = 8; // PST is UTC-8, so add 8 hours to get to UTC
        } else if (timeText.includes('PDT')) {
            timezoneOffset = 7; // PDT is UTC-7, so add 7 hours to get to UTC
        }

        // Create date object with proper timezone adjustment
        const dateParts = timestamp.split(/[- :]/);
        const bugDate = new Date(
            parseInt(dateParts[0]), // year
            parseInt(dateParts[1]) - 1, // month (0-based)
            parseInt(dateParts[2]), // day
            parseInt(dateParts[3]) + timezoneOffset, // hour adjusted to UTC
            parseInt(dateParts[4]), // minute
            parseInt(dateParts[5]) || 0 // second (default to 0 if not present)
        );

        if (isNaN(bugDate.getTime())) {
            return null;
        }

        // Get idle days
        const idleElement = document.getElementById('cf_idle_time');
        const idleDays = idleElement ? parseFloat(idleElement.value) || 0 : 0;

        return {
            timestamp: bugDate.toISOString(),
            idleDays: idleDays
        };

    } catch (error) {
        console.error('Error extracting bug creation data:', error);
        return null;
    }
}
document.addEventListener("DOMContentLoaded", function() {
    try {
        const x = document.getElementById("primarySubmit");
        if (x) {
            x.addEventListener("click", functionNameClosure);
        }
        const y = document.getElementById("closure_submit");
        if (y) {
            y.addEventListener("click", functionNameClosure);
        }
        const z = document.getElementById("submitComments");
        if (z) {
            z.addEventListener("click", functionNameClosure);
        }

    } catch (error) {
        console.error('Error setting up click listeners:', error);
    }
});

    



function functionNameClosure() {
    try {
        const bugStatusElement = document.getElementById('bug_status');
        const cf_status_submit = bugStatusElement ? bugStatusElement.value.toLowerCase() : '';

        const recommendedActionElement = document.getElementById('cf_recomented_action');
        const cf_recomented_action_submit = recommendedActionElement ? recommendedActionElement.value.toLowerCase() : '';

        const departmentElement = document.getElementById('cf_department');
        const cf_department_action_submit = departmentElement ? departmentElement.value.toLowerCase() : '';

        const backendFrontendElement = document.getElementById('cf_backend_frontend');
        const cf_backend_frontend_submit = backendFrontendElement ? backendFrontendElement.value.toLowerCase() : '';

        const iaeResolutionElement = document.getElementById("cf_iae_resolution");
        const iae_resolution_submit = iaeResolutionElement ? iaeResolutionElement.value : '';

        const whiteboardElement = document.getElementById("status_whiteboard");
        const whiteboard_input = whiteboardElement ? whiteboardElement.value.toLowerCase() : '';


       if (cf_backend_frontend_submit !== 'preventive fixes' && cf_department_action_submit !== "iae") {
           if (whiteboard_input.indexOf('jn_triaged') === -1) {
               alert("Bug is not JN Triaged. Please Check");
               const commitTop = document.getElementById("commit_top");
               const commit = document.getElementById("commit");
               if (commitTop) commitTop.disabled = true;
               if (commit) commit.disabled = true;
           } else if (iae_resolution_submit === "") {
               alert("IAE-Resolution is a mandatory field.");
               const commitTop = document.getElementById("commit_top");
               const commit = document.getElementById("commit");
               if (commitTop) commitTop.disabled = true;
               if (commit) commit.disabled = true;
           } else {
               const commitTop = document.getElementById("commit_top");
               const commit = document.getElementById("commit");
               if (commitTop) commitTop.disabled = false;
               if (commit) commit.disabled = false;
           }
       } else {
           if (cf_backend_frontend_submit === 'preventive fixes' && cf_status_submit === 'resolved') {
               if (iae_resolution_submit === "") {
                   alert("IAE-Resolution is a mandatory field.");
                   const commitTop = document.getElementById("commit_top");
                   const commit = document.getElementById("commit");
                   if (commitTop) commitTop.disabled = true;
                   if (commit) commit.disabled = true;
               } else if (cf_department_action_submit !== "iae") {
                   alert("For Internal Bugs department cannot be changed to any other than IAE");
                   const commitTop = document.getElementById("commit_top");
                   const commit = document.getElementById("commit");
                   if (commitTop) commitTop.disabled = true;
                   if (commit) commit.disabled = true;
               } else {
                   const commitTop = document.getElementById("commit_top");
                   const commit = document.getElementById("commit");
                   if (commitTop) commitTop.disabled = false;
                   if (commit) commit.disabled = false;
               }
           }
       }
   } catch (error) {
       console.error('Error in validation:', error);
       alert('An error occurred during validation. Please check the console for details.');
   }
}


function calcBugAge() {
    try {
        // Validate department selection
        const deptElement = document.getElementById("cf_department");
        if (!deptElement || !deptElement.options || deptElement.selectedIndex < 0) {
            return 'No department selected';
        }

        const department = deptElement.options[deptElement.selectedIndex].text;
        if (!department || !department.toUpperCase().includes('IAE')) {
            return 'Only IAE bugs supported';
        }

        // Get bug creation timestamp
        const timeElements = document.getElementsByClassName("bz_comment_time");
        if (!timeElements || timeElements.length === 0) {
            return 'No creation time found';
        }

        const timeText = timeElements[0].innerText;
        if (!timeText || timeText.length < 19) {
            return 'Invalid creation time format';
        }

        // Parse the timestamp (format: "YYYY-MM-DD HH:MM:SS")
        const timestamp = timeText.substring(0, 19);
        const bugDate = new Date(timestamp + 'Z'); // Assume UTC

        if (isNaN(bugDate.getTime())) {
            return 'Failed to parse creation date';
        }

        // Get idle time (in days)
        const idleElement = document.getElementById('cf_idle_time');
        const idleDays = idleElement ? parseFloat(idleElement.value) || 0 : 0;

        // Calculate age in milliseconds
        const now = new Date();
        let ageMs = now.getTime() - bugDate.getTime();

        // Subtract idle time
        ageMs -= (idleDays * 24 * 60 * 60 * 1000);

        // Ensure non-negative age
        ageMs = Math.max(0, ageMs);

        return VisibleAge(ageMs);

    } catch (error) {
        console.error('Error in calcBugAge:', error);
        return 'Error calculating age';
    }
}

function VisibleAge(FinalAge) {
    // Ensure FinalAge is a valid number
    if (typeof FinalAge !== 'number' || isNaN(FinalAge) || FinalAge < 0) {
        return 'Invalid age';
    }

    var ageinseconds = Math.floor(FinalAge / 1000);
    var days = Math.floor(ageinseconds / 86400);
    var hours = Math.floor((ageinseconds % 86400) / 3600);
    var minutes = Math.floor((ageinseconds % 3600) / 60);
    var seconds = Math.floor(ageinseconds % 60);

    // Always show days + hours + minutes + seconds format
    return days + "d " + hours + "h " + minutes + "m " + seconds + "s";
}


function ConverttoIST(TimeValue){
    var PSToffset = 13.5;
    if(PDT) PSToffset = 12.5;
    var ETIME    = TimeValue+(PSToffset*3600000);
    var TimeIST = new Date(ETIME);
    return TimeIST;
}
