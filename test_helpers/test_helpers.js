/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details

*/

'use strict';

var conf = require('../lib/config');
var logger = require('../lib/logger');

var testServerProcess = {};

var testPlaceTemplate = {
    name: 'TestPlace',
    lat: 12.23,
    lon: 64.12,
    radius: 100,
    type: 'factory'
};

var port = conf.get('port');

// TODO Add the security headers.
module.exports = {
    successResult: {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: 'OK'
    },

    wrongAuthTokenResult: {
        status: 404,
        headers: {'content-type': 'text/html; charset=utf-8'},
        body: 'Authorization token is wrong!'
    },

    userDoesNotExistResult: {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: 'User does not exist'
    },

    passwordDoesNotMatchResult: {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: 'Password does not match'
    },

    overFloodLimitResult: {
        status: 429,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: 'Too many requests'
    },

    tooLongMessageResult: {
        status: 413,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: 'Too long message'
    },

    invalidLocationDataResult: {
        status: 400,
        headers: {'content-type': 'text/html; charset=utf-8' },
        body: 'Location object is wrong!'
    },

    invalidUserDataResult: {
        status: 400,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: 'Invalid user data.'
    },

    testPlace: testPlaceTemplate,

    testPlaceIncludingPlace1: {
        name: 'TestPlaceIncludingPlace1',
        lat: 13.23,
        lon: 65.12,
        radius: 200000,
        type: 'someType'
    },

    testPlace2: {
        name: 'TestPlace2',
        lat: 22.23,
        lon: 77.12,
        radius: 100,
        type: 'home'

    },

    // object sent by client to server which corresponds to place1
    locationReportAtPlace1: {
        lat: testPlaceTemplate.lat,
        lon: testPlaceTemplate.lon,
        acc: 10
    },

    // object sent by client to server which corresponds to 100m off from place1
    locationReport100MetersOffPlace1: {
        lat: testPlaceTemplate.lat + 100 / 111000, // 110000 is about how many meters in a degree, 1/111000 is how many degrees in 1 meter
        lon: testPlaceTemplate.lon,
        acc: 10
    },

    // object sent by client to server which contains place1 inside accuracy but lat, lon are outside of place1.
    // it is used to test that we don't move people outside of places if accuracy is so bad that position is outside of place but accuracy circle intersects place radius circle.
    // This place also matches testPlaceIncludingPlace1
    locationReportWithBadAccuracyIncludesPlace1: {
        lat: testPlaceTemplate.lat + 1500 / 111000, // 110000 is about how many meters in a degree, 1/111000 is how many degrees in 1 meter
        lon: testPlaceTemplate.lon,
        acc: 1999
    },

    // like place1 but with 500m bad accuracy
    locationReportWithBadAccuracyAtPlace1: {
        lat: testPlaceTemplate.lat,
        lon: testPlaceTemplate.lon,
        acc: 500
    },


    // object sent by client to server which corresponds to place2
    locationReportAtPlace2: {
        lat: 22.23,
        lon: 77.12,
        acc: 19 // 20m is what we consider good location so 19 should be good
    },

    // object sent by client to server which corresponds to place2
    locationReportAtPlace2WithBadAccuracy: {
        lat: 22.23,
        lon: 77.12,
        acc: 120
    },
    // object sent by client to server which is away from all defined places
    locationReportAtNoWhere: {
        lat: 120,
        lon: 120,
        acc: 10
    },

    // standard data for create user POST call
    createUserData: {
        data: {
            name: 'user name',
            password: 'test',
            smsConfirmationCode: '1234'
        }
    },

    // if you used createUserData to create user then you can use loginUserData to log him in
    loginUserData: {
        data: {
            password: 'test'
        }
    },


    // Setup client with automatic tests on each response
    api: require('nodeunit-httpclient').create({
        port: port,
        path: '/api',   // Base URL for requests
        status: 200,    // Test each response is OK (can override later)
        headers: {      // Test that each response must have these headers (can override later)
            'content-type': 'application/json; charset=utf-8'
        }
    }),

    // Setup client with automatic tests on each response
    apiRoot: require('nodeunit-httpclient').create({
        port: port,
        path: '',   // Base URL for requests
        status: 200,    // Test each response is OK (can override later)
        headers: {      // Test that each response must have these headers (can override later)
            'content-type': 'application/json; charset=utf-8'
        }
    }),

    // this function must be first as it starts server for testing
    startServer: function(test) {
        var spawn = require('child_process').spawn;
        testServerProcess = spawn('node', ['./lokki-server.js']);
        var serverStarted = false;

        testServerProcess.stdout.setEncoding('utf8');
        testServerProcess.stdout.on('data', function(data) {
            var str = data.toString();
            var lines = str.split(/(\r?\n)/g);
            logger.trace('Server log: %s', lines.join('').trim());
        });

        // Poll server until able to connect
        var waitTime = 5; // ms
        var http = require('http');
        var serverTimeout = setTimeout(function serverReady() {
            http.get('http://localhost:' + port, function() {
                test.done();
                serverStarted = true;
            }).on('error', function() {
                serverTimeout = setTimeout(serverReady, waitTime);
            });
        }, waitTime);

        testServerProcess.on('close', function(code) {
            if (!serverStarted) {
                clearTimeout(serverTimeout);
                test.done();
            }
            logger.trace('process exit code ' + code);
        });
    },

    // execute this as last test to stop server started using startServer
    stopServer: function(test) {
        logger.trace('Stopping server');
        testServerProcess.kill();
        testServerProcess = {};
        test.done();
    },

    // code to clean DB. calls callback when done
    cleanDB: function(callback) {
        var dbSetup = require('../test_helpers/dbSetup');
        dbSetup(function() {
            callback();
        });
    },

    // returns new object which can be added to user settings to enable gettings notifications about place forPlaceId for user forUserId
    getUserSettingsWithEnabledNotifications: function(forUserId, forPlaceId) {
        var newSettings = {
            language: 'en',
            placeNotifications: {
                onCreated: true,
                onDeleted: true
            },
            peopleNotifications: {
                sendAllLocationAlerts: false
            }
        };

        newSettings.peopleNotifications[forUserId] = {enabled: true, perPlace: {}};
        newSettings.peopleNotifications[forUserId].perPlace[forPlaceId] = {
            enter: true,
            leave: false
        };
        return newSettings;
    },

    createAndLoginUser: function(test, userName, callback) {
        var that = this;
        that.api.post(test, '/user/confirmPhone/' + userName, {}, that.successResult, function() { // init sms confirmation
            that.api.post(test, '/user/' + userName, that.createUserData, that.successResult, function() {  // create user
                that.api.post(test, '/login/' + userName, {data: {password: 'test'}}, {body: undefined}, function(res) { // login user
                    var authToken = JSON.parse(res.body).authorizationToken;
                    callback(authToken);
                });
            });
        });
    },

    friend4Users: function(test, friendingUser, user1, user2, user3, user4, friendingUserToken, t1, t2, t3, t4, callback) {
        var that = this;
        that.api.post(test, '/user/' + friendingUser + '/friend/' + user1, {headers: {authorizationtoken: friendingUserToken}}, that.successResult, function() {
            that.api.post(test, '/user/' + friendingUser + '/friend/' + user2, {headers: {authorizationtoken: friendingUserToken}}, that.successResult, function() {
                that.api.post(test, '/user/' + friendingUser + '/friend/' + user3, {headers: {authorizationtoken: friendingUserToken}}, that.successResult, function() {
                    that.api.post(test, '/user/' + friendingUser + '/friend/' + user4, {headers: {authorizationtoken: friendingUserToken}}, that.successResult, function() {
                        that.api.post(test, '/user/' + user1 + '/friend/' + friendingUser, {headers: {authorizationtoken: t1}}, that.successResult, function() {
                            that.api.post(test, '/user/' + user2 + '/friend/' + friendingUser, {headers: {authorizationtoken: t2}}, that.successResult, function() {
                                that.api.post(test, '/user/' + user3 + '/friend/' + friendingUser, {headers: {authorizationtoken: t3}}, that.successResult, function() {
                                    that.api.post(test, '/user/' + user4 + '/friend/' + friendingUser, {headers: {authorizationtoken: t4}}, that.successResult, function() {
                                        callback();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

    },

    createAndLogin4Users: function(test, user1, user2, user3, user4, callback) {
        var that = this;
        that.api.post(test, '/user/confirmPhone/' + user1, {}, that.successResult, function() { // init sms confirmation
            that.api.post(test, '/user/' + user1, that.createUserData, that.successResult, function() {  // create user
                that.api.post(test, '/login/' + user1, {data: {password: 'test'}}, {body: undefined}, function(login) { // login user
                    var authToken1 = JSON.parse(login.body).authorizationToken;

                    that.api.post(test, '/user/confirmPhone/' + user2, {}, that.successResult, function() { // init sms confirmation
                        that.api.post(test, '/user/' + user2, that.createUserData, that.successResult, function() {  // create user
                            that.api.post(test, '/login/' + user2, {data: {password: 'test'}}, {body: undefined}, function(login2) { // login user
                                var authToken2 = JSON.parse(login2.body).authorizationToken;

                                that.api.post(test, '/user/confirmPhone/' + user3, {}, that.successResult, function() { // init sms confirmation
                                    that.api.post(test, '/user/' + user3, that.createUserData, that.successResult, function() {  // create user
                                        that.api.post(test, '/login/' + user3, {data: {password: 'test'}}, {body: undefined}, function(login3) { // login user
                                            var authToken3 = JSON.parse(login3.body).authorizationToken;

                                            that.api.post(test, '/user/confirmPhone/' + user4, {}, that.successResult, function() { // init sms confirmation
                                                that.api.post(test, '/user/' + user4, that.createUserData, that.successResult, function() {  // create user
                                                    that.api.post(test, '/login/' + user4, {data: {password: 'test'}}, {body: undefined}, function(login4) { // login user
                                                        var authToken4 = JSON.parse(login4.body).authorizationToken;
                                                        callback(authToken1, authToken2, authToken3, authToken4);
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    cleanS3: function(callback) {
        var awss3 = require('../lib/awss3');
        // Remove only testing user avatar from S3, just in case someone runs this agains production S3.
        var testUsers = ['testUserId', 'user11'];
        // Counter magic to trigger callback when last call finishes.
        var counter = testUsers.length;

        function removeAvatar(user) {
            awss3.del('avatar/' + user).on('response', function(res) {
                if (res.statusCode !== 204 && res.statusCode !== 404) {
                    logger.trace('S3 removal of avatar/testUserId failed with status ' + res.statusCode);
                }
                counter--;
                if (counter < 1) {
                    return callback();
                }
            }).end();
        }

        for (var i = 0; i < testUsers.length; i++) {
            var testUser = testUsers[i];
            removeAvatar(testUser);
        }
    }

};
