document.addEventListener("DOMContentLoaded", function() {
	  "use strict";
	run();
});

function run() {
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

function sendmail(issueNumber, issueTitle) {
	issueTitle = issueTitle.trim();
	issueNumber = issueNumber.trim();

 	var baseUrl = document.getElementsByClassName("entry-title public")[0].getElementsByTagName('strong')[0].getElementsByTagName('a')[0].href + "/issues/";

	var owner = document.getElementsByClassName("entry-title public")[0].getElementsByClassName("author")[0].getElementsByTagName("span")[0].innerHTML;
	var repo = document.getElementsByClassName("entry-title public")[0].getElementsByTagName("strong")[0].getElementsByTagName("a")[0].innerHTML;

	var subject = owner + "/" + repo + " #" + issueNumber + ": " + issueTitle;

	var body = issueTitle + " (" + baseUrl + issueNumber + ")"; // TODO: Assigned to, etc.

	window.location.href = "mailto:?subject=" + encodeURI(subject) + "&body=" + encodeURI(body);
}