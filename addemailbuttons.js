document.addEventListener("DOMContentLoaded", function() {
	  "use strict";
	setupButtons();
});

function setupButtons() {
  addIndividualIssueButton();
  addTestFailureButtons();
  openJenkinsDetailsInNewTab();
  addButtonsToIssuesList();
}

function addIndividualIssueButton() {
  var titleElement = document.getElementsByClassName("js-issue-title")[0]

  if (typeof titleElement !== 'undefined')
  {
      var button = document.createElement("input");
      button.setAttribute("type", "button");
      button.setAttribute("value", "Email Issue");
      button.setAttribute("name", "buttonname");
      var issueNumber = document.getElementsByClassName("gh-header-number")[0].innerHTML.substring(1);
      var issueTitle = document.getElementsByClassName("js-issue-title")[0].innerHTML;
      button.onclick = (function() { 
	var currentTitle = issueTitle;
	var currentNumber = issueNumber;
	return function() {
	  sendmail(currentNumber, currentTitle);
	};
      })();
      button.className = "btn";

      titleElement.parentNode.insertBefore(button, document.getElementsByClassName("js-issue-title")[0].parentNode.firstChild);
  }
}

function addTestFailureButtons() {
  var testFailures = document.getElementsByClassName("octicon-x build-status-icon");
  for (var i = 0; i < testFailures.length; i++)
  {
    var testFailure = testFailures[i];

    var testFailUrl = testFailure.parentNode.getElementsByClassName("build-status-details")[0].href;
    var issueTitle = "PR Test Failure: <explanation>";
    var issueBody = "See " + testFailUrl + " for more details.";

    var url = "https://github.com/dotnet/roslyn/issues/new?title=" + encodeURI(issueTitle) + "&body=" + encodeURI(issueBody) + "&labels=Area-Infrastructure";

    var button = document.createElement("input");
    button.setAttribute("type", "button");
    button.setAttribute("value", "File bug");
    button.setAttribute("name", "buttonname");
    button.onclick = (function() { 
        var thisUrl = url;
	return function() {
	  window.open(thisUrl);
        };
      })();
    button.className = "btn btn-sm";

    testFailure.parentNode.insertBefore(button, testFailure.parentNode.firstChild);
  }
}

function addButtonsToIssuesList() {
  var issuesList = document.getElementsByClassName("table-list-issues")[0];

  if (typeof issuesList !== 'undefined')
  {
    var issues = issuesList.children;

    for (var i = 0; i < issues.length; i++)
    {
      var issue = issues[i];
      var title = issue.getElementsByClassName("issue-title")[0];

      var button = document.createElement("input");
      button.setAttribute("type", "button");
      button.setAttribute("value", "Email Issue");
      button.setAttribute("name", "buttonname");

      var urlParts = title.getElementsByClassName("issue-title-link")[0].href.split("/");
      var issueNumber = urlParts[urlParts.length - 1];
      var issueTitle = title.getElementsByClassName("issue-title-link")[0].innerHTML;

      button.onclick = (function() { 
	var currentTitle = issueTitle;
	var currentNumber = issueNumber;
	return function() {
	  sendmail(currentNumber, currentTitle);
	};
      })();
      button.className = "btn btn-sm";

      title.insertBefore(button, title.firstChild);
    }
  }
}

function openJenkinsDetailsInNewTab() {
  var detailsLinks = document.getElementsByClassName("build-status-details");
  for (var i = 0; i < detailsLinks.length; i++)
  {
    var detailsLink = detailsLinks[i];
    detailsLink.target = "_blank";
  }
}

function sendmail(issueNumber, issueTitle) {
	issueTitle = issueTitle.trim();
	issueNumber = issueNumber.trim();

 	var baseUrl = document.getElementsByClassName("entry-title public")[0].getElementsByTagName('strong')[0].getElementsByTagName('a')[0].href + "/issues/";

	var owner = document.getElementsByClassName("entry-title public")[0].getElementsByClassName("author")[0].getElementsByTagName("span")[0].innerHTML;
	var repo = document.getElementsByClassName("entry-title public")[0].getElementsByTagName("strong")[0].getElementsByTagName("a")[0].innerHTML;

	var subject = owner + "/" + repo + " #" + issueNumber + ": " + issueTitle;

	var body = baseUrl + issueNumber + "\r\n\r\n"; // TODO: Assigned to, etc.

	window.location.href = "mailto:?subject=" + encodeURI(subject) + "&body=" + encodeURI(body);
}