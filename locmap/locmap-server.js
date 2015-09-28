/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
    LocMap server routes.
 */

var conf = require('../lib/config');
var logger = require('../lib/logger');
var LocMapRestApi = require('./lib/locMapRESTAPI');
var locMapRestApi = new LocMapRestApi();
var LocMapAdminApi = require('./lib/locMapAdminApi');
var locMapAdminApi = new LocMapAdminApi();
var Cache = require('../lib/cache');

// use it as first callback for calls which use authentication.
var usesAuthentication = function (req, res, next) {
    locMapRestApi.authorizeUser(req.params.userId, req.headers,
        function (authStatus, message, userObj) {
            if (authStatus === 200) {
                req.cachedUserObjFromAuthorization = userObj;
                next();
            } else {
                res.send(authStatus, message);
            }
        });
};

var usesAdminAuthentication = function (req, res, next) {
    if (req.params.userId !== conf.get('adminUserId')) {
        return res.send(404, 'Access denied');
    }

    next();// hack yet to enable access through browser
    return undefined;

    // TODO find out what this is, it should be never called because always returned
//    locMapRestApi.authorizeUser(req.params.userId, req.headers,
//        function (authStatus, message, userObj) {
//            if (authStatus === 200) {
//                req.cachedUserObjFromAuthorization = userObj;
//                next();
//            } else {
//                res.send(authStatus, message);
//            }
//        });
};

module.exports = function (app) {
    // Create new user to locmap
    // POST body: {email: 'user@example.com', device_id: 'permanentdeviceid', langCode: 'fi-FI'}
    // langCode is optional and defaults to en-US if not given.
    //      Format with two letters is also accepted: 'fi'
    // Reply: 200, {id: 'userId', authorizationtoken: 'mytoken',
    //      icansee: ['userId2', 'userId3'], canseeme: ['userId4']}
    app.post('/api/locmap/v1/signup', function (req, res) {
        locMapRestApi.signUpUser(req.body, function (status, result) {
            res.send(status, result);
        });
    });

    // Update user location
    app.post('/api/locmap/v1/user/:userId/location', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.changeUserLocation(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Allow another to see current users position
    app.post('/api/locmap/v1/user/:userId/allow', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.allowToSeeUserLocation(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Stop another user from seeing current users position
    app['delete']('/api/locmap/v1/user/:userId/allow/:targetUserId', usesAuthentication,
        function (req, res) {
            var cache = new Cache();
            cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

            locMapRestApi.denyToSeeUserLocation(req.params.userId, cache, req.params.targetUserId,
                function (status, result) {
                    res.send(status, result);
                });
        });

    // Prevent self from seeing another user's position
    app['post']('/api/locmap/v1/user/:userId/ignore', usesAuthentication, function (req, res) {

        locMapRestApi.ignoreUser(req.params.userId, req.body, function (status, result) {
                res.send(status, result);
        });
    });

    // Allow self to see an ignored user's position
    app['delete']('/api/locmap/v1/user/:userId/ignore/:targetUserId', usesAuthentication, function (req, res) {

        locMapRestApi.unIgnoreUser(req.params.userId, req.params.targetUserId,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Toggle user global visibility
    app.put('/api/locmap/v1/user/:userId/visibility', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.setUserVisibility(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user language.
    app.put('/api/locmap/v1/user/:userId/language', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.setUserLanguage(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user's ios remote notification token.
    // apnToken must be in body.apnToken. if body.apnToken is undefined, stops sending notifications
    app.post('/api/locmap/v1/user/:userId/apnToken', usesAuthentication, function (req, res) {
        locMapRestApi.setUserApnToken(req.params.userId, req.body.apnToken,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user's google android remote notification token.
    // gcmToken must be in body.gcmToken. if body.gcmToken is undefined, stops sending notifications
    app.post('/api/locmap/v1/user/:userId/gcmToken', usesAuthentication, function (req, res) {
        locMapRestApi.setUserGcmToken(req.params.userId, req.body.gcmToken,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user's wp8 remote notification token.
    // wp8Url must be in body.wp8. if body.wp8 is undefined - stops sending notifications to wp8
    app.post('/api/locmap/v1/user/:userId/wp8NotificationURL', usesAuthentication,
        function (req, res) {
            locMapRestApi.setUserWP8Token(req.params.userId, req.body.wp8,
                function (status, result) {
                    res.send(status, result);
                });
        });

    // Receive user locations for the users current one can see,
    // list of users than can see current user and current global visibility status
    app.get('/api/locmap/v1/user/:userId/dashboard', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.getUserDashboard(req.params.userId, cache, function (status, result) {
            logger.trace('Dashboard reply status: ' + status +
                ' contents: ' + JSON.stringify(result));
            res.send(status, result);
        });
    });

    // Send notification to update location to users that the current user can see.
    app.post('/api/locmap/v1/user/:userId/update/locations', usesAuthentication,
        function (req, res) {
            logger.trace('User ' + req.params.userId + ' requested location updates.');
            var cache = new Cache();
            cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

            locMapRestApi.requestUserLocationUpdates(req.params.userId, function (status, result) {
                res.send(status, result);
            });
        });

    // Post a crash report
    // POST data contents: {osType: 'android', osVersion: '4.4.0-Kitkat SDK whatever',
    //      lokkiVersion: '1.2.3', reportTitle: 'Lokki crash NullpointerException',
    //      reportData: 'report data.'}
    // osType must be one of: android/ios/wp, other information is freeform.
    app.post('/api/locmap/v1/crashReport/:userId', usesAuthentication, function (req, res) {
        logger.trace('Crashreport storage called.');
        locMapRestApi.storeCrashReport(req.params.userId, req.body, function (status, result) {
            res.send(status, result);
        });
    });

    // Account recovery using confirmation code.
    // POST data contents: {email: user@email.zzz}
    // TODO Implement
    /*
     app.post('/api/locmap/v1/recovery/confirmation', function (req, res) {
     res.send(500, 'Not implemented.');
     });
     */

    // Account recovery using reset link.
    app.get('/reset/:userId/:resetId', function (req, res) {
        locMapRestApi.resetUserAccountToRecoveryMode(req.params.userId, req.params.resetId, function (status, result) {
            // Remove forcing content to load as a file.
            res.removeHeader('Content-Disposition');
            // Make sure response is provided as html.
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            if (status === 200) {
                res.send(200, result);
            } else {
                // TODO Should we return something else but 200
                res.send(200, '<html>An error occurred, please try ' +
                    'signing in again to get a new reset email.</html>');
            }
        });
    });

    // Store a new place
    // POST data contents {name: 'aa', lat: 1, lon: 2, rad: 10, img: 'internalpic1.png'}
    // Returns 200, {id: 'placeid'}
    // If place data is invalid, returns 400
    // If place limit reached, returns 403
    app.post('/api/locmap/v1/user/:userId/place', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.addUserPlace(req.params.userId, cache, req.body, function (status, result) {
            res.send(status, result);
        });
    });

    // Update existing place
    // PUT data contents {name: 'aa', lat: 1, lon: 2, rad: 10, img: 'internalpic1.png'}
    // Returns 200
    // If place data is invalid, returns 400
    app.put('/api/locmap/v1/user/:userId/place/:placeId', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.modifyUserPlace(req.params.userId, cache, req.params.placeId, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Remove a place
    // Returns 200
    app['delete']('/api/locmap/v1/user/:userId/place/:placeId', usesAuthentication,
        function (req, res) {
            var cache = new Cache();
            cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

            locMapRestApi.removeUserPlace(req.params.userId, cache, req.params.placeId,
                function (status, result) {
                    res.send(status, result);
                });
        });

    // Get all places of user.
    // Returns: 200, {placeId: {name: 'aa', lat: 1, lon: 2,
    //  rad: 20, img: 'internalpic1.png'}, placeId2: ... }
    app.get('/api/locmap/v1/user/:userId/places', usesAuthentication, function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.getUserPlaces(req.params.userId, cache, function (status, result) {
            res.send(status, result);
        });
    });

    // Get all user's contacts.
    // Returns contacts in the same format as Dashboard
    app.get('/api/locmap/v1/user/:userId/contacts', usesAuthentication, function (req, res) {

        locMapRestApi.getUserContacts(req.params.userId, function (status, result) {
            res.send(status, result);
        });
    });

    // Removes a contact, deleting the user and the contact from each other's location shares
    app['delete']('/api/locmap/v1/user/:userId/contacts/:targetUserId', usesAuthentication, function (req, res) {
        locMapRestApi.deleteContact(req.params.userId, req.params.targetUserId, function (status, result) {
            res.send(status, result);
        });
    });

    // // ADMIN calls
    // Get crash reports for chosen os and time period.
    app.get('/api/locmap/v1/admin/:userId/crashReport/:osType/:year/:month',
        usesAdminAuthentication, function (req, res) {
            locMapAdminApi.adminGetCrashReports(req.params.osType, req.params.year,
                req.params.month,
                function (status, result) {
                // Override the extra JSON security headers for easier browsing.
                    res.removeHeader('Content-Disposition');
                    res.send(status, result);
                });
        });

    // Put account into recovery mode. Limited to hardcoded set of development accounts.
    // POST contents: email string JSONized.
    app.post('/api/locmap/v1/admin/:userId/accountRecovery', usesAdminAuthentication,
        function (req, res) {
            locMapAdminApi.adminSetAccountToRecoveryMode(req.body, function (status, result) {
                res.send(status, result);
            });
        });

    // Get current status of user info from the db
    app.get('/api/locmap/v1/admin/:userId/userStats', usesAdminAuthentication, function (req, res) {
        locMapAdminApi.adminGetStats(function (status, result) {
            // Override the extra JSON security headers for easier browsing.
            res.removeHeader('Content-Disposition');
            res.send(status, result);
        });
    });

};
