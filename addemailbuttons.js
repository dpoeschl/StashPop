document.addEventListener("DOMContentLoaded", function () {
    "use strict";
    initialSetup();
    reload();
});

var emailGitHubIssuesClassName = "emailGitHubIssues";

function initialSetup() {
    var s = document.createElement('script');
    s.src = chrome.extension.getURL('scripts/injectedcode.js');
    s.onload = function () {
        this.parentNode.removeChild(this);
    };

    (document.head || document.documentElement).appendChild(s);

    document.addEventListener('_pjax:end', function () {
        reload();
    }, false);
}

function reload() {
    $('.' + emailGitHubIssuesClassName).remove();

    addIndividualIssueButton();
    addButtonsToIssuesList();

    openJenkinsDetailsInNewTab();
    makeBuildStatusWindowsBig();

    addTestFailureButtonsAndDescriptions();
    addJenkinsTestRunTimes();
}

function addIndividualIssueButton() {
    var urlParts = stripTrailingSlash(window.location.href.substr(0, window.location.href.indexOf('#'))).split("/");
    var isPull = urlParts[urlParts.length - 2] == "pull";

    chrome.runtime.sendMessage({ method: "getSettings", keys: ["emailIssue", "emailPullRequest"] }, function (response) {
        var titleElement = document.getElementsByClassName("js-issue-title")[0]
        if (typeof titleElement !== 'undefined' && ((isPull && response.data["emailPullRequest"]) || (!isPull && response.data["emailIssue"]))) {
            var button = document.createElement("input");
            button.setAttribute("type", "button");
            button.setAttribute("value", isPull ? "Email PR" : "Email Issue");
            button.setAttribute("name", "buttonname");
            var issueNumber = document.getElementsByClassName("gh-header-number")[0].innerHTML.substring(1);
            var issueTitle = document.getElementsByClassName("js-issue-title")[0].innerHTML;
            button.onclick = (function () {
                var currentTitle = issueTitle;
                var currentNumber = issueNumber;
                var currentIsPull = isPull;
                return function () {
                    sendmail(currentNumber, currentTitle, currentIsPull);
                };
            })();

            button.className = "btn " + emailGitHubIssuesClassName;
            titleElement.parentNode.insertBefore(button, document.getElementsByClassName("js-issue-title")[0].parentNode.firstChild);
        }
    });
}

// TODO: Only scrape once between this and addTestFailureButtonsAndDescriptions
function addJenkinsTestRunTimes() {
    chrome.runtime.sendMessage({ method: "getSettings", keys: ["jenkinsShowRunTime"] }, function (response) {
        if (response.data["jenkinsShowRunTime"]) {

            var testRuns = document.getElementsByClassName("build-status-item");
            for (var i = 0; i < testRuns.length; i++) {
                var run = testRuns[i];
                var detailsLink = run.getElementsByClassName("build-status-details")[0];
                if (typeof detailsLink === 'undefined') {
                    continue;
                }

                var textToUpdate = run.getElementsByClassName("text-muted")[0];
 
                var loading = document.createElement("img");
                var imgUrl = chrome.extension.getURL("images/loading.gif");
                loading.src = imgUrl;
                var specificClassName = emailGitHubIssuesClassName + "_TestRunTime_" + i;
                loading.className = emailGitHubIssuesClassName + " " + specificClassName;
                textToUpdate.appendChild(loading);

                (function (_run, _url, _specificClassName) {
                    chrome.runtime.sendMessage({
                        method: 'GET',
                        action: 'xhttp',
                        url: _url,
                        data: ''
                    }, function (responseText) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(responseText, "text/html");
                        var header = doc.getElementsByClassName("build-caption page-headline")[0];
                        if (typeof header === "undefined") {
                          $('.' + _specificClassName).remove();
                          return;
                        }

                        var timestamp = header.innerText.split("(")[1].split(")")[0];
                        var timestampDisplay = " [Run on " + timestamp + ". "

                        // TODO: time zones?
                        var date = new Date(Date.parse(timestamp));
                        var currentdate = new Date();

                        var delta = currentdate - date;
                        var dayCount = delta / (1000 * 60 * 60 * 24);
                        var minuteCount = delta / (1000 * 60);

                        var backgroundColor = "#000000";
                        var timeAgo = Math.round(dayCount * 10) / 10 + " days ago";

                        if (dayCount <= 2) { backgroundColor = "#AAFFAA"; } // green
                        else if (dayCount <= 5) { backgroundColor = "#FFC85A"; } // yellow
                        else { backgroundColor = "#FFAAAA"; } // red

			$('.' + _specificClassName).remove();

                        var textToUpdate = _run.getElementsByClassName("text-muted")[0];

                        var span = document.createElement("span");
                        span.innerHTML = timestampDisplay;
                        span.className = emailGitHubIssuesClassName;
                        textToUpdate.appendChild(span);

                        var span2 = document.createElement("span");
                        span2.innerHTML = "(" + timeAgo + ")";
                        span2.style.backgroundColor = backgroundColor;
                        span2.setAttribute("title", "Green: < 2 days\nYellow: 2 to 5 days\nRed: > 5 days");
                        span2.className = emailGitHubIssuesClassName;
                        textToUpdate.appendChild(span2);

                        var span3 = document.createElement("span");
                        span3.innerHTML = "]";
                        span3.className = emailGitHubIssuesClassName;
                        textToUpdate.appendChild(span3);
                    });
                })(run, detailsLink.href, specificClassName);
            }
        }
    });
}

function addTestFailureButtonsAndDescriptions() {
    chrome.runtime.sendMessage({ method: "getSettings", keys: ["jenkinsShowBugFilingButton", "jenkinsShowFailureIndications", "jenkinsShowTestFailures"] }, function (response) {
        if (response.data["jenkinsShowBugFilingButton"] || response.data["jenkinsShowFailureIndications"]) {
                var testFailures = document.getElementsByClassName("octicon-x build-status-icon");

                for (var i = 0; i < testFailures.length; i++) {
                    var isDropdown = false;

                    var ancestor = testFailures[i];
                    while ((ancestor = ancestor.parentElement) != null) {
                        if (ancestor.classList.contains("dropdown-menu")) {
                            isDropdown = true;
                            break;
                        }
                    }

                    if (isDropdown) {
                        continue;
                    }

                    var testFailure = testFailures[i];
                    var testFailUrl = testFailure.parentNode.getElementsByClassName("build-status-details")[0].href;

                    var loading = document.createElement("img");
                    var imgUrl = chrome.extension.getURL("images/loading.gif");
                    loading.src = imgUrl;
                    var specificClassName = emailGitHubIssuesClassName + "_TestFailures_" + i;
                    loading.className = emailGitHubIssuesClassName + " " + specificClassName;
                    testFailure.parentNode.insertBefore(loading, testFailure.parentNode.firstChild);

                    (function (_testFailure, _testFailUrl, _specificClassName) {
                        chrome.runtime.sendMessage({
                            method: 'GET',
                            action: 'xhttp',
                            url: _testFailUrl,
                            data: ''
                        }, function (responseText) {
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(responseText, "text/html");
                            var h2elements = doc.getElementsByTagName("h2");
                            var aelements = doc.getElementsByTagName("a");

                            var url = window.location.href;
                            var urlParts = url.split("/");
                            var pullNumber = urlParts[urlParts.length - 1];
                            var pullTitle = document.getElementsByClassName("js-issue-title")[0].innerText.trim();
                            var pullAuthor = document.getElementsByClassName("pull-header-username")[0].innerText.trim();

                            var issueBody = "PR: [#" + pullNumber + "](" + url + ") *" + pullTitle + "* by @" + pullAuthor + "\r\n";
                            issueBody = issueBody + "Failure: " + _testFailUrl + "\r\n\r\n";
                            var htmlDescription = "";
                            var issueDescription = "<description>";

                            if (response.data["jenkinsShowTestFailures"]) {
                                for (var i = 0; i < aelements.length; i++) {
                                    var aelement = aelements[i];
                                    if (aelement.innerText == "Test Result" && aelement.parentNode.tagName == "TD") {
                                        var unitTestFailures = aelement.parentNode.getElementsByTagName("li");

                                        if (unitTestFailures.length > 0) {
                                            if (unitTestFailures.length <= 10) {
                                                htmlDescription = htmlDescription + "<b>" + unitTestFailures.length + " Test Failures:</b><br />";
                                                issueBody = issueBody + "**" + unitTestFailures.length + " Test Failures:**\r\n";
                                            }
                                            else {
                                                htmlDescription = htmlDescription + "<b>" + unitTestFailures.length + " Test Failures:</b> (showing first 10)<br />";
                                                issueBody = issueBody + "**" + unitTestFailures.length + " Test Failures:** (showing first 10)\r\n";
                                            }
                                        }

                                        for (var j = 0; j < unitTestFailures.length && j < 10; j++) {
                                            var unitTestFailure = unitTestFailures[j];
                                            htmlDescription = htmlDescription + "&nbsp;&nbsp;&nbsp;&nbsp;" + unitTestFailure.innerText + "<br />";
                                            issueBody = issueBody + unitTestFailure.innerText + "\r\n";
                                        }

                                        htmlDescription = htmlDescription + "<br />";
                                        issueBody = issueBody + "\r\n";
                                    }
                                }
                            }

                            var count = 1;
                            for (var i = 0; i < h2elements.length; i++) {
                                var h2 = h2elements[i];

                                if (h2.innerHTML == "HTTP ERROR 404") {
                                    htmlDescription = htmlDescription + "404: Build details page could not be found.";
                                    issueDescription = "404: Build details page could not be found.";
                                }

                                if (h2.innerHTML == "Identified problems") {
                                    var nodeWithErrorSiblings = h2.parentNode.parentNode;
                                    var errorRow = nodeWithErrorSiblings;
                                    while ((errorRow = errorRow.nextSibling) != null) {
                                        if (count > 1) {
                                            issueBody = issueBody + "\r\n\r\n";
                                            htmlDescription = htmlDescription + "<br /><br />";
                                        }

                                        var failureTitle = "";
                                        var failureDescription = "";

                                        var h3s = errorRow.getElementsByTagName("h3");
                                        var h4s = errorRow.getElementsByTagName("h4");
                                        if (h3s.length > 0) {
                                            failureTitle = h3s[0].innerHTML.split("<br")[0].trim();
                                            failureDescription = h3s[0].getElementsByTagName("b")[0].innerHTML.trim();
                                        }
                                        else if (h4s.length > 0) {
                                            failureTitle = h4s[0].innerHTML.trim();
                                            failureDescription = h4s[1].innerHTML.trim();
                                        }

                                        if (count == 1) {
                                          issueDescription = failureTitle;
                                        }

                                        issueBody = issueBody + "**Issue " + count + ": " + failureTitle + "**\r\n";
                                        issueBody = issueBody + failureDescription;
                                        htmlDescription = htmlDescription + "<b>Issue " + count + ": " + failureTitle + "</b><br />" + failureDescription;

                                        count++;
                                    }
                                }
                            }

                            if (count > 2) {
                              issueDescription = issueDescription + " (+" + (count - 2) + " more)";
                            }

                            if (count == 1) {
                                // we failed to find the failure, or there was none.
                                // should we add special handling here?
                            }

                            var testQueueName = _testFailure.parentNode.getElementsByClassName("text-emphasized")[0].innerText.trim();
                            var issueTitle = "[Test Failure] " + issueDescription + " in " + testQueueName + " on PR #" + pullNumber;

                            var url = "https://github.com/dotnet/roslyn/issues/new?title=" + encodeURIComponent(issueTitle) + "&body=" + encodeURIComponent(issueBody) + "&labels[]=Area-Infrastructure&labels[]=Contributor%20Pain";

                            $('.' + _specificClassName).remove();

                            if (response.data["jenkinsShowBugFilingButton"]) {
                                var button = document.createElement("input");
                                button.setAttribute("type", "button");
                                button.setAttribute("value", "Create Issue");
                                button.setAttribute("name", "buttonname");
                                button.onclick = (function () {
                                    var thisUrl = url;
                                    return function () {
                                        window.open(thisUrl);
                                    };
                                })();

                                button.className = "btn btn-sm " + emailGitHubIssuesClassName;
                                button.style.margin = "0px 0px 3px 0px";

                                _testFailure.parentNode.insertBefore(button, _testFailure.parentNode.firstChild);
                            }

                            if (response.data["jenkinsShowFailureIndications"]) {
                                var div = document.createElement("div");
                                div.innerHTML = htmlDescription;
                                div.style.backgroundColor = "#FFAAAA";
                                div.className = emailGitHubIssuesClassName;
                                _testFailure.parentNode.appendChild(div);
                            }
                        });
                    })(testFailure, testFailUrl, specificClassName);
                }
        }
    });
}

function makeBuildStatusWindowsBig() {
    var lists = document.getElementsByClassName("build-statuses-list");
    for (var i = 0; i < lists.length; i++) {
        lists[i].style.maxHeight = "5000px";
    }
}

function stripTrailingSlash(str) {
    if(str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

function addButtonsToIssuesList() {
    var url = stripTrailingSlash(window.location.href);
    var urlParts = url.split("/");

    var isPull = false;
    if (urlParts[urlParts.length - 1] == "pulls") {
      isPull = true;
    }

    chrome.runtime.sendMessage({ method: "getSettings", keys: ["emailIssuesList", "emailPullRequestList"] }, function (response) {
        var issuesList = document.getElementsByClassName("table-list-issues")[0];
        if (typeof issuesList !== 'undefined' && ((isPull && response.data["emailPullRequestList"]) || (!isPull && response.data["emailIssuesList"]))) {
            var issues = issuesList.children;

            for (var i = 0; i < issues.length; i++) {
                var issue = issues[i];
                var title = issue.getElementsByClassName("issue-title")[0];
                var button = document.createElement("input");
                button.setAttribute("type", "button");
                button.setAttribute("value", isPull ? "Email PR" : "Email Issue");
                button.setAttribute("name", "buttonname");

                var urlParts = title.getElementsByClassName("issue-title-link")[0].href.split("/");
                var issueNumber = urlParts[urlParts.length - 1];
                var issueTitle = title.getElementsByClassName("issue-title-link")[0].innerHTML;

                button.onclick = (function () {
                    var currentTitle = issueTitle;
                    var currentNumber = issueNumber;
                    return function () {
                        sendmail(currentNumber, currentTitle, isPull);
                    };
                })();
                button.className = "btn btn-sm " + emailGitHubIssuesClassName;

                title.insertBefore(button, title.firstChild);
            }
        }
    });
}

function openJenkinsDetailsInNewTab() {
    chrome.runtime.sendMessage({ method: "getSettings", keys: ["jenkinsOpenDetailsLinksInNewTab"] }, function (response) {
        if (response.data["jenkinsOpenDetailsLinksInNewTab"]) {
            var detailsLinks = document.getElementsByClassName("build-status-details");
            for (var i = 0; i < detailsLinks.length; i++) {
                var detailsLink = detailsLinks[i];
                detailsLink.target = "_blank";
            }
        }
    });
}

function sendmail(issueNumber, issueTitle, isPull) {
    issueTitle = issueTitle.trim();
    issueNumber = issueNumber.trim();

    var baseUrl = document.getElementsByClassName("entry-title public")[0].getElementsByTagName('strong')[0].getElementsByTagName('a')[0].href;
    var kind = isPull ? "PR" : "Issue";
    baseUrl = baseUrl + (isPull ? "/pull/" : "/issues/");

    var owner = document.getElementsByClassName("entry-title public")[0].getElementsByClassName("author")[0].getElementsByTagName("span")[0].innerHTML;
    var repo = document.getElementsByClassName("entry-title public")[0].getElementsByTagName("strong")[0].getElementsByTagName("a")[0].innerHTML;

    var subject = owner + "/" + repo + " " + kind + " #" + issueNumber + ": " + issueTitle;

    var body = baseUrl + issueNumber + "\r\n\r\n"; // TODO: Assigned to, etc.

    window.location.href = "mailto:?subject=" + encodeURI(subject) + "&body=" + encodeURI(body);
}