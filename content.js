// Constants
var stashPopClassName = "stashPop";
var jenkinsReloadableInfoClassName = "jenkinsReloadableInfo";

document.addEventListener("DOMContentLoaded", function () {
    "use strict";
    log("DOMContentLoaded");
    try {
        initialSetup();
        reload(true);
    }
    catch (err) {
        logfailure(err);
    }
});

function initialSetup() {
    log("Performing initial setup");

    var s = document.createElement('script');
    s.src = chrome.extension.getURL('scripts/injectedcode.js');
    s.onload = function () {
        this.parentNode.removeChild(this);
    };

    (document.head || document.documentElement).appendChild(s);

    document.addEventListener('_pjax:end', function () {
        log("Detected page data changed.");
        reload(false);
    }, false);
}

function reload(firstRun) {
    resetGlobals();

    log("Remove all StashPop elements and reload data");
    $('.' + stashPopClassName).remove();

    if (isIndividualItemPage) {
        var title = document.getElementsByClassName("js-issue-title")[0].innerHTML;
        var number = document.getElementsByClassName("gh-header-number")[0].innerHTML.substring(1);

        // https://github.com/dotnet/roslyn/pull/5786
        var isPull = postDomainUrlParts[2] == "pull";

        addButtonsToIndividualItemPage(title, number, isPull);
        openJenkinsDetailsInNewTab();
        makeBuildStatusWindowsBig();
    }

    if (isListPage) {
        // https://github.com/dotnet/roslyn/pulls/dpoeschl
        // https://github.com/pulls
        var isPull = postDomainUrlParts[2] == "pulls" || (currentPageOrg == null && postDomainUrlParts[0] == "pulls");
        addButtonsToListPage(isPull);
    }

    reloadJenkins(firstRun);
}

function reloadJenkins(firstRun) {
    if (!firstRun) {
        log("Deleting inlined Jenkins data");
        $('.' + jenkinsReloadableInfoClassName).remove();
    }

    addTestFailureButtonsAndDescriptions();
    addJenkinsTestRunTimes();
    addJenkinsRefreshButton();
}

// Globals
var currentPageFullUrl;
var postDomainUrlParts;
var currentPageOrg;
var currentPageRepo;

var isIndividualItemPage;
var individualItemPageTitleElement;

var isListPage;
var itemListElement;

function resetGlobals() {
    log("Resetting globals");
    log("Clearing old globals");

    currentPageFullUrl = null;
    postDomainUrlParts= null;
    currentPageOrg= null;
    currentPageRepo = null;
    isIndividualItemPage = null;
    individualItemPageTitleElement = null;
    isListPage = null;
    itemListElement = null;

    log("Setting new globals");

    currentPageFullUrl = window.location.href;
    log("currentPageFullUrl: " + currentPageFullUrl);

    var urlParts = normalizeAndRemoveUrlParameters(currentPageFullUrl).split("/");
    var indexOfGitHubDotCom = -1;
    for (var i = 0; i < urlParts.length; i++) {
        if (urlParts[i].indexOf("github.com") > -1) {
            indexOfGitHubDotCom = i;
            break;
        }
    }

    if (indexOfGitHubDotCom > -1) {
        postDomainUrlParts = urlParts.slice(indexOfGitHubDotCom + 1, urlParts.length);
        log("postDomainUrlParts: " + postDomainUrlParts.toString());
        var org = urlParts[indexOfGitHubDotCom + 1];
        var repo = urlParts[indexOfGitHubDotCom + 2];
        log("ASDF" + repo);
        if (typeof org !== "undefined") {
            if (org == "pulls") {
                // Personal pulls page: github.com/pulls...
                // Handled below, but don't treat "pulls" as the organization
            } else {
                // Organization sub-page: github.com/dotnet...
                currentPageOrg = org;
            }
        }
        log("currentPageOrg: " + currentPageOrg);

        if (typeof repo !== "undefined") {
            // Repository sub-page: github.com/dotnet/roslyn...
            currentPageRepo = repo;
        }
        log("currentPageRepo: " + currentPageRepo);

        individualItemPageTitleElement = document.getElementsByClassName("js-issue-title")[0];
        isIndividualItemPage = typeof individualItemPageTitleElement !== 'undefined';
        log("isIndividualItemPage: " + isIndividualItemPage);

        itemListElement = document.getElementsByClassName("table-list-issues")[0];
        isListPage = typeof itemListElement !== 'undefined';
        log("isListPage: " + isListPage);
    }
}

function logfailure(err) {
    log("ERROR - " + err);
    log("ERROR STACK - " + err.stack);
}

function log(message) {
    console.log("StashPop: " + message);
}

function addButtonsToIndividualItemPage(title, number, isPull) {
    var buttonsContainer = document.createElement("div");
    buttonsContainer.setAttribute("class", stashPopClassName);

    var emailButton = createButtonWithCallBack(
        isPull ? "Email PR" : "Email Issue",
        function () {
            log("Email Item clicked");
            sendmail(number, title, isPull);
        });

    buttonsContainer.appendChild(emailButton);

    if (!isPull) {
        var workItemButton = createButtonWithCallBack(
            "Copy as WorkItem Attribute",
            function () {
                log("Copy as WorkItem Attribute clicked");
                copyTextToClipboard('<WorkItem(' + number + ', "' + window.location.href + '")>');
            });

        buttonsContainer.appendChild(workItemButton); 
    }
            
    individualItemPageTitleElement.parentNode.appendChild(buttonsContainer);
}

function addButtonsToListPage(isPull) {
    var numberOfCheckedItemsElement = document.getElementsByClassName("js-check-all-count")[0];
    if (typeof numberOfCheckedItemsElement !== "undefined") {
        var buttonAll = createButtonWithCallBack(
            "Email Selected " + (isPull ? "PRs" : "Issues"),
            function () {
                log("Email Selected Items clicked");
                sendmultimail(itemListElement, isPull);
            });
        buttonAll.className = "btn btn-sm";
        numberOfCheckedItemsElement.parentNode.insertBefore(buttonAll, numberOfCheckedItemsElement.parentNode.firstChild);
    }

    for (var i = 0; i < itemListElement.children.length; i++) {
        var itemElement = itemListElement.children[i];
        var titleElement = itemElement.getElementsByClassName("issue-title")[0];

        var urlParts = titleElement.getElementsByClassName("issue-title-link")[0].href.split("/");
        var issueNumber = urlParts[urlParts.length - 1];
        var issueTitle = titleElement.getElementsByClassName("issue-title-link")[0].innerHTML;

        (function () {
            var _issueNumber = issueNumber;
            var _issueTitle = issueTitle;
            var emailButton = createButtonWithCallBack(
                isPull ? "Email PR" : "Email Issue",
                function () {
                    log("Email Item clicked");
                    sendmail(_issueNumber, _issueTitle, isPull);
                });
            emailButton.className = "btn btn-sm " + stashPopClassName;
            titleElement.insertBefore(emailButton, titleElement.firstChild);
        })();
    }

    if (isPull) {
        var failureTitles = new Array()
        var failureClassNames = new Array();
        var failureIndices = new Array();

        for (var i = 0; i < itemListElement.children.length; i++) {
            var itemElement = itemListElement.children[i];
            if (typeof itemElement.getElementsByClassName("octicon-x")[0] !== "undefined") {
                // PR with failures
                log("Found a failure");
                var titleElement = itemElement.getElementsByClassName("issue-title")[0];
                var pullRequestElement = itemElement.getElementsByClassName("issue-title")[0];

                // On github.com/pulls there are two "issue-title-link" elements. The first is for the repo, the second for the issue.
                // Get the issue number, then add the repo qualifier if necessary.
                var pullRequestUrlParts = pullRequestElement.getElementsByClassName("issue-title-link js-navigation-open")[0].href.split("/");
                log("PR Request Parts: " + pullRequestUrlParts.toString());
                var pullRequestNumber = pullRequestUrlParts[pullRequestUrlParts.length - 1];
                log("In PR #" + pullRequestNumber);

                var pullRequestRepo = "";
                if (currentPageOrg == null) {
                    var prOrg = pullRequestUrlParts[pullRequestUrlParts.length - 4];
                    var prRepo = pullRequestUrlParts[pullRequestUrlParts.length - 3];
                    pullRequestRepo = prOrg + "_ClassNameFriendlySeparator_" + prRepo;
                    log("In Repo: " + pullRequestRepo);
                }

                var pullRequestIdentifier = pullRequestRepo + pullRequestNumber;
                log("Failure identifier: " + pullRequestIdentifier);

                var showJenkinsFailureLink = document.createElement("a");
                showJenkinsFailureLink.href = "#";
                var className = "loadjenkinsfailure" + pullRequestIdentifier;
                showJenkinsFailureLink.className = stashPopClassName + " " + jenkinsReloadableInfoClassName + " " + className;
                showJenkinsFailureLink.text = "Show Jenkins failure";
                showJenkinsFailureLink.style.color = 'red';

                log("titleElement:" + titleElement);
                log("showJenkinsFailureLink:" + showJenkinsFailureLink);

                titleElement.appendChild(showJenkinsFailureLink);

                failureTitles.push(titleElement);
                failureClassNames.push(className);
                failureIndices.push(i);

                (function() {
                    var _titleElement = titleElement;
                    var _className = className;
                    var _i = i;

                    log("Hooking up click event for class " + _className);

                    $('.' + _className).click(function (e) {
                        e.preventDefault();
                        log("Click - Load Jenkins Failure for #" + _className.substring("loadjenkinsfailure".length));
                        inlineFailureInfoToPRList(_titleElement, _className, _i);
                    });
                })();
            }
        }

        if (failureTitles.length >= 1) {
            var headerStates = document.getElementsByClassName("table-list-header-toggle states")[0];

            var loadAllFailuresLink = document.createElement("a");
            loadAllFailuresLink.href = "#";
            loadAllFailuresLink.className = stashPopClassName + " " + jenkinsReloadableInfoClassName + " loadalljenkinsfailures";
            loadAllFailuresLink.text = "Show all Jenkins failures";
            loadAllFailuresLink.style.color = 'red';
            headerStates.appendChild(loadAllFailuresLink);

            $('.loadalljenkinsfailures').click(function (e) {
                log("Click - Load All Jenkins Failures")
                e.preventDefault();
                for (var i = 0; i < failureTitles.length; i++) {
                    inlineFailureInfoToPRList(failureTitles[i], failureClassNames[i], failureIndices[i]);
                }
            });
        }
    }
}

function createButtonWithCallBack(title, callback)
{
    var button = document.createElement("input");
    button.setAttribute("type", "button");
    button.setAttribute("value", title);
    button.onclick = callback;
    return button;
}

// Copy provided text to the clipboard.
function copyTextToClipboard(text) {
    var copyFrom = $('<textarea/>');
    copyFrom.text(text);
    $('body').append(copyFrom);
    copyFrom.select();
    document.execCommand('copy');
    copyFrom.remove();
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
                var specificClassName = stashPopClassName + "_TestRunTime_" + i;
                loading.className = stashPopClassName + " " + specificClassName;
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
                        span.innerHTML = "(" + timeAgo + ")";
                        span.style.backgroundColor = backgroundColor;
                        span.setAttribute("title", timestamp + "\n\nGreen: < 2 days\nYellow: 2 to 5 days\nRed: > 5 days");
                        span.className = stashPopClassName + " " + jenkinsReloadableInfoClassName;
                        textToUpdate.appendChild(span);
                    });
                })(run, detailsLink.href, specificClassName);
            }
        }
    });
}

function addTestFailureButtonsAndDescriptions() {
    chrome.runtime.sendMessage({ method: "getSettings", keys: ["jenkinsShowBugFilingButton", "jenkinsShowFailureIndications", "jenkinsShowTestFailures"] }, function (response) {
        if (response.data["jenkinsShowBugFilingButton"] || response.data["jenkinsShowFailureIndications"]) {
            processTestFailures(document, null, 0, function (x, y, z, w) { });
        }
    });
}

function processTestFailures(doc, prLoadingDiv, rowNumber, callbackWhenTestProcessed) {
    var testFailures = doc.getElementsByClassName("octicon-x build-status-icon");

    if (typeof prLoadingDiv !== "undefined" && prLoadingDiv !== null) {
        // Delete the existing loading icon
        while (prLoadingDiv.firstChild) {
            prLoadingDiv.removeChild(prLoadingDiv.firstChild);
        }

        // Drop in a bunch of new loading icons
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

            var div = document.createElement("div");
            var specificClassName = stashPopClassName + "_ActualTestFailureHolder_" + rowNumber + "_" + i;
            div.className = stashPopClassName + " " + specificClassName;
            div.style.color = "#000000";

            var loading = doc.createElement("img");
            var imgUrl = chrome.extension.getURL("images/loading.gif");
            loading.src = imgUrl;

            var testFailure = testFailures[i];
            var queueName = testFailure.parentNode.getElementsByClassName("text-emphasized")[0].innerText.trim();
            var t = document.createTextNode("Processing failed queue '" + queueName + "'...");
            div.appendChild(loading);
            div.appendChild(t);

            prLoadingDiv.appendChild(div);
        }
    }

    if (!isListPage) {
        chrome.runtime.sendMessage({ method: "getSettings", keys: ["nonDefaultTestInfo"] }, function (response) {
            var nonDefaultTestInfo = response.data["nonDefaultTestInfo"];
            var nonDefaultTests = nonDefaultTestInfo.trim().match(/[^\r\n]+/g);

            var relevantNonDefaultTests = new Array();

            log("Calculating relevant non-default test suites...")

            for (var i = 0; i < nonDefaultTests.length; i++) {
                log("  Considering: " + nonDefaultTests[i])

                var specParts = nonDefaultTests[i].trim().split(":");
                if (specParts.length == 2 || specParts.length == 3) {
                    var scope = specParts[0].trim();
                    var testToRun = specParts[1].trim();
                    var runIfNotAlreadyRun = specParts.length == 3 ? specParts[2].trim() : testToRun;

                    var scopeParts = scope.trim().split("/");
                    if (scopeParts.length == 1 || scopeParts.length == 2) {
                        var orgToMatch = scopeParts[0].trim();
                        if (orgToMatch == currentPageOrg) {
                            var repoToMatch = scopeParts.length == 2 ? scopeParts[1].trim() : "";
                            if (scopeParts.length == 1 || repoToMatch == currentPageRepo) {
                                log("    It matches, adding mapping from " + runIfNotAlreadyRun + " to " + testToRun);
                                relevantNonDefaultTests[runIfNotAlreadyRun] = testToRun;
                            }
                        }
                    }
                }
            }

            var nonDefaultTestCount = 0;
            for (var key in relevantNonDefaultTests) {
                nonDefaultTestCount++;
            }

            log("relevantNonDefaultTests length: " + nonDefaultTestCount);
            log("Removing already-run tests...")

            var buildStatusList = $(".build-statuses-list:visible")[0];

            if (typeof buildStatusList !== "undefined") {
                for (var i = 0; i < buildStatusList.children.length; i++) {
                    var individualStatus = buildStatusList.children[i];
                    var queueName = individualStatus.getElementsByTagName("strong")[0].innerText.trim();

                    log("  Trying to delete: " + queueName);
                    delete relevantNonDefaultTests[queueName];
                }

                nonDefaultTestCount = 0;
                for (var key in relevantNonDefaultTests) {
                    nonDefaultTestCount++;
                }

                log("Updated relevantNonDefaultTests length: " + nonDefaultTestCount);

                if (nonDefaultTestCount > 0) {
                    var additionalJobsDiv = doc.createElement("div");
                    additionalJobsDiv.className = stashPopClassName + " " + jenkinsReloadableInfoClassName;

                    var t = document.createTextNode("Run non-default tests: ");
                    additionalJobsDiv.appendChild(t);

                    for (var key in relevantNonDefaultTests) {
                        var value = relevantNonDefaultTests[key];
                        (function () {
                            var jobName = value;
                            var jobButton = createButtonWithCallBack(
                                jobName,
                                function () {
                                    var commentText = "retest " + jobName + " please\n";
                                    $("#new_comment_field").val(commentText);

                                    var offset = $("#new_comment_field").offset();
                                    offset.left -= 20;
                                    offset.top -= 20;
                                    $('html, body').animate({
                                        scrollTop: offset.top,
                                        scrollLeft: offset.left
                                    });

                                    $("#new_comment_field").stop().css("background-color", "#FFFF9C")
                                        .animate({ backgroundColor: "#FFFFFF" }, 1500);
                                });
                            jobButton.className = "btn btn-sm";
                            additionalJobsDiv.appendChild(jobButton);
                        })();
                    }

                    buildStatusList.previousSibling.previousSibling.appendChild(additionalJobsDiv);
                }
            }
        });
    }

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
        var queueName = testFailure.parentNode.getElementsByClassName("text-emphasized")[0].innerText.trim();

        var loading = doc.createElement("img");
        var imgUrl = chrome.extension.getURL("images/loading.gif");
        loading.src = imgUrl;
        var specificClassNameForJenkinsFailureRedAreaLoader = stashPopClassName + "_TestFailures_" + i;
        loading.className = stashPopClassName + " " + specificClassNameForJenkinsFailureRedAreaLoader;
        testFailure.parentNode.insertBefore(loading, testFailure.parentNode.firstChild);

        var specificClassNameForPRListFailure = stashPopClassName + "_ActualTestFailureHolder_" + rowNumber + "_" + i;

        (function (_testFailure, _testFailUrl, _specificClassNameForPRListFailure, _specificClassNameForJenkinsFailureRedAreaLoader, _queueName) {
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
                var pullTitle = "";

                if (typeof document.getElementsByClassName("js-issue-title")[0] !== "undefined") {
                    pullTitle = document.getElementsByClassName("js-issue-title")[0].innerText.trim();
                }

                var pullAuthor = "";
                if (typeof document.getElementsByClassName("pull-header-username")[0] !== "undefined") {
                    pullAuthor = document.getElementsByClassName("pull-header-username")[0].innerText.trim();
                }

                var issueBody = "PR: [#" + pullNumber + "](" + url + ") *" + pullTitle + "* by @" + pullAuthor + "\r\n";
                issueBody = issueBody + "Failure: " + _testFailUrl + "\r\n\r\n";
                var htmlDescription = "";
                var issueDescription = "<description>";

                if (true) {
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

                // DO SETTINGS STUFF

                chrome.runtime.sendMessage({ method: "getSettings", keys: ["issueCreationRouting"] }, function (response) {
                    var issueCreationRouting = response.data["issueCreationRouting"];
                    var issueRoutes = issueCreationRouting.trim().match(/[^\r\n]+/g);

                    var targetOrg = currentPageOrg;
                    var targetRepo = currentPageRepo;

                    for (var routeNum = 0; routeNum < issueRoutes.length; routeNum++) {
                        var routeParts = issueRoutes[routeNum].trim().split(":");
                        var fromParts = routeParts[0].trim().split("/");
                        var toParts = routeParts[1].trim().split("/");

                        if (fromParts.length == 2 && toParts.length == 2 && fromParts[0].trim() == currentPageOrg && fromParts[1].trim() == currentPageRepo) {
                            targetOrg = toParts[0].trim();
                            targetRepo = toParts[1].trim();
                            break;
                        }
                    }

                    var previousFailureUrl = _testFailUrl;
                    var url = "https://github.com/" + targetOrg + "/" + targetRepo + "/issues/new?title=" + encodeURIComponent(issueTitle) + "&body=" + encodeURIComponent(issueBody) + "&labels[]=Area-Infrastructure&labels[]=Contributor%20Pain";
                    var jobName = testQueueName;

                    if (true) {
                        var retestButton = doc.createElement("input");
                        retestButton.setAttribute("type", "button");
                        retestButton.setAttribute("value", "Retest");
                        retestButton.setAttribute("name", "buttonname");
                        retestButton.onclick = (function () {
                            var thisUrl = url;
                            var thisJobName = jobName;
                            var thisPreviousFailureUrl = previousFailureUrl;
                            return function () {
                                var commentText = "retest " + thisJobName + " please\n// Previous failure: " + thisPreviousFailureUrl + "\n// Retest reason: ";
                                $("#new_comment_field").val(commentText);

                                var offset = $("#new_comment_field").offset();
                                offset.left -= 20;
                                offset.top -= 20;
                                $('html, body').animate({
                                    scrollTop: offset.top,
                                    scrollLeft: offset.left
                                });

                                $("#new_comment_field").stop().css("background-color", "#FFFF9C")
                                    .animate({ backgroundColor: "#FFFFFF" }, 1500);
                            };
                        })();

                        retestButton.className = "btn btn-sm " + stashPopClassName + " " + jenkinsReloadableInfoClassName;
                        retestButton.style.margin = "0px 0px 3px 0px";

                        _testFailure.parentNode.insertBefore(retestButton, _testFailure.parentNode.firstChild);

                        var button = doc.createElement("input");
                        button.setAttribute("type", "button");
                        button.setAttribute("value", "Create Issue");
                        button.setAttribute("name", "buttonname");
                        button.onclick = (function () {
                            var thisUrl = url;
                            return function () {
                                window.open(thisUrl);
                            };
                        })();

                        button.className = "btn btn-sm " + stashPopClassName + " " + jenkinsReloadableInfoClassName;
                        button.style.margin = "0px 0px 3px 0px";

                        _testFailure.parentNode.insertBefore(button, _testFailure.parentNode.firstChild);
                    }
                });

                if (true) {
                    var div = doc.createElement("div");

                    if (typeof htmlDescription === "undefined" || htmlDescription == "") {
                        htmlDescription = "Unknown Failure - If this is a private Jenkins job, click the 'Details' button to reauthenticate and then reload this failure data.";
                    }

                    div.innerHTML = htmlDescription.trim();
                    div.style.backgroundColor = "#FFAAAA";
                    div.className = stashPopClassName + " " + jenkinsReloadableInfoClassName;
                    _testFailure.parentNode.appendChild(div);
                }

                $("." + _specificClassNameForJenkinsFailureRedAreaLoader).remove();

                callbackWhenTestProcessed(_queueName, _testFailUrl, htmlDescription, _specificClassNameForPRListFailure);
            });
        })(testFailure, testFailUrl, specificClassNameForPRListFailure, specificClassNameForJenkinsFailureRedAreaLoader, queueName);
    }
}

function makeBuildStatusWindowsBig() {
    var lists = document.getElementsByClassName("build-statuses-list");
    for (var i = 0; i < lists.length; i++) {
        lists[i].style.maxHeight = "5000px";
    }
}

function addJenkinsRefreshButton() {
    var lists = $(".build-statuses-list");
    for (var i = 0; i < lists.length; i++) {
        var list = lists[i];
        var a = document.createElement("a");
        a.href = "#";
        a.className = stashPopClassName + " " + jenkinsReloadableInfoClassName + " jenkinsreload";
        a.text = "Reload Jenkins data";
        list.previousSibling.previousSibling.appendChild(a);
    }

    $('.jenkinsreload').click(function (e) { 
        e.preventDefault();
        reloadJenkins();
    });
}

function normalizeAndRemoveUrlParameters(str) {
    str = stripFragment(str);
    str = stripQueryString(str);
    return stripTrailingSlash(str);
}

function stripTrailingSlash(str) {
    return str.substr(-1) === '/' ? str.substring(0, str.length - 1) : str;
}

function stripQueryString(str) {
    return str.indexOf('?') >= 0 ? str.substring(0, str.indexOf('?')) : str;
}

function stripFragment(str) {
    return str.indexOf('#') >= 0 ? str.substring(0, str.indexOf('#')) : str;
}

function inlineFailureInfoToPRList(title, className, i) {
    var clickToLoadText = title.getElementsByClassName(className)[0];
    if (typeof clickToLoadText === "undefined") {
        // Already expanded. Don't re-expand.
        return;
    }

    $("." + className).remove();

    log("Inlining Jenkins failures to PR list for " + className + " (position " + i + " on this page)");

    // On github.com/pulls there are two "issue-title-link" elements.
    var thisFailureUrl = title.getElementsByClassName("issue-title-link js-navigation-open")[0].href;
    log("thisFailureUrl:" + thisFailureUrl);

    var redDiv = document.createElement("div");
    redDiv.style.backgroundColor = "#FFAAAA";
    redDiv.className = stashPopClassName + " " + jenkinsReloadableInfoClassName;

    var loading = document.createElement("img");
    var imgUrl = chrome.extension.getURL("images/loading.gif");
    loading.src = imgUrl;

    var prLoadingDiv = document.createElement("div");
    prLoadingDiv.style.backgroundColor = "#FFAAAA";
    prLoadingDiv.style.color = "#000000";
    prLoadingDiv.appendChild(loading);
    var t = document.createTextNode("Loading PR contents...");
    prLoadingDiv.appendChild(t);
    var specificClassName = stashPopClassName + "_LoadPRContents_" + i;
    prLoadingDiv.className = specificClassName;

    redDiv.appendChild(prLoadingDiv);

    (function (_thisFailureUrl, _divToAddTo, _prLoadingDiv) {
        chrome.runtime.sendMessage({
            method: 'GET',
            action: 'xhttp',
            url: _thisFailureUrl,
            data: ''
        }, function (responseText) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(responseText, "text/html");
            processTestFailures(
                doc,
                _prLoadingDiv,
                i,
                function (failurequeue, detailsurl, resultstr, classNameToPlaseResultsIn) {
                    var divToPlaceResultsIn = document.getElementsByClassName(classNameToPlaseResultsIn)[0];
                    while (divToPlaceResultsIn.firstChild) {
                        divToPlaceResultsIn.removeChild(divToPlaceResultsIn.firstChild);
                    }

                    var _individualFailureDiv = document.createElement("div");
                    var _span = document.createElement("span");
                    _span.innerHTML = "<b><u>" + failurequeue + "</u></b> <a href = '" + encodeURI(detailsurl) + "' target='_blank'>Details</a><br />";
                    _individualFailureDiv.appendChild(_span);

                    var _nestedDiv = document.createElement("div");
                    _nestedDiv.style.padding = "0px 0px 0px 30px";

                    var _span2 = document.createElement("span");
                    _span2.innerHTML = resultstr + "<br /><br />";
                    _nestedDiv.appendChild(_span2);

                    _individualFailureDiv.appendChild(_nestedDiv);

                    _individualFailureDiv.style.color = "#000000";
                    divToPlaceResultsIn.appendChild(_individualFailureDiv);
                });
        });
    })(thisFailureUrl, redDiv, prLoadingDiv);

    title.appendChild(redDiv);
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

function sendmultimail(issuesList, isPull) {
    var baseUrl = document.getElementsByClassName("entry-title")[0].getElementsByTagName('strong')[0].getElementsByTagName('a')[0].href;
    baseUrl = baseUrl + (isPull ? "/pull/" : "/issues/");

    var owner = document.getElementsByClassName("entry-title")[0].getElementsByClassName("author")[0].getElementsByTagName("span")[0].innerHTML;
    var repo = document.getElementsByClassName("entry-title")[0].getElementsByTagName("strong")[0].getElementsByTagName("a")[0].innerHTML;

    var body = "";
    var shortBody = "";
    var count = 0;
    var singleIssueNumber = "";
    var singleIssueTitle = "";
    for (var i = 0; i < issuesList.children.length; i++) {
        if (issuesList.children[i].classList.contains("selected")) {
            count++;
            var issue = issuesList.children[i];
            var title = issue.getElementsByClassName("issue-title")[0];
            var urlParts = title.getElementsByClassName("issue-title-link")[0].href.split("/");
            var issueNumber = urlParts[urlParts.length - 1].trim();
            var issueTitle = title.getElementsByClassName("issue-title-link")[0].innerHTML.trim();

            singleIssueNumber = issueNumber;
            singleIssueTitle = issueTitle;

            body = body + issueTitle + " " + baseUrl + issueNumber + "\r\n";
            shortBody = shortBody + "#" + issueNumber + ": " + issueTitle + "\r\n";
        }
    }

    if (count == 1) {
      sendmail(singleIssueNumber, singleIssueTitle, isPull);
      return;
    }

    var subject = owner + "/" + repo + ": " + count + " Selected " + (isPull ? "PRs" : "Issues");
    body = body + "\r\n\r\n"; // TODO: Assigned to, etc.
    shortBody = shortBody + "\r\n\r\n"; // TODO: Assigned to, etc.

    var isPublic = (typeof document.getElementsByClassName("entry-title private")[0] === "undefined");
    if (!isPublic) {
        body = body + "Notice: This message contains information about a private repository."
        shortBody = shortBody + "Notice: This message contains information about a private repository."
    }

    var finalFullMailToUrl = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    var finalShortMailToUrl = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(shortBody);

    if (finalFullMailToUrl.length <= 2083) {
        window.location.href = finalFullMailToUrl;
    } else if (finalShortMailToUrl.length <= 2083) {
        window.location.href = finalShortMailToUrl;
        window.alert("issue links omitted to fit within the maximum mailto url length");
    } else {
        window.alert("mailto maximum url length exceeded, choose fewer items");
    }
}

function sendmail(issueNumber, issueTitle, isPull) {
    issueTitle = issueTitle.trim();
    issueNumber = issueNumber.trim();

    var baseUrl = document.getElementsByClassName("entry-title")[0].getElementsByTagName('strong')[0].getElementsByTagName('a')[0].href;
    var kind = isPull ? "PR" : "Issue";
    baseUrl = baseUrl + (isPull ? "/pull/" : "/issues/");

    var owner = document.getElementsByClassName("entry-title")[0].getElementsByClassName("author")[0].getElementsByTagName("span")[0].innerHTML;
    var repo = document.getElementsByClassName("entry-title")[0].getElementsByTagName("strong")[0].getElementsByTagName("a")[0].innerHTML;

    var subject = owner + "/" + repo + " " + kind + " #" + issueNumber + ": " + issueTitle;

    var body = baseUrl + issueNumber + "\r\n\r\n"; // TODO: Assigned to, etc.
    var isPublic = (typeof document.getElementsByClassName("entry-title private")[0] === "undefined");
    if (!isPublic) {
        body = body + "Notice: This message contains information about a private repository."
    }

    window.location.href = "mailto:?subject=" + encodeURI(subject) + "&body=" + encodeURI(body);
}