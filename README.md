<img src="https://github.com/dpoeschl/StashPop/blob/master/images/stashpop2_logo.png" width="200" height="125"/>

StashPop adds features to GitHub, with extra Jenkins testing support.

**Installation**
----------------

**Chrome**

Download StashPop from the [Chrome Web Store](https://chrome.google.com/webstore/detail/stashpop/nghjdgghnnljcdgaicggnlbmojcaedhl)!

**Firefox** (Beta Support - please file any issues you find)

StashPop currently only works on [Firefox Nightly builds](https://nightly.mozilla.org/). If you're using a Nightly build then follow these steps to get set up:

1. Enlist in StashPop or download the source code
2. Zip everything *inside* the StashPop repository to "StashPop.xpi" (the `manifest.json` should live at the root of the zip file, not nested within another folder) 
3. In Nightly, navigate to `about:config` and update `xpinstall.signatures.required` to `false`
4. Navigate to `about:addons`, choose `Install Add-on From File` from the gear menu, and select the .xpi file you made in step 2

**Edge** (Beta Support - please file any issues you find)

StashPop currently only works on build 14291 of Windows in the [Windows 10 Insider Preview](https://insider.windows.com/) program.  If you're using an appropriate version of Windows 10 and Edge then follow these steps to get set up:

1. Enlist in StashPop or download the source code
2. In Edge, click the ellipses (...) in the top right corner
3. Click `Extensions`
4. Click `Load extension`
5. Select the directory containing the code that you selected in step 1

Known limitations in Edge:
- The `options` API isn't implemented so they're not tunable except by updating `content.js` and reloading the extension
- The `permissions` API isn't implemented so Jenkins test failure data can't be fetched and displayed inline

**Features**
-------------

1. Email Buttons for Issues and Pull Requests
  - Added to issue/PR lists and individual views (<a href="screenshots/issueslist.png" target="_blank">screenshot</a>)
  - Supports issue/PR multi-select
  - Emails are created in your default email application (<a href="screenshots/issueemail.png" target="_blank">screenshot</a>)

2. Code Reviews
  - Aggregates code review statuses (approvals, rejections, and test signoff) at the top of the PR Conversation page (<a href="screenshots/codereviewsignoffaggregation.png" target="_blank">screenshot</a>)
  - Adds code review response buttons to the new comment area to add the default indicator of the chosen status
  - Adjusts header background color of existing and in-progress comments based on their code review status (<a href="screenshots/codereviewhighlightingandbuttons.png" target="_blank">screenshot</a>)
  - Fully customizable per-organization or per-repository

3. Jenkins PR Integration (supports https://github.com/dotnet/ repositories by default, grant access to more servers from any related PR page)
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
