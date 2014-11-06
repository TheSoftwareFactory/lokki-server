/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 Test file: User API methods
 */
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");

var locMapRESTAPI = require('../lib/locMapRESTAPI');
LocMapRestApi = new locMapRESTAPI();

var AppleNotification = require("../../lib/appleNotificationService");
var LocMapGoogleCloudMessagingService = require("../lib/locMapGoogleCloudMessagingService");
var apn = new AppleNotification();

var pushedNotifications = [];// data from mocked pushNotification in format: [{token: token, text: text}, {token2: token2, text2: text2}]
var pushedNotificationsGcm = [];

// mock it to verify that we send notifications
AppleNotification.prototype.pushNotification = function(deviceToken, notificationText, _payload) {
    var notif = {
        token:deviceToken,
        text: notificationText
    };
    if (_payload) {
        notif.payload = _payload;
    }
    pushedNotifications.push(notif);
};
LocMapGoogleCloudMessagingService.prototype.pushNotification = function(deviceToken, notificationText, _payload) {
    var notif = {
        token:deviceToken,
        text: notificationText
    };
    if (_payload) {
        notif.payload = _payload;
    }
    pushedNotificationsGcm.push(notif);
};

var testUserEmail = "user1@example.com.invalid";
var testUserEmail2 = "user2@example.com.invalid";
var testUserEmail3 = "user3@example.com.invalid";

module.exports = {
    setUp: function (callback) {
        pushedNotifications = [];
        pushedNotificationsGcm = [];
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    usersGetLocationUpdateRequestNotificationsApn: function(test) {
        test.expect(12);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail, testUserEmail2, testUserEmail3, function(userDatas) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[1].id, function(cache2) {
                lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[2].id, function(cache3) {
                    LocMapRestApi.allowToSeeUserLocation(userDatas[1].id, cache2, {emails: [testUserEmail]}, function(status, res) {
                        test.equal(status, 200);
                        LocMapRestApi.allowToSeeUserLocation(userDatas[2].id, cache3, {emails: [testUserEmail]}, function(status, res) {
                            test.equal(status, 200);
                            LocMapRestApi.requestUserLocationUpdates(userDatas[0].id, function(status, res) {
                                test.equal(status, 200);
                                test.deepEqual(pushedNotifications, [{token: 'token2', text: 'locationRequest'}, {token: 'token3', text: 'locationRequest'}]);
                                test.done();
                            });
                        });
                    });
                });
            });
        });
    },

    usersGetLocationUpdateRequestNotificationsTimedout: function(test) {
        test.expect(13);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail, testUserEmail2, testUserEmail3, function(userDatas) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[1].id, function(cache2) {
                lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[2].id, function(cache3) {
                    LocMapRestApi.allowToSeeUserLocation(userDatas[1].id, cache2, {emails: [testUserEmail]}, function(status, res) {
                        test.equal(status, 200);
                        LocMapRestApi.allowToSeeUserLocation(userDatas[2].id, cache3, {emails: [testUserEmail]}, function(status, res) {
                            test.equal(status, 200);
                            LocMapRestApi.changeUserLocation(userDatas[1].id, cache2, lmHelpers.locMapReport1, function(status, res) {
                                test.equal(status, 200);
                                LocMapRestApi.requestUserLocationUpdates(userDatas[0].id, function(status, res) {
                                    test.equal(status, 200);
                                    test.deepEqual(pushedNotifications, [{token: 'token3', text: 'locationRequest'}]);
                                    test.done();
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    usersNotVisibleGetNoLocationUpdateRequestNotification: function(test) {
        test.expect(13);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail, testUserEmail2, testUserEmail3, function(userDatas) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[1].id, function(cache2) {
                lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[2].id, function(cache3) {
                    LocMapRestApi.allowToSeeUserLocation(userDatas[1].id, cache2, {emails: [testUserEmail]}, function(status, res) {
                        test.equal(status, 200);
                        LocMapRestApi.allowToSeeUserLocation(userDatas[2].id, cache3, {emails: [testUserEmail]}, function(status, res) {
                            test.equal(status, 200);
                            LocMapRestApi.setUserVisibility(userDatas[2].id, cache3, {'visibility': false}, function(status, res) {
                                test.equal(status, 200);
                                LocMapRestApi.requestUserLocationUpdates(userDatas[0].id, function(status, res) {
                                    test.equal(status, 200);
                                    test.deepEqual(pushedNotifications, [{token: 'token2', text: 'locationRequest'}]);
                                    test.done();
                                });
                            });
                        });
                    });
                });
            });
        });
    }

};
