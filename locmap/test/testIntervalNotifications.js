/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
var db = require('../../lib/db');
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");
var LocMapUserModel = require('../lib/locMapUserModel');
var locMapRESTAPI = require('../lib/locMapRESTAPI');
var LocMapRestApi = new locMapRESTAPI();
var intervalNotifications = require('../lib/intervalNotifications');
var IntervalNotifications = new intervalNotifications();

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

var testUserEmail1 = "user1@example.com.invalid";
var testUserEmail2 = "user2@example.com.invalid";
var testUserEmail3 = "user3@example.com.invalid";
var testStubUser = "testuser@fi.invalid";


function compare_tokens(a, b) {
  if (a.token < b.token)
     return -1;
  if (a.token > b.token)
    return 1;
  return 0;
}


module.exports = {
    setUp: function (callback) {
        pushedNotifications = [];
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    usersAreNotified: function(test) {
        test.expect(15);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail1, testUserEmail2, testUserEmail3, function(userDatas) {
            lmHelpers.getCacheAndDashboardFor3LocMapUsers(test, LocMapRestApi, userDatas[0].id, userDatas[1].id, userDatas[2].id, function(cacheDash) {
                IntervalNotifications.doIntervalNotifications(function(result) {
                    test.equal(result, 3, "Function did not report correct number of notifications sent.");
                    test.equal(pushedNotifications.length, 3, "Correct number of notifications was not sent.");
                    //TODO Result might change due to timing issues
                    test.deepEqual(pushedNotifications.slice(0).sort(compare_tokens), [{token: 'token1', text: ''},
                        {token: 'token2', text: ''}, {token: 'token3', text: ''}]);
                    test.done();
                });
            });
        });
    },

    userWithRecentLocationNotNotified: function(test) {
        test.expect(16);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail1, testUserEmail2, testUserEmail3, function(userDatas) {
            lmHelpers.getCacheAndDashboardFor3LocMapUsers(test, LocMapRestApi, userDatas[0].id, userDatas[1].id, userDatas[2].id, function(cacheDash) {
                LocMapRestApi.changeUserLocation(userDatas[0].id, cacheDash[0].cache, lmHelpers.locMapReport1, function(res) {
                    test.equal(res, 200, "Location update failed.");
                    IntervalNotifications.doIntervalNotifications(function(result) {
                        test.equal(result, 2, "Function did not report correct number of notifications sent.");
                        test.equal(pushedNotifications.length, 2, "Correct number of notifications was not sent.");
                        //TODO Result order might change due to timing issues
                        test.deepEqual(pushedNotifications.slice(0).sort(compare_tokens), [{token: 'token2', text: ''}, {token: 'token3', text: ''}]);
                        test.done();
                    });
                });
            });
        });
    },

    usersWithoutTokenNotNotified: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, testUserEmail1, "dev1", function(userData) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, userData.id, function(cache) {
                LocMapRestApi.getUserDashboard(userData.id, cache, function(status, dash) {
                    test.equal(status, 200);
                    IntervalNotifications.doIntervalNotifications(function(result) {
                        test.equal(result, 0, "Function did not report correct number of notifications sent.");
                        test.equal(pushedNotifications.length, 0, "Correct number of notifications was not sent.");
                        test.done();
                    });
                });
            });
        });
    },

    invisibleUsersNotNotified: function(test) {
        test.expect(18);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail1, testUserEmail2, testUserEmail3, function(userDatas) {
            lmHelpers.getCacheAndDashboardFor3LocMapUsers(test, LocMapRestApi, userDatas[0].id, userDatas[1].id, userDatas[2].id, function(cacheDash) {
                LocMapRestApi.setUserVisibility(userDatas[0].id, cacheDash[0].cache, {visibility: false}, function(visResult1) {
                    test.equal(visResult1, 200);
                    lmHelpers.getCacheWithUser(test, LocMapRestApi, userDatas[1].id, function(cache2) {
                        LocMapRestApi.setUserVisibility(userDatas[1].id, cache2, {visibility: false}, function(visResult2) {
                            test.equal(visResult2, 200);
                            IntervalNotifications.doIntervalNotifications(function(result) {
                                test.equal(result, 1, "Function did not report correct number of notifications sent.");
                                test.equal(pushedNotifications.length, 1, "Correct number of notifications was not sent.");
                                test.deepEqual(pushedNotifications, [{token: 'token3', text: ''}]);
                                test.done();
                            });
                        });
                    });
                });
            });
        });
    },

    inactiveUsersNotNotified: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, testUserEmail1, "dev1", function(userData) {
            var targetUsers = {emails: [testStubUser]};
            lmHelpers.getCacheWithUser(test, LocMapRestApi, userData.id, function(cache) {
                LocMapRestApi.allowToSeeUserLocation(userData.id, cache, targetUsers, function(allowRes) {
                    test.equal(allowRes, 200);
                    IntervalNotifications.doIntervalNotifications(function(result) {
                        test.equal(result, 0, "Function did not report correct number of notifications sent.");
                        test.equal(pushedNotifications.length, 0, "Correct number of notifications was not sent.");
                        test.done();
                    });
                });
            });
        });
    },

    // Verify that calling doIntervalNotifications uses lock that prevents multiple calls within timeout.
    doIntervalNotificationsLocking: function(test) {
        test.expect(2);
        IntervalNotifications.doIntervalNotifications(function(result1) {
            test.equal(result1, 0);
            IntervalNotifications.doIntervalNotifications(function(result2) {
                test.equal(result2, undefined);
                test.done();
            });
        });
    },

    // Users not notified if they have not read dashboard recently.
    dashboardNotReadUsersNotNotified: function(test) {
        test.expect(8);
        lmHelpers.create3LocMapUsersWithApnTokens(test, LocMapRestApi, testUserEmail1, testUserEmail2, testUserEmail3, function(userDatas) {
            IntervalNotifications.doIntervalNotifications(function(result) {
                test.equal(result, 0);
                test.equal(pushedNotifications.length, 0);
                test.done();
            });
        });
    }

};