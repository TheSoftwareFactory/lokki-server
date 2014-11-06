/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
// lokki-server main file
// Express application

// Newrelic config
require('newrelic');

// Nodetime config (in Heroku)
if (process.env.NODETIME_ACCOUNT_KEY) {
    require('nodetime').profile({
        accountKey: process.env.NODETIME_ACCOUNT_KEY,
        appName: 'lokki-server-eu'
    });
}

// Memory leak detection
//var memwatch = require('memwatch');

var express = require('express');
var crypto = require('crypto');

var app = express();

var LocMapConfig = require('./locmap/lib/locMapConfig');
var notificationWorker = require('./locmap/lib/notificationWorker');
var NotificationWorker = new notificationWorker();
var intervalNotifications = require('./locmap/lib/intervalNotifications');
var IntervalNotifications = new intervalNotifications();

app.use(express.logger('dev')); // 'default', 'short', 'tiny', 'dev'
app.use(express.compress()); // gzip
app.use(express.methodOverride());
app.use(express.bodyParser());

// Security related headers to all paths
app.use(function(req, res, next) {
    // Force browser not to guess type but use content-type exactly.
    // Requires content-type headers to be correctly set.
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent reflected XSS
    // Could have incompatibilities with older browsers. Works on our test phones.
    res.setHeader("X-XSS-Protection", "1, mode=block");

    // Prevents showing data in a frame
    res.setHeader("X-Frame-Options", "Deny");

    return next();
});

// Security headers for /api (JSON-related)
app.use("/api", function(req, res, next) {
    // Browser shows reply as downloadable instead of injecting into page.
    res.setHeader("Content-Disposition", 'attachment; filename="json-response.txt');
    return next();
})

var inProduction = process.env.PORT || false;
if (inProduction) {
    // do not allow production server to crash
    process.on('uncaughtException', function(err) {
        // handle the error safely
        console.error('uncaughtException:', err);
        console.error(err.stack);
    });

}

//----------------------------------------------------------------------------------------------------------------------
// Static files
//app.use('/files/', express.static('./files'));

// Root site
app.get('/', function (req, res) {
    res.send('Welcome to Lokki!<br/><br/>');
});


// Loader.io verification site
app.get('/loaderio-710d023d2917f19101bd5b71de132345', function (req, res) {
    res.send('loaderio-710d023d2917f19101bd5b71de132345');
});

// Import LocMap routes
require('./locmap/locmap-server')(app);


//----------------------------------------------------------------------------------------------------------------------
// Entry point
// Command line may contain:
// argv[0] = node
// argv[1] = lokki-server.js
// argv[2] = port (9000 if missing),
if (require.main === module) {
    var port = process.env.PORT || 9000;

    // if we provide parameter to server then it is a PORT
    if (process.argv.length > 2) {
        port = +process.argv[2];
    }
    app.listen(port, function () {
        console.log("Lokki-Server listening on " + port + "\n");

        // Test against exceptions
        //NON_EXISTING_FUNCTION_TO_MAKE_NODE_CRASH();
        //throw new Error('TEST error');

    });

    // Memory leak info
    /*
    memwatch.on('leak', function(info) {
        console.log("DEBUG: Leak information: " + JSON.stringify(info));
    });
    // Stats after GC run
    memwatch.on('stats', function(stats) {
        console.log("DEBUG: Heap usage: " + JSON.stringify(stats));
    });
    */

    // Not run on local server, interferes with unit tests.
    //TODO Error handling?
    if (process.env.PORT) {
        // Run pending notifications check in configured intervals.
        setInterval(function() {
            NotificationWorker.doNotificationsCheck(function(result) {
                if (result == undefined) {
                    //console.log("DEBUG: NOTIF Did not get lock for notification check.");
                } else {
                    //console.log("DEBUG: NOTIF Sent " + result + " visible notifications.");
                }
            });
        }, LocMapConfig.notificationCheckPollingInterval*1000);

        /* DISABLED TO PREVENT SERVER CRASHES .. current implementation takes too much resources because all users are looped through
        // Run interval notifications method in configured intervals.
        setInterval(function() {
            //var heapd = new memwatch.HeapDiff();
            IntervalNotifications.doIntervalNotifications(function(result) {
                if (result == undefined) {
                    //console.log("DEBUG: INTERVALNOTIF Did not get lock.");
                } else {
                    //console.log("DEBUG: INTERVALNOTIF Sent " + result + " notifications.");
                }
                //var diff = heapd.end();
                //console.log("DEBUG: Heap difference after intervalNotifications: " + JSON.stringify(diff));
            });
        }, (LocMapConfig.backgroundNotificationInterval+1)*1000); // + 1 second to prevent running before the lock should be expired.
        */
    }
}
else
    module.exports = app; // Exports the app to importing module
