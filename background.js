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
        if (method == 'POST') {
            xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhttp.send(request.data);
        return true; // prevents the callback from being called too early on return
    }
    else if (request.method == "getSettings") {
        var keys = {};

        for (var i = 0; i < request.keys.length; i++) {
            keys[request.keys[i]] = true;
        }

        chrome.storage.sync.get(keys, function (items) {
            callback({ data: items });
        });

        return true;
    }
});