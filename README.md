![stashpop](https://github.com/dpoeschl/StashPop/blob/master/images/stashpop2_logo.png)

StashPop adds features to GitHub, with extra Jenkins goodness on https://github.com/dotnet/ repositories.

Note: Added UI elements are visually optimized for users also running [Wide Github](https://github.com/xthexder/wide-github) (from [xthexder](https://github.com/xthexder/))

**Features:**

1. Adds email buttons for Issues and Pull Requests
  - Added to issue/PR lists and individual views (<a href="screenshots/issueslist.png" target="_blank">screenshot</a>)
  - Supports issue/PR multi-select
  - Emails are created in your default email application (<a href="screenshots/issueemail.png" target="_blank">screenshot</a>)

2. Jenkins PR support (supports https://github.com/dotnet/ repositories by default, add your own in manifest.json)
  - Inlines Jenkins build & test failure descriptions in the PR view
  - Inlines Jenkins build & test failures for individual PRs into the PR list view
  - Shows how long ago a Jenkins build ran (<a href="screenshots/jenkinsresults.png" target="_blank">screenshot</a>)
  - Opens Jenkins "details" links in a new tab
  - Adds "Create Issue" buttons to each Jenkins test failure (<a href="screenshots/createdissue.png" target="_blank">screenshot</a>)
      - Default labels on created issues are customizable per-organization and per-repository
  - Adds a "Retest" button to each Jenkins test failure
  - Configurable list of non-default test buttons for discoverability
  - Configurable issue filing location for failures in repositories without issues

**To install:**

1. Clone or download the repository
2. In Chrome, navigate to [chrome://extensions/](chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked extension..." and point it to your repository.

**To update:**

1. Update to latest from the ```master``` branch
2. In chrome, navigate to [chrome://extensions/](chrome://extensions/)
3. Click the "Reload" link under the "StashPop for GitHub" extension

**To allow access to your Jenkins host machine:**

1. Add your domain to the local ```manifest.json``` file's ```"permissions"``` section as ```"http://yourjenkinsserver/*"```
2. Reload the extension

**Issue Management Shortcuts**

1. Traige - <a href="https://github.com/dpoeschl/StashPop/issues?q=is%3Aopen+is%3Aissue+no%3Amilestone" target="_blank">No Milestone</a>
2. Triage - <a href="https://github.com/dpoeschl/StashPop/issues?utf8=%E2%9C%93&q=is%3Aopen+is%3Aissue+-label%3AKind-Enhancement+-label%3AKind-Bug" target="_blank">No Kind</a>
3. Reporting - <a href="https://github.com/dpoeschl/StashPop/issues?utf8=%E2%9C%93&q=is%3Aopen+is%3Aissue+-author%3Adpoeschl" target="_blank">Open customer issues</a>
4. Reporting - <a href="https://github.com/dpoeschl/StashPop/pulls?q=is%3Aopen+-author%3Adpoeschl+is%3Apr" target="_blank">Open customer PRs</a>
