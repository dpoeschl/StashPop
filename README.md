# StashPop for GitHub
Adds features to GitHub, with extra Jenkins goodness on https://github.com/dotnet/ repositories.
Note: Added UI elements are visually optimized for users also running [Wide Github](https://github.com/xthexder/wide-github) (from [xthexder](https://github.com/xthexder/))

**Features:**

1. Adds email buttons for Issues and Pull Requests
  - Added to issue/PR lists and individual views (<a href="screenshots/issueslist.png" target="_blank">screenshot</a>)
  - Supports issue/PR multi-select
  - Emails are created in your default email application (<a href="screenshots/issueemail.png" target="_blank">screenshot</a>)

2. Jenkins PR support (supports https://github.com/dotnet/ repositories by default, add your own in manifest.json)
  - Shows how long ago a Jenkins build ran (<a href="screenshots/jenkinsresults.png" target="_blank">screenshot</a>)
  - Shows the Jenkins build & test failure descriptions in the PR 
  - Opens Jenkins "details" links in a new tab
  - Adds "Create Issue" buttons to each Jenkins test failure (<a href="screenshots/createdissue.png" target="_blank">screenshot</a>)

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
