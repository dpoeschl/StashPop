document.addEventListener("DOMContentLoaded", function() {
  "use strict";
  reload();
});

function reload() {
  addIndividualIssueButton();
  addTestFailureButtonsAndDescriptions();
  openJenkinsDetailsInNewTab();
  addJenkinsTestRunTimes();
  addButtonsToIssuesList();
  makeBuildStatusWindowsBig();
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

// TODO: Only scrape once between this and addTestFailureButtonsAndDescriptions
function addJenkinsTestRunTimes() {
  var testRuns = document.getElementsByClassName("build-status-item");
  for (var i = 0; i < testRuns.length; i++)
  {
    var run = testRuns[i];
    var url = run.getElementsByClassName("build-status-details")[0].href;

    (function(_run, _url) {
      chrome.runtime.sendMessage({
          method: 'GET',
          action: 'xhttp',
          url: _url,
          data: ''
        }, function(responseText) {
          // Parse the response
          var parser = new DOMParser();
          var doc = parser.parseFromString(responseText, "text/html");
          var header = doc.getElementsByClassName("build-caption page-headline")[0];
          var timestamp = header.innerText.split("(")[1].split(")")[0];
          var timestampDisplay = " [Run on " + timestamp + ". "

          // TODO: time zones?
          var date = new Date(Date.parse(timestamp));
          var currentdate = new Date();

          var delta = currentdate-date;
          var dayCount = delta / (1000 * 60 * 60 * 24);
          var minuteCount = delta / (1000 * 60);

          var backgroundColor = "#000000";
          var timeAgo = Math.round(dayCount * 10) / 10 + " days ago";

          if (dayCount <= 2) { backgroundColor = "#AAFFAA"; } // green
          else if (dayCount <= 5) { backgroundColor = "#FFC85A"; } // yellow
          else { backgroundColor = "#FFAAAA"; } // red

          var textToUpdate = _run.getElementsByClassName("text-muted")[0];

  	  var span = document.createElement("span");
  	  span.innerHTML= timestampDisplay;
	  textToUpdate.appendChild(span);
          
          var span2 = document.createElement("span");
          span2.innerHTML = "(" + timeAgo + ")";
          span2.style.backgroundColor = backgroundColor;
          span2.setAttribute("title", "Green: < 2 days\nYellow: 2 to 5 days\nRed: > 5 days");
          textToUpdate.appendChild(span2);          

  	  var span3 = document.createElement("span");
  	  span3.innerHTML= "]";
	  textToUpdate.appendChild(span3);
        });
    })(run, url);
  }
}

function addTestFailureButtonsAndDescriptions() {
  var testFailures = document.getElementsByClassName("octicon-x build-status-icon");

  for (var i = 0; i < testFailures.length; i++)
  {
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

    (function(_testFailure, _testFailUrl) {
      chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: _testFailUrl,
        data: ''
      }, function(responseText) {
        // Parse the response
        var parser = new DOMParser();
        var doc = parser.parseFromString(responseText, "text/html");
        var h2elements = doc.getElementsByTagName("h2");

        var issueBody = "*See " + _testFailUrl + " for more details.*\r\n\r\n";
        var htmlDescription = "";
        var count = 1;

        for (var i = 0; i < h2elements.length; i++)
        {
          var h2 = h2elements[i];

          if (h2.innerHTML == "HTTP ERROR 404")
          {
            htmlDescription = htmlDescription + "404: Build details page could not be found.";
          }

          if (h2.innerHTML == "Identified problems")
          {
            var nodeWithErrorSiblings = h2.parentNode.parentNode;
            var errorRow = nodeWithErrorSiblings;
            while ((errorRow = errorRow.nextSibling) != null)
            {
              if (count > 1)
              {
                issueBody = issueBody + "\r\n\r\n";
                htmlDescription = htmlDescription + "<br /><br />";
              }

              var failureTitle = "";
              var failureDescription = "";

              var h3s = errorRow.getElementsByTagName("h3");
              var h4s = errorRow.getElementsByTagName("h4");
              if (h3s.length > 0)
              {
                failureTitle = h3s[0].innerHTML.split("<br")[0].trim();
                failureDescription = h3s[0].getElementsByTagName("b")[0].innerHTML.trim();
              }
              else if (h4s.length > 0)
              {
                failureTitle = h4s[0].innerHTML.trim();
                failureDescription = h4s[1].innerHTML.trim();
              }

              issueBody = issueBody + "**Issue " + count + ": " + failureTitle + "**\r\n";
	      issueBody = issueBody + failureDescription;
              htmlDescription = htmlDescription + "<b>Issue " + count + ": " + failureTitle + "</b><br />" + failureDescription;

              count++;
            }
          }
        }

        if (count == 1)
        {
          // we failed to find the failure, or there was none.
          // should we add special handling here?
        }

        var issueTitle = "PR Test Failure: <explanation>";

        var url = "https://github.com/dotnet/roslyn/issues/new?title=" + encodeURI(issueTitle) + "&body=" + encodeURI(issueBody) + "&labels[]=Area-Infrastructure&labels[]=Contributor%20Pain";
 
        // Add the issue filing button

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
        button.style.margin = "0px 0px 3px 0px";

        _testFailure.parentNode.insertBefore(button, _testFailure.parentNode.firstChild);

        // Add description

	var div = document.createElement("div");
	div.innerHTML= htmlDescription;
        div.style.backgroundColor = "#FFAAAA";

        _testFailure.parentNode.appendChild(div);
      });
    })(testFailure, testFailUrl);
  }
}

function makeBuildStatusWindowsBig() {
  var lists = document.getElementsByClassName("build-statuses-list");
  for (var i = 0; i < lists.length; i++) {
    lists[i].style.maxHeight = "5000px";
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