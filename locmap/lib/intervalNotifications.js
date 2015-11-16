/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var db = require('../../lib/db');
var LocMapUserModel = require('./locMapUserModel');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();

var lockDBKey = 'intervalNotificationsLock';
var userPrefix = conf.get('db').userPrefix;

var IntervalNotifications = function () {
    var intervalNotifications = this;

    // Check if the user should receive a notification.
    this._userShouldReceiveNotification = function (user) {
        // Only existing active users should get notified.
        if (user.exists && user.data.activated) {
            // Only visible users should get notified.
            if (user.data.visibility) {
                // Users have not updated their location recently.
                if (locMapCommon.isLocationTimedout(user.data.location,
                        conf.get('locMapConfig').backgroundNotificationLocationAgeLimit)) {
                    // User has accessed their dashboard recently.
                    if (user.data.lastDashboardAccess >= Date.now() - (conf.get('locMapConfig').
                        backgroundNotificationUserActivityAgeLimit * 1000)) {
                        // APN and GCM users should get notified.
                        // WP8 client is not currently using notifications.
                        if (user.data.apnToken || user.data.gcmToken) {
                            return 0;
                        }
                        return 5;
                    }
                    return 4;
                }
                return 3;
            }
            return 2;
        }
        return 1;
    };

    this._processUser = function (user, callback) {
        var shouldReceive = intervalNotifications._userShouldReceiveNotification(user);
        if (shouldReceive === 0) {
            // TODO Could be optimized further by checking if user has contacts.
            user.sendNotLocalizedPushNotification('', undefined, true, false, function () {
                callback(shouldReceive);
            });
        } else {
            callback(shouldReceive);
        }
    };

    this._loopUsers = function (users, callback) {
        // Needs to have as many fields as the _userShouldReceiveNotification
        // method above has different results.
        var notify = [0, 0, 0, 0, 0, 0],
            counter = users.length,
            u;

        if (counter < 1) {
            callback(notify);
        }

        function processUser(user) {
            user.getData(function () {
                intervalNotifications._processUser(user, function (notifyResult) {
                    notify[notifyResult] += 1;
                    counter--;
                    user = null; // Preventing memory leaks.
                    if (counter < 1) {
                        return callback(notify);
                    }
                });
            });
        }

        for (u = 0; u < users.length; u += 1) {
            processUser(new LocMapUserModel(users[u].replace(userPrefix, '')));
        }
    };

    this._formatNotifyResultLogLine = function (notify) {
        return 'Skipped users; not active: ' + notify[1] + ' not visible: ' +
            notify[2] + ' recent location: ' + notify[3] +
            ' dashboard not accessed: ' + notify[4] +
            ' no ios/android token: ' + notify[5];
    };

    this.doIntervalNotifications = function (callback) {
        // Acquire lock for interval notification. Prevents multiple
        // processes/threads from running this at the same time.
        db.set(lockDBKey, 'lockvalue', 'NX', 'EX',
            conf.get('locMapConfig').backgroundNotificationInterval,
            function (error, result) {
                if (result === 'OK') {
                    logger.trace('INTERVALNOTIF: Acquired lock.');
                    var userCount = 0;
                    db.keys(userPrefix + '*', function (err, users) {
                        if (err) {
                            logger.error('Failed to get locmap users from db.');
                            callback(-1);
                        } else {
                            userCount = users.length;
                            intervalNotifications._loopUsers(users, function (notify) {
                                logger.trace('IntervalNotify sent ' + notify[0] +
                                    ' notifications. Checked ' + userCount + ' users. ' +
                                    intervalNotifications._formatNotifyResultLogLine(notify));
                                callback(notify[0]);
                            });
                        }
                    });
                } else {
                    logger.trace('INTERVALNOTIF: Failed to acquire lock.');
                    callback(undefined);
                }
            });
    };

};

module.exports = IntervalNotifications;
