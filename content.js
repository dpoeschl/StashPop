// Constants
var stashPopClassName = "stashPop";
var jenkinsReloadableInfoClassName = "jenkinsReloadableInfo";

// This list must match the list specified in reload()
var option_emailIssuesList = "emailIssuesList";
var option_emailIssue = "emailIssue";
var option_emailPullRequestList = "emailPullRequestList";
var option_emailPullRequest = "emailPullRequest";
var option_jenkinsOpenDetailsLinksInNewTab = "jenkinsOpenDetailsLinksInNewTab";
var option_jenkinsShowRunTime = "jenkinsShowRunTime";
var option_jenkinsShowFailureIndications = "jenkinsShowFailureIndications";
var option_jenkinsShowTestFailures = "jenkinsShowTestFailures";
var option_jenkinsShowBugFilingButton = "jenkinsShowBugFilingButton";
var option_jenkinsShowRetestButton = "jenkinsShowRetestButton";
var option_jenkinsOfferInlineFailuresOnPRList = "jenkinsOfferInlineFailuresOnPRList";
var option_issueCreationRouting = "issueCreationRouting";
var option_nonDefaultTestInfo = "nonDefaultTestInfo";
var option_defaultIssueLabels = "defaultIssueLabels";
var option_testRerunText = "testRerunText";
var option_showCodeReviewInfo = "showCodeReviewInfo";
var option_codeReviewOptions = "codeReviewOptions";

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

    configureTooltips();

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

function configureTooltips() {
    log("Configuring tooltips");

    $(document).tooltip({
        items: "[stashpop-title]",
        track: false,
        close: function (evt, ui) {
            $(document).data("ui-tooltip").liveRegion.children().remove();
        },
        position: {
            my: "left+5 top+5",
            at: "left bottom"
        },
        tooltipClass: "ui-tooltip",
        show: "slideDown",
        hide: false,
        content: function () {
            var element = $(this);
            if (element.is("[stashpop-title]")) {
                var text = element.attr("stashpop-title");
                return text; // "<b>What up?</b> Yo?";
            }
        }
    });
}

function reload(firstRun) {
    resetGlobals();

    log("Remove all StashPop elements and reload data");
    $('.' + stashPopClassName).remove();

    chrome.runtime.sendMessage({
        method: "getSettings",
        keys:
            [
                option_emailIssuesList,
                option_emailIssue,
                option_emailPullRequestList,
                option_emailPullRequest,
                option_jenkinsOpenDetailsLinksInNewTab,
                option_jenkinsShowRunTime,
                option_jenkinsShowFailureIndications,
                option_jenkinsShowTestFailures,
                option_jenkinsShowBugFilingButton,
                option_jenkinsShowRetestButton,
                option_jenkinsOfferInlineFailuresOnPRList,
                option_issueCreationRouting,
                option_nonDefaultTestInfo,
                option_defaultIssueLabels,
                option_testRerunText,
                option_showCodeReviewInfo,
                option_codeReviewOptions
            ] },
        function (currentSettings) {
            if (isIndividualItemPage) {
                var title = document.getElementsByClassName("js-issue-title")[0].innerHTML;
                var number = document.getElementsByClassName("gh-header-number")[0].innerHTML.substring(1);

                // https://github.com/dotnet/roslyn/pull/5786
                var isPull = postDomainUrlParts[2] == "pull";

                if (isPull && currentSettings[option_showCodeReviewInfo]) {

                    var bestCodeReviewOptions = getBestCodeReviewOptions(currentSettings[option_codeReviewOptions]);

                    observeCommentFieldChanges(bestCodeReviewOptions);
                    addCodeReviewSummaryAndButtons(bestCodeReviewOptions);
                }

                addButtonsToIndividualItemPage(title, number, isPull, currentSettings);

                makeBuildStatusWindowsBig();
                if (currentSettings[option_jenkinsOpenDetailsLinksInNewTab]) {
                    openJenkinsDetailsInNewTab(currentSettings);
                }
            }

            if (isListPage) {
                // https://github.com/dotnet/roslyn/pulls/dpoeschl
                // https://github.com/pulls
                var isPull = postDomainUrlParts[2] == "pulls" || (currentPageOrg == null && postDomainUrlParts[0] == "pulls");
                addButtonsToListPage(isPull, currentSettings);
            }

            reloadJenkins(firstRun, currentSettings);
        }
    );
}

function observeCommentFieldChanges(codeReviewOptions) {
    var splitCodeOptions = codeReviewOptions.split(";");
    var positiveIndicatorsString = splitCodeOptions[1].trim();
    var negativeIndicatorsString = splitCodeOptions[2].trim();
    var testedIndicatorsString = splitCodeOptions[3].trim();

    if (positiveIndicatorsString.length == 0 && negativeIndicatorsString.length == 0 && testedIndicatorsString.length == 0) {
        log("Empty code review options. Bail.")
        return;
    }

    var positiveIndicators = positiveIndicatorsString.split(",");
    var negativeIndicators = negativeIndicatorsString.split(",");
    var testedIndicators = testedIndicatorsString.split(",");

    var target = document.querySelector('#new_comment_field');
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            var text = target.value;

            for (var c = 0; c < positiveIndicators.length; c++) {
                if (text.indexOf(positiveIndicators[c]) >= 0) {
                    $(".comment-form-head:visible").each(function () {
                        this.style.backgroundColor = "#77ff77";
                    });
                    return;
                }
            }

            for (var c = 0; c < negativeIndicators.length; c++) {
                if (text.indexOf(negativeIndicators[c]) >= 0) {
                    $(".comment-form-head:visible").each(function () {
                        this.style.backgroundColor = "#ff7777";
                    });
                    return;
                }
            }

            for (var c = 0; c < testedIndicators.length; c++) {
                if (text.indexOf(testedIndicators[c]) >= 0) {
                    $(".comment-form-head:visible").each(function () {
                        this.style.backgroundColor = "#77ccff";
                    });
                    return;
                }
            }

            // Default background color
            $(".comment-form-head:visible").each(function () {
                this.style.backgroundColor = "#f7f7f7";
            });

        });
    });

    var config = { attributes: true, childList: true, characterData: true };
    observer.observe(target, config);
}

function reloadJenkins(firstRun, currentSettings) {
    if (!firstRun) {
        log("Deleting inlined Jenkins data");
        $('.' + jenkinsReloadableInfoClassName).remove();
    }

    addTestFailureButtonsAndDescriptions(currentSettings);

    if (currentSettings[option_jenkinsShowRunTime]) {
        addJenkinsTestRunTimes();
    }

    if (currentSettings[option_jenkinsShowRunTime] || 
        currentSettings[option_jenkinsShowFailureIndications] ||
        currentSettings[option_jenkinsShowBugFilingButton] || 
        currentSettings[option_jenkinsShowRetestButton]) {

        addJenkinsRefreshButton(currentSettings);
    }
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
    postDomainUrlParts = null;
    currentPageOrg = null;
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

function addButtonsToIndividualItemPage(title, number, isPull, currentSettings) {
    if ((isPull && currentSettings[option_emailPullRequest]) || (!isPull && currentSettings[option_emailIssue])) {
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

            workItemButton.style.margin = "0px 0px 0px 4px";
            buttonsContainer.appendChild(workItemButton);
        }

        individualItemPageTitleElement.parentNode.appendChild(buttonsContainer);
    }
}

function addButtonsToListPage(isPull, currentSettings) {
    if ((isPull && currentSettings[option_emailPullRequestList]) || (!isPull && currentSettings[option_emailIssuesList])) {
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
    }

    if (isPull && currentSettings[option_jenkinsOfferInlineFailuresOnPRList]) {
        log("Handling failures in PR list");
        var failureTitles = new Array();
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
                showJenkinsFailureLink.className = stashPopClassName + " " + className;
                showJenkinsFailureLink.text = "Show Jenkins failure";
                showJenkinsFailureLink.style.color = 'red';

                log("titleElement:" + titleElement);
                log("showJenkinsFailureLink:" + showJenkinsFailureLink);

                titleElement.appendChild(showJenkinsFailureLink);

                failureTitles.push(titleElement);
                failureClassNames.push(className);
                failureIndices.push(i);

                (function () {
                    var _titleElement = titleElement;
                    var _className = className;
                    var _i = i;

                    log("Hooking up click event for class " + _className);

                    $('.' + _className).click(function (e) {
                        e.preventDefault();
                        log("Click - Load Jenkins Failure for #" + _className.substring("loadjenkinsfailure".length));
                        inlineFailureInfoToPRList(_titleElement, _className, _i, currentSettings);
                    });
                })();
            }
        }

        if (failureTitles.length >= 1) {
            var headerStates = document.getElementsByClassName("table-list-header-toggle states")[0];

            var loadAllFailuresLink = document.createElement("a");
            loadAllFailuresLink.href = "#";
            loadAllFailuresLink.className = stashPopClassName + " loadalljenkinsfailures";
            loadAllFailuresLink.text = "Show all Jenkins failures";
            loadAllFailuresLink.style.color = 'red';
            headerStates.appendChild(loadAllFailuresLink);

            $('.loadalljenkinsfailures').click(function (e) {
                log("Click - Load All Jenkins Failures")
                e.preventDefault();
                for (var i = 0; i < failureTitles.length; i++) {
                    inlineFailureInfoToPRList(failureTitles[i], failureClassNames[i], failureIndices[i], currentSettings);
                }
            });
        }
    }
}

function createCommentSettingLink(title, comment, color) {
    return createLinkWithCallBack(
        title,
        function () {
            var commentText = comment + "\n";
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

            return false;
        },
        color);
}

function createLinkWithCallBack(title, callback, color) {
    color = color || "#4078c0";
    var a = document.createElement("a");
    a.text = title;
    a.role = "button";
    a.href = "";
    a.style.marginRight = "5px";
    a.style.color = color;
    a.onclick = callback;
    return a;
}

function createRequestJenkinsAccessLinkWithCallbackIfAllowed(url, callback) {
    return createLinkWithCallBack(
        "Grant StashPop access",
        function () {
            log("Allow/request access button clicked for " + url + ". Sending request...");
            executeCallbackIfUrlAccessGranted(url, callback);
            return false;
        });
}

function executeCallbackIfUrlAccessGranted(url, callback) {
    log("Requesting access for " + url + "...");
    chrome.runtime.sendMessage({ method: "requestOriginAccess", keys: [url] }, function (response) {
        if (response) {
            log(" Access granted. Executing callback.");
            callback();
        } else {
            log(" Access denied.");
        }
    });
}

function createButtonWithCallBack(title, callback) {
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
                var timestampMoment = moment(timestamp);
                var dayCount = moment().diff(timestampMoment, 'days', true);

                var backgroundColor = "#000000";
                if (dayCount <= 2) { backgroundColor = "#AAFFAA"; } // green
                else if (dayCount <= 5) { backgroundColor = "#FFC85A"; } // yellow
                else { backgroundColor = "#FFAAAA"; } // red

                $('.' + _specificClassName).remove();

                var textToUpdate = _run.getElementsByClassName("text-muted")[0];

                var span = document.createElement("span");
                span.innerHTML = "(" + timestampMoment.fromNow() + ")";
                span.style.backgroundColor = backgroundColor;
                span.setAttribute("title", timestamp + "\n\nGreen: < 2 days\nYellow: 2 to 5 days\nRed: > 5 days");
                span.className = stashPopClassName + " " + jenkinsReloadableInfoClassName;
                textToUpdate.appendChild(span);
            });
        })(run, detailsLink.href, specificClassName);
    }
}

function addTestFailureButtonsAndDescriptions(currentSettings) {
    if (currentSettings[option_jenkinsShowBugFilingButton] ||
        currentSettings[option_jenkinsShowRetestButton] ||
        currentSettings[option_jenkinsShowFailureIndications]) {

        processTestFailures(
            document,
            null,
            0,
            currentSettings["jenkinsShowBugFilingButton"],
            currentSettings["jenkinsShowFailureIndications"],
            currentSettings["jenkinsShowTestFailures"],
            currentSettings["jenkinsShowRetestButton"],
            function (x, y, z, w) { },
            currentSettings);
    }
}

function processTestFailures(doc,
                             prLoadingDiv,
                             rowNumber,
                             jenkinsShowBugFilingButton,
                             jenkinsShowFailureIndications,
                             jenkinsShowTestFailures,
                             jenkinsShowRetestButton,
                             callbackWhenTestProcessed,
                             currentSettings) {

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
        var nonDefaultTestInfo = currentSettings[option_nonDefaultTestInfo];
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

                if (jenkinsShowFailureIndications) {
                    if (jenkinsShowTestFailures) {
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
                }

                var testQueueName = _testFailure.parentNode.getElementsByClassName("text-emphasized")[0].innerText.trim();
                var issueTitle = "[Test Failure] " + issueDescription + " in " + testQueueName + " on PR #" + pullNumber;

                var issueCreationRouting = currentSettings[option_issueCreationRouting];
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

                var defaultIssueLabelsSpecs = currentSettings[option_defaultIssueLabels].trim().match((/[^\r\n]+/g));

                log("Determining issue labels...")

                var labelsToUse = new Array();
                for (var specNum = 0; specNum < defaultIssueLabelsSpecs.length; specNum++) {
                    log("  Checking: " + defaultIssueLabelsSpecs[specNum]);
                    var specParts = defaultIssueLabelsSpecs[specNum].trim().split(":");
                    var scopeParts = specParts[0].split("/");

                    var organization = scopeParts[0].trim();
                    if (organization == currentPageOrg) {
                        if (scopeParts.length == 1 || scopeParts[1].trim() == currentPageRepo) {
                            var labelList = specParts[1].trim().split(",");
                            log("    Matches. Adding " + labelList.toString());

                            for (var labelNum = 0; labelNum < labelList.length; labelNum++) {
                                labelName = labelList[labelNum].trim();
                                if (!(labelName in labelsToUse)) {
                                    log("      Actually adding: " + labelName);
                                    labelsToUse.push(labelName);
                                }
                            }
                        }
                    }
                }

                log("Calculated labelsToUse: " + labelsToUse);

                // "&labels[]=Area-Infrastructure&labels[]=Contributor%20Pain"
                var labelUrlPart = "";
                if (labelsToUse.length > 0) {
                    for (var labelNum = 0; labelNum < labelsToUse.length; labelNum++) {
                        labelUrlPart = labelUrlPart + "&labels[]=" + labelsToUse[labelNum];
                    }
                }

                log("Constructed labels url part: " + labelUrlPart);

                var url = "https://github.com/" + targetOrg + "/" + targetRepo + "/issues/new?title=" + encodeURIComponent(issueTitle) + "&body=" + encodeURIComponent(issueBody) + labelUrlPart;
                var jobName = testQueueName;

                var retestButton = doc.createElement("input");
                retestButton.setAttribute("type", "button");
                retestButton.setAttribute("value", "Retest");
                retestButton.setAttribute("name", "buttonname");
                retestButton.onclick = (function () {
                    var thisUrl = url;
                    var thisJobName = jobName;
                    var thisPreviousFailureUrl = previousFailureUrl;
                    return function () {
                        log("Finding retest text");

                        var rerunTextEntries = currentSettings[option_testRerunText].trim().match((/[^\r\n]+/g));

                        // * = 1, org = 2, repo = 3
                        var bestMatchLevel = 0;
                        var descriptor = "retest {0} please";

                        for (var rerunTextNum = 0; rerunTextNum < rerunTextEntries.length; rerunTextNum++) {
                            log("  Considering " + rerunTextEntries[rerunTextNum].trim());
                            var rerunEntryParts = rerunTextEntries[rerunTextNum].trim().split(":");
                            var scope = rerunEntryParts[0].trim();

                            var matchLevel = 0;
                            var entryMatches = false;
                            if (scope == "*") {
                                matchLevel = 1;
                                entryMatches = true;
                            } else if (scope.indexOf("/") == -1) {
                                matchLevel = 2;
                                entryMatches = scope == currentPageOrg;
                            } else {
                                matchLevel = 3;
                                var org = scope.split("/")[0];
                                var repo = scope.split("/")[1];
                                entryMatches = org == currentPageOrg && repo == currentPageRepo;
                            }

                            log("    Matches / Level: " + entryMatches + "/" + matchLevel);

                            if (entryMatches && matchLevel > bestMatchLevel) {
                                var descriptor = rerunEntryParts[1].trim();
                                log("      Setting new best match to: " + descriptor);
                            }
                        }

                        log("Best-match retest text: " + descriptor);

                        var commentText = "";
                        if (descriptor.indexOf("{0}") == -1) {
                            commentText = descriptor;
                            log("  No placeholder, so commentText is " + commentText);
                        } else {
                            var placeholderLocation = descriptor.indexOf("{0}");
                            var commentTextStart = descriptor.substr(0, placeholderLocation);
                            var commentTextEnd = descriptor.substr(placeholderLocation + "{0}".length);

                            var commentText = commentTextStart + thisJobName + commentTextEnd;

                            log("  commentText with filled placeholder is " + commentText);
                        }

                        commentText = commentText + "\n// Previous failure: " + thisPreviousFailureUrl + "\n// Retest reason: ";
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

                if (jenkinsShowRetestButton) {
                    _testFailure.parentNode.insertBefore(retestButton, _testFailure.parentNode.firstChild);
                }

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
                if (jenkinsShowBugFilingButton) {
                    _testFailure.parentNode.insertBefore(button, _testFailure.parentNode.firstChild);
                }

                if (jenkinsShowFailureIndications) {
                    executeCallbackIfPermissionPresent(_testFailUrl, function () {
                        var div = doc.createElement("div");

                        if (typeof htmlDescription === "undefined" || htmlDescription == "") {
                            htmlDescription = "Unknown Failure - If this is a private Jenkins job, click the 'Details' button to reauthenticate and then reload this failure data.";
                        }

                        div.innerHTML = htmlDescription.trim();
                        div.style.backgroundColor = "#FFAAAA";
                        div.className = stashPopClassName + " " + jenkinsReloadableInfoClassName;
                        _testFailure.parentNode.appendChild(div);
                    });
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

function addJenkinsRefreshButton(currentSettings) {
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
        reloadJenkins(false, currentSettings);
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

function inlineFailureInfoToPRList(title, className, i, currentSettings) {
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

    executeCallbackIfUrlAccessGranted(thisFailureUrl, function () {
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
                    true,
                    true,
                    true,
                    true,
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
                    },
                    currentSettings);
            });
        })(thisFailureUrl, redDiv, prLoadingDiv);

        title.appendChild(redDiv);
    });
}

function executeCallbackIfPermissionPresent(url, callback) {
    log("Checking access for " + url + "...");
    chrome.runtime.sendMessage({ method: "checkOriginAccess", keys: [url] }, function (response) {
        if (response) {
            log(" Permission present. Executing callback.");
            callback();
        } else {
            log(" Permission missing.");
        }
    });
}

function executeCallbackIfPermissionMissing(url, callback) {
    log("Checking access for " + url + "...");
    chrome.runtime.sendMessage({ method: "checkOriginAccess", keys: [url] }, function (response) {
        if (response) {
            log(" Permission present.");
        } else {
            log(" Permission missing. Executing callback.");
            callback();
        }
    });
}

function openJenkinsDetailsInNewTab(currentSettings) {
    var detailsLinks = document.getElementsByClassName("build-status-details");
    for (var i = 0; i < detailsLinks.length; i++) {
        var detailsLink = detailsLinks[i];
        detailsLink.target = "_blank";

        (function (_detailsLink) {
            executeCallbackIfPermissionMissing(
            detailsLink.href,
            function () {
                var grantAccessLink = createRequestJenkinsAccessLinkWithCallbackIfAllowed(
                    _detailsLink.href,
                    function () {
                        reloadJenkins(false, currentSettings);
                        return false;
                    });
                grantAccessLink.className = "build-status-details right";
                _detailsLink.parentNode.insertBefore(grantAccessLink, _detailsLink.nextSibling);
            })
        })(detailsLink);
    }
}

function addCodeReviewSummaryAndButtons(codeReviewOptions) {
    var splitCodeOptions = codeReviewOptions.split(";");
    var positiveIndicatorsString = splitCodeOptions[1].trim();
    var negativeIndicatorsString = splitCodeOptions[2].trim();
    var testedIndicatorsString = splitCodeOptions[3].trim();

    if (positiveIndicatorsString.length == 0 && negativeIndicatorsString.length == 0 && testedIndicatorsString.length == 0) {
        log("Empty code review options. Bail.")
        return;
    }

    // Buttons
    var btnList = document.getElementById("partial-new-comment-form-actions");

    var codeReviewDiv = document.createElement("div");
    codeReviewDiv.className = stashPopClassName;

    var text = document.createElement("font");
    text.color = "#666666";
    text.textContent = "Code Review: ";
    codeReviewDiv.appendChild(text);

    var positiveIndicators = positiveIndicatorsString.split(",");
    var negativeIndicators = negativeIndicatorsString.split(",");
    var testedIndicators = testedIndicatorsString.split(",");

    if (positiveIndicatorsString.length > 0) {
        codeReviewDiv.appendChild(createCommentSettingLink("Approve", positiveIndicators[0], "#00aa00"));
    }
    
    if (negativeIndicatorsString.length > 0) {
        codeReviewDiv.appendChild(createCommentSettingLink("Reject", negativeIndicators[0], "#aa0000"));
    }

    if (testedIndicatorsString.length > 0) {
        codeReviewDiv.appendChild(createCommentSettingLink("Tested", testedIndicators[0]));
    }

    btnList.appendChild(codeReviewDiv);
    
    // Review summary
    var positiveReviews = new Array();
    var negativeReviews = new Array();
    var testReviews = new Array();

    var comments = document.getElementsByClassName("timeline-comment-wrapper");
    for (var i = 0; i < comments.length; i++) {
        var comment = comments[i];
        if (comment.classList.contains("timeline-new-content")) {
            continue;
        }

        // TODO: exclude "email-hidden-reply", example https://github.com/mono/mono/pull/2420

        var body = comment.children[1].getElementsByClassName("js-comment-body")[0];
        if (typeof body !== "undefined") {
            var bodyHtml = body.innerHTML;

            if (positiveIndicatorsString.length > 0) {
                for (var c = 0; c < positiveIndicators.length; c++) {
                    if (bodyHtml.indexOf(positiveIndicators[c]) >= 0) {
                        positiveReviews.push(comment);
                        break;
                    }
                }
            }

            if (negativeIndicatorsString.length > 0) {
                for (var c = 0; c < negativeIndicators.length; c++) {
                    if (bodyHtml.indexOf(negativeIndicators[c]) >= 0) {
                        negativeReviews.push(comment);
                        break;
                    }
                }
            }

            if (testedIndicatorsString.length > 0) {
                for (var c = 0; c < testedIndicators.length; c++) {
                    if (bodyHtml.indexOf(testedIndicators[c]) >= 0) {
                        testReviews.push(comment);
                        break;
                    }
                }
            }
        }
    }

    if (positiveReviews.length > 0 || negativeReviews.length > 0 || testReviews.length > 0) {
        var reviewsContainer = document.createElement("div");
        reviewsContainer.className = stashPopClassName;

        if (positiveReviews.length > 0) {
            addReviewsToReviewContainerAndColorizeReviews(reviewsContainer, "Approvals", positiveReviews, "#77ff77", "#edffed", "#00cc00");
        }

        if (negativeReviews.length > 0) {
            addReviewsToReviewContainerAndColorizeReviews(reviewsContainer, "Rejections", negativeReviews, "#ff7777", "#ffedf6", "#cc0000");
        }

        if (testReviews.length > 0) {
            addReviewsToReviewContainerAndColorizeReviews(reviewsContainer, "Tested by", testReviews, "#77ccff", "#dff6ff", "#0000cc");
        }

        var discussion = document.getElementsByClassName("js-discussion")[0];
        discussion.insertBefore(reviewsContainer, discussion.firstChild);
    }
    else {
        var noCodeReviewsDiv = document.createElement("div");
        noCodeReviewsDiv.className = stashPopClassName;

        var bold = document.createElement("b");
        bold.textContent = "Code Reviews";
        noCodeReviewsDiv.appendChild(bold);
        noCodeReviewsDiv.appendChild(document.createTextNode(": None yet. "));
        noCodeReviewsDiv.appendChild(createCommentSettingLink("Be the first!", ""));

        var discussion = document.getElementsByClassName("js-discussion")[0];
        discussion.insertBefore(noCodeReviewsDiv, discussion.firstChild);
    }
}

function getBestCodeReviewOptions(codeReviewOptions) {
    var codeReviewOptionsEntries = codeReviewOptions.trim().match((/[^\r\n]+/g));
    log("Calculating best matching code review options");

    // * = 1, org = 2, repo = 3
    var bestMatchLevel = 0;
    for (var i = 0; i < codeReviewOptionsEntries.length; i++) {
        log("  Considering " + codeReviewOptionsEntries[i].trim());

        var rerunEntryParts = codeReviewOptionsEntries[i].trim().split(";");
        var scope = rerunEntryParts[0].trim();

        var matchLevel = 0;
        var entryMatches = false;
        if (scope == "*") {
            matchLevel = 1;
            entryMatches = true;
        } else if (scope.indexOf("/") == -1) {
            matchLevel = 2;
            entryMatches = scope == currentPageOrg;
        } else {
            matchLevel = 3;
            var org = scope.split("/")[0];
            var repo = scope.split("/")[1];
            entryMatches = org == currentPageOrg && repo == currentPageRepo;
        }

        log("    Matches / Level: " + entryMatches + "/" + matchLevel);

        if (entryMatches && matchLevel > bestMatchLevel) {
            var bestMatch = codeReviewOptionsEntries[i].trim();
            log("      Setting new best match to: " + bestMatch);
        }
    }

    log("Best-match code review options: " + bestMatch);

    return bestMatch;
}

function addReviewsToReviewContainerAndColorizeReviews(reviewsContainer, title, reviews, contributorBackgroundColor, externalBackgroundColor, contributorAggregationBackground) {
    var titleDiv = document.createElement("div");
    var titleText = document.createElement("b");
    titleText.textContent = title + ": ";
    titleDiv.appendChild(titleText);
    titleDiv.style.cssFloat = "left";
    titleDiv.style.display = "block";
    reviewsContainer.appendChild(titleDiv);

    var reviewListDiv = document.createElement("div");
    reviewListDiv.style.cssFloat = "left";
    reviewListDiv.style.display = "block";

    var commentsFromContributors = new Array();
    var commentsFromNonContributors = new Array();

    for (var i = 0; i < reviews.length; i++) {
        var review = reviews[i];

        var header = review.getElementsByClassName("timeline-comment-header-text")[0];
        var username = header.getElementsByTagName("strong")[0].innerText;
        var label = review.getElementsByClassName("timeline-comment-label")[0];
        var labelPart = "";
        if (typeof label !== "undefined") {
            var reviewerKind = label.innerText;
            labelPart = "<span class='timeline-comment-label' style='margin:0px;'>" + reviewerKind + "</span>";
        }

        var headerForBackground = review.getElementsByClassName("timeline-comment-header")[0];
        headerForBackground.style.backgroundColor = (labelPart == "" ? externalBackgroundColor : contributorBackgroundColor);

        var time = review.getElementsByTagName("time")[0].innerText;

        var imgTag = review.children[0].children[0].cloneNode();
        imgTag.className = "avatar";
        imgTag.height = 35;
        imgTag.width = 35;
        imgTag.style.backgroundColor = (labelPart == "" ? "#C8C8C8" : contributorAggregationBackground);
        imgTag.style.padding = "3px";

        var tooltip = review.children[1].getElementsByClassName("js-comment-body")[0].innerHTML;
        var tooltipHeader = labelPart + "<p><b>" + username + "</b> commented " + time + "</p>";
        imgTag.setAttribute("stashpop-title", tooltipHeader + tooltip);
        imgTag.role = "button";
        imgTag.style.cursor = "pointer";
        imgTag.style.margin = "0px 0px 3px 3px";

        var clickLocation = "#" + header.getElementsByClassName("timestamp")[0].href.split("#")[1];

        (function (newLocation) {
            imgTag.onclick = function () {
                // todo: navigation doesn't work if location.hash == newLocation
                location.hash = newLocation;
            };
        })(clickLocation);

        if (labelPart == "") {
            commentsFromNonContributors.push(imgTag);
        } else {
            commentsFromContributors.push(imgTag);
        }
    }

    var allComments = commentsFromContributors.concat(commentsFromNonContributors);
    for (var i = 0; i < allComments.length; i++) {
        reviewListDiv.appendChild(allComments[i]);

        if (i % 10 == 9) {
            reviewListDiv.appendChild(document.createElement("br"));
        }
    }

    reviewsContainer.appendChild(reviewListDiv);

    var clearDiv = document.createElement("div");
    clearDiv.style.clear = "both";
    reviewsContainer.appendChild(clearDiv);
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

            // TODO: Fetch the target branch of each PR.

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

    var decodedSubject = $('<div/>').html(subject).text();
    var decodedBody = $('<div/>').html(body).text();
    var decodedShortBody = $('<div/>').html(shortBody).text();

    var finalFullMailToUrl = "mailto:?subject=" + encodeURIComponent(decodedSubject) + "&body=" + encodeURIComponent(decodedBody);
    var finalShortMailToUrl = "mailto:?subject=" + encodeURIComponent(decodedSubject) + "&body=" + encodeURIComponent(decodedShortBody);

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
    var targetBranchDisplay = "";

    if (isPull) {
        if (isListPage) {
            // The PR list page contains no information about target branch, so we have to go look it up.
            var url = "https://github.com/" + currentPageOrg + "/" + currentPageRepo + "/pull/" + issueNumber;
            chrome.runtime.sendMessage({
                method: 'GET',
                action: 'xhttp',
                url: url,
                data: ''
            }, function (responseText) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(responseText, "text/html");
                var fullTargetBranchSpec = doc.getElementsByClassName("current-branch")[0].innerText;
                log("PR target branch (from individual PR page): " + fullTargetBranchSpec);
                finishIt(fullTargetBranchSpec);
            });

        } else {
            var targetFullBranchSpecParts = $(".current-branch").first().text().split(":");
            var targetBranch = targetFullBranchSpecParts.length == 1 ? targetFullBranchSpecParts[0] : targetFullBranchSpecParts[1];
            log("PR target branch: " + targetBranch);

            if (targetBranch != "master" && targetBranch != "") {
                targetBranchDisplay = "/" + targetBranch;
                log("PR target branch display: " + targetBranchDisplay);
            }
        }
    }

    var subject = owner + "/" + repo + targetBranchDisplay + " " + kind + " #" + issueNumber + ": " + issueTitle;

    var body = baseUrl + issueNumber + "\r\n\r\n"; // TODO: Assigned to, etc.
    var isPublic = (typeof document.getElementsByClassName("entry-title private")[0] === "undefined");
    if (!isPublic) {
        body = body + "Notice: This message contains information about a private repository."
    }

    var decodedSubject = $('<div/>').html(subject).text();
    var decodedBody = $('<div/>').html(body).text();
    window.location.href = "mailto:?subject=" + encodeURIComponent(decodedSubject) + "&body=" + encodeURIComponent(decodedBody);
}
