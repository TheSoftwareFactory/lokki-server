/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var db = require('../../lib/db');
var LocMapConfig = require('./locMapConfig');
var LocMapUserModel = require('./locMapUserModel');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();

var lockDBKey = 'intervalNotificationsLock';

var IntervalNotifications = function() {
    var intervalNotifications = this;

    // Check if the user should receive a notification.
    this._userShouldReceiveNotification = function(user) {
        // Only existing active users should get notified.
        if (user.exists && user.data.activated) {
            // Only visible users should get notified.
            if (user.data.visibility) {
                // Users have not updated their location recently.
                if (locMapCommon.isLocationTimedout(user.data.location, LocMapConfig.backgroundNotificationLocationAgeLimit)) {
                    // User has accessed their dashboard recently.
                    if (user.data.lastDashboardAccess >= Date.now() - (LocMapConfig.backgroundNotificationUserActivityAgeLimit * 1000)) {
                        // APN and GCM users should get notified. WP8 client is not currently using notifications.
                        if (user.data.apnToken || user.data.gcmToken) {
                            return 0;
                        } else {
                            return 5;
                        }
                    } else {
                        return 4;
                    }
                } else {
                    return 3;
                }
            } else {
                return 2;
            }
        } else {
            return 1;
        }
    };

    this._processUser = function(user, callback) {
        var shouldReceive = intervalNotifications._userShouldReceiveNotification(user);
        if (shouldReceive === 0) {
            // TODO Could be optimized further by checking if user has contacts.
            user.sendNotLocalizedPushNotification('', undefined, true, false, function() {
                callback(shouldReceive);
            });
        } else {
            callback(shouldReceive);
        }
    };

    this._loopUsers = function(users, callback) {
        // Needs to have as many fields as the _userShouldReceiveNotification method above has different results.
        var notifyResults = [0, 0, 0, 0, 0, 0];

        var counter = users.length;
        if (counter < 1) {
            callback(notifyResults);
        }

        function processUser(user) {
            user.getData(function() {
                intervalNotifications._processUser(user, function(notifyResult) {
                    notifyResults[notifyResult] += 1;
                    counter--;
                    user = null; // Preventing memory leaks.
                    if (counter < 1) {
                        return callback(notifyResults);
                    }
                });
            });
        }

        for (var u in users) {
            var userId = users[u];
            userId = userId.replace('locmapusers:', '');
            processUser(new LocMapUserModel(userId));
        }
    };

    this._formatNotifyResultLogLine = function(notifyResults) {
        return 'Skipped users; not active: ' + notifyResults[1] + ' not visible: ' + notifyResults[2] + ' recent location: ' + notifyResults[3] + ' dashboard not accessed: ' + notifyResults[4] + ' no ios/android token: ' + notifyResults[5];
    };

    this.doIntervalNotifications = function(callback) {
        // Acquire lock for interval notification. Prevents multiple processes/threads from running this at the same time.
        db.set(lockDBKey, 'lockvalue', 'NX', 'EX', LocMapConfig.backgroundNotificationInterval, function(error, result) {
            if (result === 'OK') {
                // console.log("DEBUG: INTERVALNOTIF: Acquired lock.");
                var userCount = 0;
                db.keys('locmapusers:*', function(err, users) {
                    if (err) {
                        console.log('ERROR: Failed to get locmap users from db.');
                        callback(-1);
                    } else {
                        userCount = users.length;
                        intervalNotifications._loopUsers(users, function(notifyResults) {
                            console.log('IntervalNotify sent ' + notifyResults[0] + ' notifications. Checked ' + userCount + ' users. ' + intervalNotifications._formatNotifyResultLogLine(notifyResults));
                            callback(notifyResults[0]);
                        });
                    }
                });
            } else {
                // console.log("DEBUG: INTERVALNOTIF: Failed to acquire lock.");
                callback(undefined);
            }
        });
    };

};

module.exports = IntervalNotifications;
