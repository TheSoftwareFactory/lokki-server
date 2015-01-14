/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var helpers = require('../../test_helpers/test_helpers');
var lmHelpers = require('../test_helpers/locMapHelpers');
var LocMapCommon = require('../lib/locMapCommon');
var locMapCommon = new LocMapCommon();

var testUserEmail = 'user1@example.com.invalid';
var testUserEmail2 = 'user2@example.com.invalid';
var testUserEmail3 = 'user3@example.com.invalid';

module.exports = {

    // this function must be first as it starts server for testing
    startServer: function(test) {
        helpers.startServer(test);
    },

    setUp: function(callback) {
        helpers.cleanDB(function() {
            callback();
        });
    },

    tearDown: function(callback) {
        helpers.cleanDB(function() {
            callback();
        });
    },

    setAndGetCrashReports: function(test) {
        var osType = 'android';
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function(auth, reply) {
            var report = {'osType': osType, osVersion: 'foobar', lokkiVersion: '3.0.0', reportTitle: 'title', reportData: 'data'};
            var authWithData = JSON.parse(JSON.stringify(auth));
            authWithData.data = report;
            console.log('User created. posting report.');
            lmHelpers.api.post(test, '/v1/crashReport/' + reply.id, authWithData, function() {
                var now = new Date();
                var year = now.getFullYear();
                var month = now.getMonth() + 1;
                lmHelpers.api.get(test, '/v1/admin/358405297258/crashReport/' + osType + '/' + year + '/' + month, function(res) {
                    test.ok(lmHelpers.compareCrashReports(res.data, [{osType: osType, report: report}]), 'Report did not match reference.');
                    test.done();
                });
            });
        });
    },

    resetUserAccount: function(test) {
        test.expect(6);
        var email = '1@r.ru';
        lmHelpers.createLocMapUser(test, email, 'dev1', function(auth, reply) {
            var userId = reply.id;
             lmHelpers.api.post(test, '/v1/admin/358405297258/accountRecovery', {data: {email: email}}, function() {
                 lmHelpers.createLocMapUser(test, email, 'differentdev', function() {
                     test.equal(reply.id, userId);
                     test.done();
                 });
             });
        });
    },

    resetNotAllowedOnNormalAccount: function(test) {
        test.expect(4);
        var email = testUserEmail;
        lmHelpers.createLocMapUser(test, email, 'dev1', function() {
            lmHelpers.api.post(test, '/v1/admin/358405297258/accountRecovery', {data: {email: email}}, {status: 401}, function() {
                lmHelpers.api.post(test, '/v1/signup', {data: {email: email, 'device_id': 'differentid'}}, {status: 401}, function() {
                    test.done();
                });
            });
        });
    },

    getStatistics: function(test) {
        test.expect(13);
        // Create comparison dictionary.
        var referenceStats = locMapCommon.getDefaultStatsDict();
        referenceStats.totalAccounts = 3;
        referenceStats.activatedAccounts = 2;
        referenceStats.invitePendingAccounts = 1;
        referenceStats.userLocationUpdatedSince.never = 2;
        referenceStats.userLocationUpdatedSince[0] = 1;
        referenceStats.contactsPerActivatedUser[0] = 0;
        referenceStats.contactsPerActivatedUser[1] = 2;
        referenceStats.activatedUsersByPlatform.ios = 1;
        referenceStats.activatedUsersByPlatform.android = 1;
        referenceStats.activatedUsersByVisibility.visible = 1;
        referenceStats.activatedUsersByVisibility.invisible = 1;
        referenceStats.userDashboardAccessSince.never = 2;
        referenceStats.userDashboardAccessSince[0] = 1;

        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function(auth, reply) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function(auth2, reply2) {
                // User 1 has current location.
                auth.data = JSON.parse(JSON.stringify(lmHelpers.locMapReport1));
                lmHelpers.api.post(test, '/v1/user/' + reply.id + '/location', auth, function() {
                    // User 1 has 1 contact.
                    auth.data = {emails: [testUserEmail2]};
                    lmHelpers.api.post(test, '/v1/user/' + reply.id + '/allow', auth, function() {
                        // User 2 has 1 contact, user 3. User 3 has not logged in yet.
                        auth2.data = {emails: [testUserEmail3]};
                        lmHelpers.api.post(test, '/v1/user/' + reply2.id + '/allow', auth2, function() {
                            // User 1 is using iOS.
                            auth.data = {apnToken: 'token'};
                            lmHelpers.api.post(test, '/v1/user/' + reply.id + '/apnToken', auth, function() {
                                // User 2 is using Android.
                                auth2.data = {gcmToken: 'token'};
                                lmHelpers.api.post(test, '/v1/user/' + reply2.id + '/gcmToken', auth2, function() {
                                    // User 1 is not visible.
                                    auth.data = {visibility: false};
                                    lmHelpers.api.put(test, '/v1/user/' + reply.id + '/visibility', auth, function() {
                                        // User 1 has accessed dashboard today.
                                        lmHelpers.api.get(test, '/v1/user/' + reply.id + '/dashboard', auth, function() {
                                            lmHelpers.api.get(test, '/v1/admin/358405297258/userStats', function(res) {
                                                test.deepEqual(res.data, referenceStats);
                                                test.done();
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
    }

};

// this function must be last as it stops test server
module.exports.stopServer = function(test) {
    helpers.stopServer(test);
};
