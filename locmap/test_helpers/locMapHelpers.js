/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
    LocMap specific test helpers.
 */

var conf = require('../../lib/config'),
    Cache = require('../../lib/cache'),
    LocMapUserModel = require('../lib/locMapUserModel');

// Helper method that checks if result matches crashreport (disregarding timestamp).
var _compareCrashReport = function (result, report) {
    if (result.osType === undefined || result.osType !== report.osType) {
        return false;
    }
    if (typeof result.report !== 'object') {
        return false;
    }
    if (JSON.stringify(result.report) !== JSON.stringify(report.report)) {
        return false;
    }
    return true;
};

module.exports = {
    // Create user using the locMapRESTAPI.js layer instead of actual REST calls.
    createLocMapUserApi: function (test, api, email, deviceId, callback) {
        api.signUpUser({email: email, 'device_id': deviceId}, function (status, userData1) {
            test.equal(status, 200);
            callback(userData1);
        });
    },

    createLocMapUser: function (test, email, deviceId, callback) {
        var that = this;
        that.api.post(test, '/v1/signup', {'data': {'email': email, 'device_id': deviceId}},
            {'status': 200, headers: {'content-type': 'application/json; charset=utf-8'}},
            function (res) {
                var reply = {};
                try {
                    reply = JSON.parse(res.body);
                } catch (error) {
                    // JSON error
                }
                callback({'headers': {'authorizationtoken': reply.authorizationtoken}}, reply);
            });
    },

    getCacheWithUser: function (test, api, userId, callback) {
        var cache = new Cache(),
            user = new LocMapUserModel(userId);
        user.getData(function (userData) {
            test.ok(typeof userData !== 'number');
            cache.cache('locmapuser', userId, user);
            callback(cache);
        });
    },

    // Setup client with automatic tests on each response
    api: require('nodeunit-httpclient').create({
        port: conf.get('port'),
        path: '/api/locmap', // Base URL for requests
        status: 200 // Test each response is OK (can override later)
    }),

    locMapReport1: {location: {'lat': 1, 'lon': 2, 'acc': 3}, battery: 99},

    userDashboard: {icansee: [], canseeme: [], visibility: true, battery: '', location: {},
        idmapping: {}},

    locMapPlace1: {name: 'PlaceName', lat: 1.11, lon: 2.22, rad: 10.0, img: 'somePic', buzz: false},
    locMapPlace2: {name: 'PlaceName2', lat: 2.22, lon: 3.33, rad: 20.1, img: 'somePic2', buzz: false},
    locMapPlace3: {name: 'PlaceName3', lat: 3.33, lon: 4.44, rad: 30.2, img: 'somePic3', buzz: false},

    wrongAuthTokenResult: {
        status: 401,
        headers: {'content-type': 'text/html; charset=utf-8'},
        body: 'Authorization token is wrong!'
    },

    // Helper method that checks if result matches location (disregarding time).
    compareLocation: function (test, result, location) {
        test.equal(result.lat, location.lat);
        test.equal(result.lon, location.lon);
        test.equal(result.acc, location.acc);
        test.ok(typeof result.time === 'number', '');
    },

    // Compare multiple crashreports. Complicated since they can be in any order with timestamps
    // etc.
    compareCrashReports: function (results, reports) {
        var i,
            report,
            reportMatch,
            key,
            resultReport;
        if (Object.keys(results).length !== reports.length) {
            return false;
        }
        // Each report must exist in the results.
        for (i = 0; i < reports.length; i++) {
            report = reports[i];
            reportMatch = false;
            for (key in results) {
                if (results.hasOwnProperty(key)) {
                    resultReport = results[key];
                    if (_compareCrashReport(resultReport, report)) {
                        reportMatch = true;
                        break;
                    }
                }
            }
            if (!reportMatch) {
                return false;
            }
        }
        return true;
    },

    create3LocMapUsersWithApnTokens: function (test, api, user1, user2, user3, callback) {
        var that = this, replies = [];
        that.createLocMapUserApi(test, api, user1, 'deviceid1', function (userData1) {
            replies.push(userData1);
            that.createLocMapUserApi(test, api, user2, 'deviceid2', function (userData2) {
                replies.push(userData2);
                that.createLocMapUserApi(test, api, user3, 'deviceid3', function (userData3) {
                    replies.push(userData3);
                    api.setUserApnToken(userData1.id, 'token1', function (status) {
                        test.equal(status, 200);
                        api.setUserApnToken(userData2.id, 'token2', function (status2) {
                            test.equal(status2, 200);
                            api.setUserApnToken(userData3.id, 'token3', function (status3) {
                                test.equal(status3, 200);
                                callback(replies);
                            });
                        });
                    });
                });
            });
        });
    },

    getCacheAndDashboardFor3LocMapUsers: function (test, api, userid1, userid2, userid3, callback) {
        var that = this, results = [];
        that.getCacheWithUser(test, api, userid1, function (cache1) {
            api.getUserDashboard(userid1, cache1, function (ds1, dash1) {
                test.equal(ds1, 200);
                results.push({cache: cache1, dashboard: dash1});
                that.getCacheWithUser(test, api, userid2, function (cache2) {
                    api.getUserDashboard(userid2, cache2, function (ds2, dash2) {
                        test.equal(ds2, 200);
                        results.push({cache: cache2, dashboard: dash2});
                        that.getCacheWithUser(test, api, userid3, function (cache3) {
                            api.getUserDashboard(userid3, cache3, function (ds3, dash3) {
                                test.equal(ds3, 200);
                                results.push({cache: cache3, dashboard: dash3});
                                callback(results);
                            });
                        });
                    });
                });
            });
        });
    }

};
