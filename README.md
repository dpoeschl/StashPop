<img src="https://github.com/dpoeschl/StashPop/blob/master/images/stashpop2_logo.png" width="200" height="125"/>

StashPop adds features to GitHub, with extra Jenkins goodness on https://github.com/dotnet/ repositories.

**Installation**
----------------

**Chrome**

Download StashPop from the [Chrome Web Store](https://chrome.google.com/webstore/detail/stashpop/nghjdgghnnljcdgaicggnlbmojcaedhl)!

**Firefox** (Beta Support)

StashPop currently only works on [Firefox Nightly builds](https://nightly.mozilla.org/). If you're using a Nightly build then follow these steps to get set up:

1. Enlist in StashPop or download the source code
2. Zip everything *inside* the StashPop repository to "StashPop.xpi" (the `manifest.json` should live at the root of the zip file, not nested within another folder) 
3. In Nightly, navigate to `about:config` and update `xpinstall.signatures.required` to `false`
4. Navigate to `about:addons`, choose `Install Add-on From File` from the gear menu, and select the .xpi file you made in step 2

**Features**
-------------

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

**Development**
---------------

**Enlistment**

1. Clone or download the repository
2. In Chrome, navigate to [chrome://extensions/](chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked extension..." and point it to your repository

**Running a customized version of StashPop**

1. Enlist in StashPop and customize as desired
2. In Chrome, navigate to [chrome://extensions/](chrome://extensions/)
3. Click the "Reload" link under the "StashPop for GitHub" extension

**To allow access to your Jenkins host machine:**

1. Add your domain to the local ```manifest.json``` file's ```"permissions"``` section as ```"http://yourjenkinsserver/*"```
2. Reload the extension

Admin Shortcuts
---------------
**Issue Management**

1. Triage - <a href="https://github.com/dpoeschl/StashPop/issues?q=is%3Aopen+is%3Aissue+no%3Amilestone" target="_blank">No Milestone</a>
2. Triage - <a href="https://github.com/dpoeschl/StashPop/issues?utf8=%E2%9C%93&q=is%3Aopen+is%3Aissue+-label%3AKind-Enhancement+-label%3AKind-Bug" target="_blank">No Kind</a>
3. Reporting - <a href="https://github.com/dpoeschl/StashPop/issues?utf8=%E2%9C%93&q=is%3Aopen+is%3Aissue+-author%3Adpoeschl" target="_blank">Open customer issues</a>
4. Reporting - <a href="https://github.com/dpoeschl/StashPop/pulls?q=is%3Aopen+-author%3Adpoeschl+is%3Apr" target="_blank">Open customer PRs</a>
