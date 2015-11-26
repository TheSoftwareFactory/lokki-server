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
var LocMapRestApi2 = require('./lib/locMapRESTAPI2');
var locMapRestApi2 = new LocMapRestApi2();
var LocMapAdminApi = require('./lib/locMapAdminApi');
var locMapAdminApi = new LocMapAdminApi();
var Cache = require('../lib/cache');
var Constants = require('./lib/constants');

var suspend = require('suspend');
var assert = require('assert');

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
    var GET = 'get',
        POST = 'post',
        PUT = 'put',
        DELETE = 'delete';

    // Generates an express route to the root path of REST API.
    // param type                      Rest call type. I.e. 'post', 'get'.
    // param uri                       The uri
    // param callback(req, res, next)  A callback function. IF there is callback2, next() must be called.
    // param callback2(req, res, next) Second callback function that is executed after first callback function.
    function routeRootApi(type, uri, callback, callback2) {
            (callback2 === undefined) ?
                app[type](uri, callback) :
                app[type](uri, callback, callback2);
    }

    // Generates an express route to the REST API.
    // param type                      Rest call type. I.e. 'post', 'get'.
    // param uri                       An array of uri suffices for route.Single value is also ok. Examples: ["place", "places"], ["places"], "place"
    // param versions                  An array containing every version that uses. Single value is also ok. Examples: ['v1', 'v2'], ['v1'], 'v1'
    // param callback(req, res, next)  A callback function. IF there is callback2, next() must be called.
    // param callback2(req, res, next) Second callback function that is executed after first callback function.
    function route(type, versions, uris, callback, callback2) {
        if (!Array.isArray(versions)) versions = [versions];
        if (!Array.isArray(uris)) uris = [uris];
        versions.forEach(function(version) {
            uris.forEach(function(uri) {
                var route  = '/api/locmap/' + version  + '/' + uri;
                routeRootApi(type, route, callback, callback2);
            });
        });
    }

    function routeUser(type, versions, uris, callback) {
        if (!Array.isArray(uris)) uris = [uris];
        uris.forEach(function(uri) {
            var uriRoute  = 'user/:userId/' + uri;
            route(type, versions, uriRoute, usesAuthentication, callback);
        });
    }

    function routeAdmin(type, versions, uris, callback) {
        if (!Array.isArray(uris)) uris = [uris];
        uris.forEach(function(uri) {
            var uriRoute  = 'admin/:userId/' + uri;
            route(type, versions, uriRoute, usesAdminAuthentication, callback);
        });
    }

    // Create new user to locmap
    // POST body: {email: 'user@example.com', device_id: 'permanentdeviceid', langCode: 'fi-FI'}
    // langCode is optional and defaults to en-US if not given.
    //      Format with two letters is also accepted: 'fi'
    // Reply: 200, {id: 'userId', authorizationtoken: 'mytoken',
    //      icansee: ['userId2', 'userId3'], canseeme: ['userId4']}
    route(POST, ['v1', 'v2'], 'signup', function (req, res) {

        locMapRestApi.signUpUser(req.body, function (status, result) {
            res.send(status, result);
        });
    });

    // Update user location
    routeUser(POST, ['v1', 'v2'], 'location', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.changeUserLocation(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Allow another to see current users position
    routeUser(POST, ['v1', 'v2'], 'allow', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.allowToSeeUserLocation(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Stop another user from seeing current users position
    routeUser(DELETE, ['v1', 'v2'], 'allow/:targetUserId',
        function (req, res) {
            var cache = new Cache();
            cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

            locMapRestApi.denyToSeeUserLocation(req.params.userId, cache, req.params.targetUserId,
                function (status, result) {
                    res.send(status, result);
                });
    });

    // Prevent self from seeing another user's position
    routeUser(POST, ['v1', 'v2'], 'ignore', function (req, res) {
        locMapRestApi.ignoreUser(req.params.userId, req.body, function (status, result) {
                res.send(status, result);
        });
    });


    // Allow self to see an ignored user's position
    routeUser(DELETE, ['v1', 'v2'], 'ignore/:targetUserId', function (req, res) {
        locMapRestApi.unIgnoreUser(req.params.userId, req.params.targetUserId,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Rename contacts
    routeUser(POST, ['v1', 'v2'], 'rename/:targetUserId', function(req, res) {
        locMapRestApi.nameUser(req.params.userId, req.params.targetUserId, req.body,
            function (status, result) {
                res.send(status, result);
        });
    });

    // Toggle user global visibility
    routeUser(PUT, ['v1', 'v2'], 'visibility', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.setUserVisibility(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user language.
    routeUser(PUT, ['v1', 'v2'], 'language', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.setUserLanguage(req.params.userId, cache, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user's ios remote notification token.
    // apnToken must be in body.apnToken. if body.apnToken is undefined, stops sending notifications
    routeUser(POST, ['v1', 'v2'], 'apnToken', function (req, res) {
        locMapRestApi.setUserApnToken(req.params.userId, req.body.apnToken,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user's google android remote notification token.
    // gcmToken must be in body.gcmToken. if body.gcmToken is undefined, stops sending notifications
    routeUser(POST, ['v1', 'v2'], 'gcmToken', function (req, res) {
        locMapRestApi.setUserGcmToken(req.params.userId, req.body.gcmToken,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Set user's wp8 remote notification token.
    // wp8Url must be in body.wp8. if body.wp8 is undefined - stops sending notifications to wp8
    routeUser(POST, ['v1', 'v2'], 'wp8NotificationURL', function (req, res) {
            locMapRestApi.setUserWP8Token(req.params.userId, req.body.wp8,
                function (status, result) {
                    res.send(status, result);
                });
        });

    // Receive user locations for the users current one can see,
    // list of users than can see current user and current global visibility status
    routeUser(GET, ['v1', 'v2'], 'dashboard', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.getUserDashboard(req.params.userId, cache, function (status, result) {
            logger.trace('Dashboard reply status: ' + status +
                ' contents: ' + JSON.stringify(result));
            res.send(status, result);
        });
    });

    // Check for version, if it is out of date, then return a server message.
    // Otherwise, return the user dashboard information.
    routeUser(GET, ['v1', 'v2'], 'version/:versionCode/dashboard', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        if (req.params.versionCode < Constants.LatestAcceptedVersionCode) {
            var responseData = {};
            responseData.serverMessage = Constants.ServerMessage;
            res.send(200, responseData);
        } else {
            locMapRestApi.getUserDashboard(req.params.userId, cache, function (status, result) {
                logger.trace('Dashboard reply status: ' + status +
                    ' contents: ' + JSON.stringify(result));
                res.send(status, result);
            });
        }
    });

    // Send notification to update location to users that the current user can see.
    routeUser(POST, ['v1', 'v2'], 'update/locations', function (req, res) {
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
    route(POST, ['v1', 'v2'], 'crashReport/:userId', function (req, res) {
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
    routeRootApi(GET, '/reset/:userId/:resetId', function (req, res) {
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

    // New account verification using confirmation link.
    routeRootApi(GET, '/confirm/:userId/:confirmationId', function (req, res) {

        locMapRestApi.confirmUserAccount(req.params.userId, req.params.confirmationId, function (status, result) {
            // Remove forcing content to load as a file.
            res.removeHeader('Content-Disposition');
            // Make sure response is provided as html.
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            if (status === 200) {
                res.send(200, result);
            } else {
                // TODO Should we return something else but 200
                res.send(200, '<html>Could not verify confirmation link. If your account has already expired, sign up again to receive a new confirmation link.</html>');
            }
        });
    });

    // Store a new place
    // POST data contents {name: 'aa', lat: 1, lon: 2, rad: 10, img: 'internalpic1.png'}
    // Returns 200, {id: 'placeid'}
    // If place data is invalid, returns 400
    // If place limit reached, returns 403
    routeUser(POST, ['v1', 'v2'], ['place', 'places'], function (req, res) {
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
    routeUser(PUT, ['v1', 'v2'], ['place/:placeId', 'places/:placeId'], function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.modifyUserPlace(req.params.userId, cache, req.params.placeId, req.body,
            function (status, result) {
                res.send(status, result);
            });
    });

    // Remove a place
    // Returns 200
    routeUser(DELETE, ['v1', 'v2'], ['place/:placeId', 'places/:placeId'], function (req, res) {
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
    routeUser(GET, 'v1', 'places', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi.getUserPlaces(req.params.userId, cache, function (status, result) {
            res.send(status, result);
        });
    });

    // Get all places of user.
    // Returns: 200, [{id: placeId, name: 'aa', lat: 1, lon: 2,
    //  rad: 20, img: 'internalpic1.png'}, ... ]
    routeUser(GET, 'v2', 'places', function (req, res) {
        var cache = new Cache();
        cache.cache('locmapuser', req.params.userId, req.cachedUserObjFromAuthorization);

        locMapRestApi2.getUserPlaces(req.params.userId, cache, function (status, result) {
            res.send(status, result);
        });
    });

    // Get all user's contacts.
    // Returns contacts in the same format as Dashboard (without idMapping)
    routeUser(GET, ['v1', 'v2'], 'contacts', function (req, res) {
        locMapRestApi.getUserContacts(req.params.userId, function (status, result) {
            res.send(status, result);
        });
    });

    // Removes a contact, deleting the user and the contact from each other's location shares
    routeUser(DELETE, ['v1', 'v2'], 'contacts/:targetUserId', function (req, res) {
        locMapRestApi.deleteContact(req.params.userId, req.params.targetUserId, function (status, result) {
            res.send(status, result);
        });
    });

    app.get('/request-delete/:emailAddr', suspend(function* (req, res) {
        res.removeHeader('Content-Disposition');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        var result = yield locMapRestApi.requestDelete(req.params.emailAddr,
                suspend.resumeRaw());
        var status = result[0];
        var result = result[1];

        if (status === 200) {
            res.send(200, result);
        }
        assert.ok(status === 200);
    }));

    app.get('/confirm-delete/:userId/:deleteCode', suspend(function* (req, res) {
        res.removeHeader('Content-Disposition');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        var result = yield locMapRestApi.confirmDelete(req.params.userId, 
                req.params.deleteCode, suspend.resumeRaw());
        var status = result[0];
        var result = result[1];

        if (status === 200) {
            res.send(200, result);
        }
        assert.ok(status === 200);
    }));

    app.get('/do-delete/:userId/:deleteCode', suspend(function* (req, res) {
        res.removeHeader('Content-Disposition');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        var result = yield locMapRestApi.doDelete(req.params.userId,
                req.params.deleteCode, suspend.resumeRaw());
        var status = result[0];
        var result = result[1];

        if (status === 200) {
            res.send(200, result);
        }
        assert.ok(status === 200);
    }));

    // // ADMIN calls
    // Get crash reports for chosen os and time period.
    routeAdmin(GET, ['v1', 'v2'], 'crashReport/:osType/:year/:month', function (req, res) {
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
    routeAdmin(POST, ['v1', 'v2'], 'accountRecovery', function (req, res) {
        locMapAdminApi.adminSetAccountToRecoveryMode(req.body, function (status, result) {
            res.send(status, result);
        });
    });

    // Get current status of user info from the db
    routeAdmin(GET, ['v1', 'v2'], 'userStats', function (req, res) {
        locMapAdminApi.adminGetStats(function (status, result) {
            // Override the extra JSON security headers for easier browsing.
            res.removeHeader('Content-Disposition');
            res.send(status, result);
        });
    });

};
