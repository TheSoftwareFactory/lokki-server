/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

// lokki-server main file
// Express application

var express = require('express');

var app = express();

var LocMapConfig = require('./locmap/lib/locMapConfig');
var NotificationWorker = require('./locmap/lib/notificationWorker');
var notificationWorker = new NotificationWorker();

app.use(express.logger('dev')); // 'default', 'short', 'tiny', 'dev'
app.use(express.compress()); // gzip
app.use(express.methodOverride());
app.use(express.bodyParser());

// Security related headers to all paths
app.use(function(req, res, next) {
    // Force browser not to guess type but use content-type exactly.
    // Requires content-type headers to be correctly set.
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent reflected XSS
    // Could have incompatibilities with older browsers. Works on our test phones.
    res.setHeader('X-XSS-Protection', '1, mode=block');

    // Prevents showing data in a frame
    res.setHeader('X-Frame-Options', 'Deny');

    return next();
});

// Security headers for /api (JSON-related)
app.use('/api', function(req, res, next) {
    // Browser shows reply as downloadable instead of injecting into page.
    res.setHeader('Content-Disposition', 'attachment; filename="json-response.txt');
    return next();
});

var inProduction = process.env.PORT || false;
if (inProduction) {
    // do not allow production server to crash
    process.on('uncaughtException', function(err) {
        // handle the error safely
        console.error('uncaughtException:', err);
        console.error(err.stack);
    });

}

// ----------------------------------------------------------------------------------------------------------------------
// Static files
// app.use('/files/', express.static('./files'));

// Root site
app.get('/', function(req, res) {
    res.send('Welcome to Lokki!<br/><br/>');
});


// Loader.io verification site
app.get('/loaderio-710d023d2917f19101bd5b71de132345', function(req, res) {
    res.send('loaderio-710d023d2917f19101bd5b71de132345');
});

// Import LocMap routes
require('./locmap/locmap-server')(app);


// ----------------------------------------------------------------------------------------------------------------------
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
    app.listen(port, function() {
        console.log('Lokki-Server listening on ' + port + '\n');
    });

    // Not run on local server, interferes with unit tests.
    // TODO Error handling?
    if (process.env.PORT) {
        // Run pending notifications check in configured intervals.
        setInterval(function() {
            notificationWorker.doNotificationsCheck(function() {});
        }, LocMapConfig.notificationCheckPollingInterval * 1000);

    }
} else {
    module.exports = app; // Exports the app to importing module
}
