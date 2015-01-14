/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var LocMapUserModel = require('./locMapUserModel');
var LocMapSharingModel = require('./locationShareModel');
var LocMapCrashReports = require('./crashReports');
var locMapCrashReports = new LocMapCrashReports();
var LocMapConfig = require('./locMapConfig');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();
var db = require('../../lib/db');

var check = require('validator').check;

var LocMapAdminApi = function() {
    var locMapAdminApi = this;

    this.adminGetCrashReports = function(osType, year, month, callback) {
        if (osType !== 'android' && osType !== 'ios' && osType !== 'wp') {
            callback(400, 'Invalid os type.');
            // TODO probably return;
        }
        locMapCrashReports.getMonth(osType, year, month, function(status, result) {
            callback(status, result);
        });
    };

    this.adminSetAccountToRecoveryMode = function(emailObj, callback) {
        if (typeof emailObj !== 'object' || typeof emailObj.email !== 'string') {
            callback(400);
            return;
        }
        var targetEmail = emailObj.email;
        try {
            check(targetEmail).isEmail();
        } catch (e) {
            console.log('Admin account recovery mode attempted on invalid email: ' + targetEmail);
            callback(400);
            return;
        }
        if (LocMapConfig.adminAccountRecoveryAllowedEmails.indexOf(targetEmail) === -1) {
            console.log('Admin account recovery mode attempted on non-allowed email: ' + targetEmail);
            callback(401);
            return;
        }
        var userId = locMapCommon.getSaltedHashedId(targetEmail);
        var user = new LocMapUserModel(userId);
        user.getData(function() {
            if (user.exists) {
                user.setAccountRecoveryMode(Date.now(), function(result) {
                    console.log('Admin setting account ' + targetEmail + ' to account recovery mode.');
                    callback(locMapCommon.statusFromResult(result), result);
                });
            } else {
                callback(404);
            }
        });
    };

    // Returns how many days ago the timestamp is. Returns "never" for invalid or 0, for valid timestamps 0-31 or "older"
    this._timestampDaysAgo = function(timestamp) {
        var currDate = Date.now();
        var daysAgo = 'never';
        if (typeof timestamp === 'number' && timestamp > 0) {
            var timeDiff = (currDate - (+timestamp));
            if (timeDiff < 0) {
                daysAgo = 'future';
            } else {
                daysAgo = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
                if (daysAgo > 31) {
                    daysAgo = 'older';
                }
            }
        }
        return daysAgo;
    };

    this._addUserStats = function(user, stats) {
        if (!user.exists) {
            return;
        }

        if (user.data.activated) { // Real signed in user.
            stats.activatedAccounts += 1;
            // Get platform by checking used notification token.
            if (user.data.apnToken !== '') {
                stats.activatedUsersByPlatform.ios += 1;
            } else if (user.data.gcmToken !== '') {
                stats.activatedUsersByPlatform.android += 1;
            } else if (user.data.wp8Url !== '') {
                stats.activatedUsersByPlatform.wp8 += 1;
            } else {
                stats.activatedUsersByPlatform.noToken += 1;
            }
            // Get visibility status.
            if (user.data.visibility) {
                stats.activatedUsersByVisibility.visible += 1;
            } else {
                stats.activatedUsersByVisibility.invisible += 1;
            }
        } else { // Stub user, invited but not signed in
            stats.invitePendingAccounts += 1;
        }

        var lastDashBoardAccessDaysAgo = 'never';
        if (user.data.lastDashboardAccess) {
            lastDashBoardAccessDaysAgo = this._timestampDaysAgo(user.data.lastDashboardAccess);
        }
        stats.userDashboardAccessSince[lastDashBoardAccessDaysAgo] += 1;

        var lastReportedDaysAgo = 'never';
        if (user.data.location && user.data.location.time) {
            lastReportedDaysAgo = this._timestampDaysAgo(user.data.location.time);
        }
        stats.userLocationUpdatedSince[lastReportedDaysAgo] += 1;
        return;
    };

    this._addUserShareStats = function(userShare, stats) {
        if (!userShare.exists) {
            stats.contactsPerActivatedUser.never += 1;
            return;
        }

        var contactCount = userShare.data.canSeeMe.length;
        if (contactCount > 20) {
            stats.contactsPerActivatedUser.more += 1;
        } else {
            stats.contactsPerActivatedUser[contactCount] += 1;
        }
        return;
    };

    this._processUsersSharingStats = function(users, stats, callback) {
        var counter = users.length;
        if (counter < 1) {
            callback();
        }

        function addUserShareStats(userShare) {
            userShare.getData(function() {
                locMapAdminApi._addUserShareStats(userShare, stats);
                counter--;
                if (counter < 1) {
                    return callback();
                }
            });
        }

        for (var u in users) {
            var userId = users[u];
            userId = userId.replace('locmapusers:', '');
            addUserShareStats(new LocMapSharingModel(userId));
        }
    };

    this._processUsersStats = function(users, stats, callback) {
        stats.totalAccounts = users.length;

        var counter = users.length;
        if (counter < 1) {
            callback();
        }

        function addUserStats(user) {
           user.getData(function() {
                locMapAdminApi._addUserStats(user, stats);
                counter--;
                user = null; // Preventing memory leaks.
                if (counter < 1) {
                    return callback();
                }
            });
        }

        for (var u in users) {
            var userId = users[u];
            userId = userId.replace('locmapusers:', '');

            // put user into closure
            addUserStats(new LocMapUserModel(userId));
        }
    };

    this.adminGetStats = function(callback) {
        var statsStruct = locMapCommon.getDefaultStatsDict();
        db.keys('locmapusers:*', function(err, users) {
            if (err) {
                console.log('Failed to get locmap users from db.');
                callback(500, statsStruct);
                return;
            }
            locMapAdminApi._processUsersStats(users, statsStruct, function() {
                locMapAdminApi._processUsersSharingStats(users, statsStruct, function() {
                    // Tweak to adjust contactsPerActivatedUser to have only active user stats.
                    statsStruct.contactsPerActivatedUser[0] -= statsStruct.invitePendingAccounts;
                    callback(200, statsStruct);
                });
            });
        });
    };
};

module.exports = LocMapAdminApi;
