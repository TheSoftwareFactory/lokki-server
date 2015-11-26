/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var lmHelpers = require('../test_helpers/locMapHelpers');
var LocMapRestAPI = require('../lib/locMapRESTAPI');
var locMapRestAPI = new LocMapRestAPI();
var IntervalNotifications = require('../lib/intervalNotifications');
var intervalNotifications = new IntervalNotifications();

var AppleNotification = require('../../lib/appleNotificationService');

// data from mocked pushNotification in format:
// [{token: token, text: text}, {token2: token2, text2: text2}]
var pushedNotifications = [];

// mock it to verify that we send notifications
AppleNotification.prototype.pushNotification = function (deviceToken, notificationText, _payload) {
    var notif = {
        token: deviceToken,
        text: notificationText
    };
    if (_payload) {
        notif.payload = _payload;
    }
    pushedNotifications.push(notif);
};

var testUserEmail1 = 'user1@example.com.invalid';
var testUserEmail2 = 'user2@example.com.invalid';
var testUserEmail3 = 'user3@example.com.invalid';
var testStubUser = 'testuser@fi.invalid';


function compareTokens(a, b) {
    if (a.token < b.token) {
        return -1;
    }
    if (a.token > b.token) {
        return 1;
    }
    return 0;
}


module.exports = {
    setUp: function (callback) {
        pushedNotifications = [];
        var dbSetup = require('../../test_helpers/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    usersAreNotified: function (test) {
        test.expect(15);
        lmHelpers.create3LocMapUsersWithApnTokens(test, locMapRestAPI, testUserEmail1,
            testUserEmail2, testUserEmail3, function (userDatas) {
                lmHelpers.getCacheAndDashboardFor3LocMapUsers(test, locMapRestAPI, userDatas[0].id,
                    userDatas[1].id, userDatas[2].id, function () {
                        intervalNotifications.doIntervalNotifications(function (result) {
                            test.equal(result, 3,
                                'Function did not report correct number of notifications sent.');
                            test.equal(pushedNotifications.length, 3,
                                'Correct number of notifications was not sent.');

                            // TODO Result might change due to timing issues
                            test.deepEqual(pushedNotifications.slice(0).sort(compareTokens),
                                [{token: 'token1', text: ''},
                                    {token: 'token2', text: ''}, {token: 'token3', text: ''}]);
                            test.done();
                        });
                    });
            });
    },

    userWithRecentLocationNotNotified: function (test) {
        test.expect(16);
        lmHelpers.create3LocMapUsersWithApnTokens(test, locMapRestAPI, testUserEmail1,
            testUserEmail2, testUserEmail3, function (userDatas) {
                lmHelpers.getCacheAndDashboardFor3LocMapUsers(test, locMapRestAPI, userDatas[0].id,
                    userDatas[1].id, userDatas[2].id, function (cacheDash) {
                        locMapRestAPI.changeUserLocation(userDatas[0].id, cacheDash[0].cache,
                            lmHelpers.locMapReport1, function (res) {
                                test.equal(res, 200, 'Location update failed.');
                                intervalNotifications.doIntervalNotifications(function (result) {
                                    test.equal(result, 2,
                                        'Function did not report correct number ' +
                                        'of notifications sent.');
                                    test.equal(pushedNotifications.length, 2,
                                        'Correct number of notifications was not sent.');
                                    // TODO Result order might change due to timing issues
                                    test.deepEqual(pushedNotifications.slice(0).sort(compareTokens),
                                        [{token: 'token2', text: ''}, {token: 'token3', text: ''}]);
                                    test.done();
                                });
                            });
                    });
            });
    },

    usersWithoutTokenNotNotified: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, locMapRestAPI, testUserEmail1, 'dev1',
            function (userData) {
                lmHelpers.getCacheWithUser(test, locMapRestAPI, userData.id, function (cache) {
                    locMapRestAPI.getUserDashboard(userData.id, cache, function (status) {
                        test.equal(status, 200);
                        intervalNotifications.doIntervalNotifications(function (result) {
                            test.equal(result, 0,
                                'Function did not report correct number of notifications sent.');
                            test.equal(pushedNotifications.length, 0,
                                'Correct number of notifications was not sent.');
                            test.done();
                        });
                    });
                });
            });
    },

    invisibleUsersNotNotified: function (test) {
        test.expect(18);
        lmHelpers.create3LocMapUsersWithApnTokens(test, locMapRestAPI, testUserEmail1,
            testUserEmail2, testUserEmail3, function (userDatas) {
                lmHelpers.getCacheAndDashboardFor3LocMapUsers(test, locMapRestAPI, userDatas[0].id,
                    userDatas[1].id, userDatas[2].id, function (cacheDash) {
                        locMapRestAPI.setUserVisibility(userDatas[0].id, cacheDash[0].cache,
                            {visibility: false}, function (visResult1) {
                                test.equal(visResult1, 200);
                                lmHelpers.getCacheWithUser(test, locMapRestAPI, userDatas[1].id,
                                    function (cache2) {
                                        locMapRestAPI.setUserVisibility(userDatas[1].id, cache2,
                                            {visibility: false}, function (visResult2) {
                                                test.equal(visResult2, 200);
                                                intervalNotifications.doIntervalNotifications(
                                                    function (result) {
                                                        test.equal(result, 1,
                                                            'Function did not report correct ' +
                                                            'number of notifications sent.');
                                                        test.equal(pushedNotifications.length, 1,
                                                            'Correct number of notifications was ' +
                                                            'not sent.');
                                                        test.deepEqual(pushedNotifications,
                                                            [{token: 'token3', text: ''}]);
                                                        test.done();
                                                    }
                                                );
                                            });
                                    });
                            });
                    });
            });
    },

    inactiveUsersNotNotified: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, locMapRestAPI, testUserEmail1, 'dev1',
            function (userData) {
                var targetUsers = {emails: [testStubUser]};
                lmHelpers.getCacheWithUser(test, locMapRestAPI, userData.id, function (cache) {
                    locMapRestAPI.allowToSeeUserLocation(userData.id, cache, targetUsers,
                        function (allowRes) {
                            test.equal(allowRes, 200);
                            intervalNotifications.doIntervalNotifications(function (result) {
                                test.equal(result, 0,
                                    'Function did not report correct ' +
                                    'number of notifications sent.');
                                test.equal(pushedNotifications.length, 0,
                                    'Correct number of notifications was not sent.');
                                test.done();
                            });
                        });
                });
            });
    },

    // Verify that calling doIntervalNotifications uses lock
    // that prevents multiple calls within timeout.
    doIntervalNotificationsLocking: function (test) {
        test.expect(2);
        intervalNotifications.doIntervalNotifications(function (result1) {
            test.equal(result1, 0);
            intervalNotifications.doIntervalNotifications(function (result2) {
                test.equal(result2, undefined);
                test.done();
            });
        });
    },

    // Users not notified if they have not read dashboard recently.
    dashboardNotReadUsersNotNotified: function (test) {
        test.expect(8);
        lmHelpers.create3LocMapUsersWithApnTokens(test, locMapRestAPI, testUserEmail1,
            testUserEmail2, testUserEmail3, function () {
                intervalNotifications.doIntervalNotifications(function (result) {
                    test.equal(result, 0);
                    test.equal(pushedNotifications.length, 0);
                    test.done();
                });
            });
    }

};
