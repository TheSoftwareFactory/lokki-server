/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Test file: Recovery code API methods.
 */

var PendingNotifications = require('../lib/pendingNotifications');
var pendingNotifications = new PendingNotifications();

module.exports = {
    setUp: function(callback) {
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function() {
            callback();
        });
    },

    createAndCheckPendingNotification: function(test) {
        test.expect(2);
        pendingNotifications.addNewNotification('user1', function(result) {
            test.equal(result, true, 'Failed to add new notification.');
            // Negative timeout makes sure we get even the new items.
            pendingNotifications.getTimedOutNotifications(-1, function(notificationResults) {
                test.equal(notificationResults.length, 1);
                test.done();
            });
        });
    },

    checkEmptyNotifications: function(test) {
        test.expect(1);
        pendingNotifications.getTimedOutNotifications(1, function(results) {
            test.deepEqual(results, []);
            test.done();
        });
    },

    createAndCheckMultiplependingNotifications: function(test) {
        test.expect(3);
        pendingNotifications.addNewNotification('user1', function(result) {
            test.equal(result, true, 'Failed to add new notification.');
            pendingNotifications.addNewNotification('user2', function(result2) {
                test.equal(result2, true, 'Failed to add new notification.');
                // Negative timeout makes sure we get even the new items.
                pendingNotifications.getTimedOutNotifications(-1, function(notificationResults) {
                    test.equal(notificationResults.length, 2);
                    test.done();
                });
            });
        });
    },

    leaveNotTimedOutNotification: function(test) {
        test.expect(3);
        pendingNotifications.addNewNotification('user1', function(result) {
            test.equal(result, true, 'Failed to add new notification.');
            pendingNotifications.getTimedOutNotifications(60, function(notificationResults) {
                test.deepEqual(notificationResults, []);
                pendingNotifications.getTimedOutNotifications(-1, function(notificationResults2) {
                    test.equal(notificationResults2.length, 1);
                    test.done();
                });
            });
        });
    }

};
