/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
var db = require('../../lib/db');
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");
var LocMapUserModel = require('../lib/locMapUserModel');
var notificationWorker = require('../lib/notificationWorker');
var NotificationWorker = new notificationWorker();
var locMapRESTAPI = require('../lib/locMapRESTAPI');
var LocMapRestApi = new locMapRESTAPI();
var pendingNotifications = require('../lib/pendingNotifications');
var PendingNotifications = new pendingNotifications();

var AppleNotification = require("../../lib/appleNotificationService");
var apn = new AppleNotification();

var pushedNotifications = [];// data from mocked pushNotification in format: [{token: token, text: text}, {token2: token2, text2: text2}]

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

module.exports = {
    setUp: function (callback) {
        pushedNotifications = [];
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    checkAndNotifyAppleUserCallsNotify: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply, auth) {
            LocMapRestApi.setUserApnToken(reply.id, "APN", function(apnResult) {
                test.equal(apnResult, 200);
                var now = Date.now();
                NotificationWorker._checkAndNotifyUser(reply.id, now, function(checkResult) {
                    test.equal(checkResult, true, "_checkAndNotifyUser should report notification was sent.");
                    test.equal(pushedNotifications.length, 1);
                    test.deepEqual(pushedNotifications[0], {token: "APN", text: "Your Lokki friends are requesting your location. You should start Lokki to enable location reporting."});
                    test.done();
                });
            });
        });
    },

    checkAndNotifyDoesNotNotifyAndroidUser: function(test) {
        test.expect(4);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply, auth) {
            LocMapRestApi.setUserGcmToken(reply.id, "GCM", function(gcmResult) {
                test.equal(gcmResult, 200);
                var now = Date.now();
                NotificationWorker._checkAndNotifyUser(reply.id, now, function(checkResult) {
                    test.equal(checkResult, false, "_checkAndNotifyUser should report notification not was sent.");
                    test.equal(pushedNotifications.length, 0);
                    test.done();
                });
            });
        });
    },

    checkAndNotifyDoesNotNotifyRecentlyNotified: function(test) {
        test.expect(6);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply, auth) {
            LocMapRestApi.setUserApnToken(reply.id, "APN", function(apnResult) {
                test.equal(apnResult, 200);
                var now = Date.now();
                NotificationWorker._checkAndNotifyUser(reply.id, now, function(checkResult) {
                    test.equal(checkResult, true, "_checkAndNotifyUser should report notification was sent.");
                    now = Date.now();
                    test.equal(pushedNotifications.length, 1);
                    NotificationWorker._checkAndNotifyUser(reply.id, now, function(checkResult2) {
                        test.equal(checkResult2, false, "_checkAndNotifyUser should report notification was not sent.");
                        test.equal(pushedNotifications.length, 1);
                        test.done();
                    });
                });
            });
        });
    },

    checkAndNotifyDoesNotNotifyRecentlyUpdatedLocation: function(test) {
        test.expect(5);
        var notificationTime = Date.now();
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply, auth) {
            LocMapRestApi.setUserApnToken(reply.id, "APN", function(apnResult) {
                test.equal(apnResult, 200);
                lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                    LocMapRestApi.changeUserLocation(reply.id, cache, lmHelpers.locMapReport1, function(res) {
                        test.equal(res, 200);
                        NotificationWorker._checkAndNotifyUser(reply.id, notificationTime, function(checkResult) {
                            test.equal(checkResult, false, "_checkAndNotifyUser should report notification was not sent.");
                            test.done();
                        });
                    });
                });
            });
        });
    },

    doNotificationCheckNotifiesUsers: function(test) {
        test.expect(6);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply, auth) {
            LocMapRestApi.setUserApnToken(reply.id, "APN", function(apnResult) {
                test.equal(apnResult, 200);
                PendingNotifications.addNewNotification(reply.id, function(pendingResult) {
                    test.equal(pendingResult, true);
                    NotificationWorker.doNotificationsCheck(function(notificationResult) {
                        // Function reports correct number of sent notifications.
                        test.equal(notificationResult, 1);
                        test.equal(pushedNotifications.length, 1);
                        test.deepEqual(pushedNotifications[0], {token: "APN", text: "Your Lokki friends are requesting your location. You should start Lokki to enable location reporting."});
                        test.done();
                    });
                });
            });
        });
    },

    doNotificationCheckLockTimeout: function(test) {
        test.expect(2);
        NotificationWorker.doNotificationsCheck(function(notificationResult) {
           test.equal(notificationResult, 0);
            NotificationWorker.doNotificationsCheck(function(notificationResult2) {
                // Second call before lock has timed out returns undefined.
                test.equal(notificationResult2, undefined);
                test.done();
            })
        });
    },

    doNotificationCheckSingleNotificationPerUser: function(test) {
        test.expect(7);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply, auth) {
            LocMapRestApi.setUserApnToken(reply.id, "APN", function(apnResult) {
                test.equal(apnResult, 200);
                PendingNotifications.addNewNotification(reply.id, function(pendingResult) {
                    test.equal(pendingResult, true);
                    PendingNotifications.addNewNotification(reply.id, function(pendingResult2) {
                        test.equal(pendingResult2, true);
                        NotificationWorker.doNotificationsCheck(function(notificationResult) {
                            // Function reports correct number of sent notifications.
                            test.equal(notificationResult, 1);
                            test.equal(pushedNotifications.length, 1);
                            test.deepEqual(pushedNotifications[0], {token: "APN", text: "Your Lokki friends are requesting your location. You should start Lokki to enable location reporting."});
                            test.done();
                        });
                    });
                });
            });
        });
    },

    cleanNotifications: function(test) {
        test.expect(1);
        var notifications = [{userId: 'aa', timestamp: 1}, {userId: 'bb', timestamp: 3}, {userId: 'aa', timestamp: 9}, {userId: 'bb', timestamp: 10}];

        var result = NotificationWorker._cleanNotifications(notifications);

        test.deepEqual(result, [{userId: 'aa', timestamp: 1}, {userId: 'bb', timestamp: 3}]);
        test.done();
    },

    cleanNotificationsEmpty: function(test) {
        test.expect(1);

        var result = NotificationWorker._cleanNotifications([]);

        test.deepEqual(result, []);
        test.done();
    },

    cleanNotificationsNoChange: function(test) {
        test.expect(1);
        var notifications = [{userId: 'aa', timestamp: 1}, {userId: 'bb', timestamp: 3}, {userId: 'cc', timestamp: 9}, {userId: 'dd', timestamp: 10}];

        var result = NotificationWorker._cleanNotifications(notifications);

        test.deepEqual(result, notifications);
        test.done();
    }

};