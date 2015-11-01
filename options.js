function save_options() {
  var emailIssuesList = document.getElementById('emailIssuesList').checked;
  var emailIssue = document.getElementById('emailIssue').checked;
  var emailPullRequestList = document.getElementById('emailPullRequestList').checked;
  var emailPullRequest = document.getElementById('emailPullRequest').checked;

  var jenkinsOpenDetailsLinksInNewTab = document.getElementById('jenkinsOpenDetailsLinksInNewTab').checked;
  var jenkinsShowRunTime = document.getElementById('jenkinsShowRunTime').checked;
  var jenkinsShowFailureIndications = document.getElementById('jenkinsShowFailureIndications').checked;
  var jenkinsShowTestFailures = document.getElementById('jenkinsShowTestFailures').checked;
  var jenkinsShowBugFilingButton = document.getElementById('jenkinsShowBugFilingButton').checked;

  chrome.storage.sync.set({
    emailIssuesList: emailIssuesList,
    emailIssue: emailIssue,
    emailPullRequestList: emailPullRequestList,
    emailPullRequest: emailPullRequest,
    jenkinsOpenDetailsLinksInNewTab: jenkinsOpenDetailsLinksInNewTab,
    jenkinsShowRunTime: jenkinsShowRunTime,
    jenkinsShowFailureIndications: jenkinsShowFailureIndications,
    jenkinsShowTestFailures: jenkinsShowTestFailures,
    jenkinsShowBugFilingButton: jenkinsShowBugFilingButton
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    emailIssuesList: true,
    emailIssue: true,
    emailPullRequestList: true,
    emailPullRequest: true,
    jenkinsOpenDetailsLinksInNewTab: true,
    jenkinsShowRunTime: true,
    jenkinsShowFailureIndications: true,
    jenkinsShowTestFailures: true,
    jenkinsShowBugFilingButton: true
  }, function(items) {
    document.getElementById('emailIssuesList').checked = items.emailIssuesList;
    document.getElementById('emailIssue').checked = items.emailIssue;
    document.getElementById('emailPullRequestList').checked = items.emailPullRequestList;
    document.getElementById('emailPullRequest').checked = items.emailPullRequest;
    document.getElementById('jenkinsOpenDetailsLinksInNewTab').checked = items.jenkinsOpenDetailsLinksInNewTab;
    document.getElementById('jenkinsShowRunTime').checked = items.jenkinsShowRunTime;
    document.getElementById('jenkinsShowFailureIndications').checked = items.jenkinsShowFailureIndications;
    document.getElementById('jenkinsShowTestFailures').checked = items.jenkinsShowTestFailures;
    document.getElementById('jenkinsShowBugFilingButton').checked = items.jenkinsShowBugFilingButton;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);