chrome.runtime.onMessage.addListener(function (request, sender, callback) {
    if (request.action == "xhttp") {
        var xhttp = new XMLHttpRequest();
        var method = request.method ? request.method.toUpperCase() : 'GET';

        xhttp.onload = function () {
            callback(xhttp.responseText);
        };
        xhttp.onerror = function () {
            callback();
        };
        xhttp.open(method, request.url, true);
        xhttp.setRequestHeader('Accept-Language', 'en-us, en');
        if (method == 'POST') {
            xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhttp.send(request.data);
        return true; // prevents the callback from being called too early on return
    }
    else if (request.method == "getSettings") {
        var keys = {};

        // Provide defaults that match those in options.js
        for (var i = 0; i < request.keys.length; i++) {
            switch (request.keys[i]) {
                case "issueCreationRouting":
                    keys[request.keys[i]] = "dotnet/roslyn-internal:dotnet/roslyn";
                    break;
                case "nonDefaultTestInfo": 
                    keys[request.keys[i]] = "dotnet/roslyn:vsi:prtest/win/vsi/p0\ndotnet/roslyn-internal:vsi:prtest/win/vsi/p0";
                    break;
                case "defaultIssueLabels":
                    keys[request.keys[i]] = "dotnet:Bug\ndotnet/roslyn-internal:Contributor Pain,Area-Infrastructure";
                    break;
                case "testRerunText":
                    keys[request.keys[i]] = "*:retest {0} please\ndotnet:@dotnet-bot retest {0} please";
                    break;
                default:
                    keys[request.keys[i]] = true;
                    break;
            }
        }

        if (typeof chrome.storage.sync !== "undefined" && chrome.storage.sync != null) {
            chrome.storage.sync.get(keys, function (items) {
                callback({ data: items });
            });
        } else {
            // Firefox currently only supports local storage
            chrome.storage.local.get(keys, function (items) {
                callback({ data: items });
            });
        }

        return true;
    } else if (request.method == "requestOriginAccess") {
        var url = request.keys[0];
        console.log("Requesting permission to access " + url);
        chrome.permissions.request({ origins: [url] }, function (granted) {
            console.log("  Permission: " + granted);
            callback(granted);
        });

        return true;
    } else if (request.method == "checkOriginAccess") {
        var url = request.keys[0];
        console.log("Checking permissions for " + url);
        chrome.permissions.contains({ origins: [url] }, function (granted) {
            console.log("  Permission " + granted ? "present" : "not present");
            callback(granted);
        });

        return true;
    }
});