# StashPop for GitHub
Adds features to GitHub, with extra Jenkins goodness on https://github.com/dotnet/ repositories.

Features:

1. Adds email buttons for Issues and Pull Requests
  - Added to issue/PR lists and individual views
  - Supports issue/PR multi-select
  - Emails are created in your default email application

2. Jenkins PR support (supports https://github.com/dotnet/ repositories by default, add your own in manifest.json)
  - Shows how long ago a Jenkins build ran
  - Adds "Create Issue" buttons to each Jenkins test failure
  - Shows the Jenkins build & test failure descriptions in the PR 
  - Opens Jenkins "details" links in a new tab

To install:

1. Clone or download the repository
2. In Chrome, navigate to [chrome://extensions/](chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked extension..." and point it to your repository.

To update:

1. Update to latest from the ```master``` branch
2. In chrome, navigate to [chrome://extensions/](chrome://extensions/)
3. Click the "Reload" link under the "StashPop for GitHub" extension

To allow access to your Jenkins host machine:

1. Add your domain to the local ```manifest.json``` file's ```"permissions"``` section as ```"http://yourjenkinsserver/*"```
2. Reload the extension
