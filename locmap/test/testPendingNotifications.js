/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 Test file: Recovery code API methods.
 */
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");
var pendingNotifications = require("../lib/pendingNotifications");
var PendingNotifications = new pendingNotifications();

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    createAndCheckPendingNotification: function(test) {
        test.expect(2);
        PendingNotifications.addNewNotification("user1", function(result) {
            test.equal(result, true, "Failed to add new notification.");
            // Negative timeout makes sure we get even the new items.
            PendingNotifications.getTimedOutNotifications(-1, function(notificationResults) {
                test.equal(notificationResults.length, 1);
                test.done();
            });
        });
    },

    checkEmptyNotifications: function(test) {
        test.expect(1);
        PendingNotifications.getTimedOutNotifications(1, function(results) {
            test.deepEqual(results, []);
            test.done();
        });
    },

    createAndCheckMultiplePendingNotifications: function(test) {
        test.expect(3);
        PendingNotifications.addNewNotification("user1", function(result) {
            test.equal(result, true, "Failed to add new notification.");
            PendingNotifications.addNewNotification("user2", function(result) {
                test.equal(result, true, "Failed to add new notification.");
                // Negative timeout makes sure we get even the new items.
                PendingNotifications.getTimedOutNotifications(-1, function(notificationResults) {
                    test.equal(notificationResults.length, 2);
                    test.done();
                });
            });
        });
    },

    leaveNotTimedOutNotification: function(test) {
        test.expect(3);
        PendingNotifications.addNewNotification("user1", function(result) {
            test.equal(result, true, "Failed to add new notification.");
            PendingNotifications.getTimedOutNotifications(60, function(notificationResults) {
                test.deepEqual(notificationResults, []);
                PendingNotifications.getTimedOutNotifications(-1, function(notificationResults) {
                    test.equal(notificationResults.length, 1);
                    test.done();
                });
            });
        });
    }

};
