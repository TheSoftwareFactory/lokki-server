/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
    Helper methods for appending new entries to pending notifications list and checking and removing them.
 */
var db = require('../../lib/db');

var pendingNotificationsDBKey = "pendingNotificationsList";

// Verify the notification result and return de-JSONized object if we got a valid one, null otherwise.
var verifyResult = function(result) {
    //console.log("Res: " + JSON.stringify(result));
    var entry = null;
    // Getting range results in a list containing JSONized object, popping does not have a list.
    if (typeof result === "object" && result.length == 1) {
        var entry = result[0];
    } else if (typeof result === "string") {
        var entry = result;
    }
    if (entry !== null) {
        try {
            entry = JSON.parse(entry);
            //console.log("JSON parse ok.");
            //console.log("ts " + entry["timestamp"] + " uid " + entry["userId"]);
            if (typeof entry === "object" && entry.hasOwnProperty("timestamp") && entry.hasOwnProperty("userId")) {
                return entry;
            }
        } catch (exc) {
            console.log("ERROR: Pending notification JSON parse failed.");
        }
    }
    //console.log("DEBUG VERIFYRESULT No result or invalid result");
    return null;
};

var pendingNotifications = function() {
    var pendingNotif = this;

    // Add a new notification to the pending check list.
    this.addNewNotification = function(userId, callback) {
        // New notifications are put to the beginning of the Redis list.
        var notificationObject = {timestamp: Date.now(), userId: userId};
        db.lpush(pendingNotificationsDBKey, JSON.stringify(notificationObject), function(error, result) {
            if (error || result < 1) {
                callback(false);
            } else {
                callback(true);
            }
        });
    };

    this._checkLastNotification = function(timeout, callback) {
        // Oldest notifications are read from the end of the Redis list.
        // Peek at the last element on the list to see if it has already passed given timeout.
        db.lrange(pendingNotificationsDBKey, -1, -1, function(error, result) {
            if (error) {
                console.log("ERROR: Failed to read the last key on pending notifications list with error " + error);
                callback(undefined);
            } else {
                var res = verifyResult(result);
                if (res !== null) {
                    // Check timestamp.
                    var now = Date.now();
                    if (res.timestamp + timeout*1000 <= now) {
                        db.rpop(pendingNotificationsDBKey, function(error, popResult) {
                            if (error) {
                                console.log("ERROR: Failed to pop the last key on pending notifications list with error " + error);
                                callback(undefined);
                            } else {
                                var popRes = verifyResult(popResult);
                                if (popRes !== null) {
                                    if (popRes.timestamp + timeout*1000 <= now) {
                                        callback(popRes);
                                    } else {
                                        console.log("ERROR: Pending notification entry had too new timestamp, discarding.");
                                        callback(undefined);
                                    }
                                } else {
                                    console.log("ERROR: Pending notification entry was not valid.");
                                    callback(undefined);
                                }
                            }
                        });
                    } else {
                        //console.log("DEBUG CHECKLATESTNOTIF Timeout not passed for " + JSON.stringify(res));
                        callback(null);
                    }
                } else {
                    //console.log("Verify result failed, null");
                    callback(null);
                }
            }
        });
    };

    // Helper method for looping based on the result of previous call.
    this._checkNotificationsLoop = function(timeout, resultsList, callback) {
        pendingNotif._checkLastNotification(timeout, function(result) {
            if (result !== null && result !== undefined) {
                resultsList.push(result);
                pendingNotif._checkNotificationsLoop(timeout, resultsList, callback);
            } else {
               callback(resultsList);
            }
        });
    };

    // Check the oldest notification from the queue and pop & return if it has passed the timeout period.
    // Returns the notification objects in a list. Empty list if no notifications were found.
    // NOTE: Is not thread safe, don't use simultaneously from multiple threads/processes!
    this.getTimedOutNotifications = function(timeout, callback) {
        var results = [];
        pendingNotif._checkNotificationsLoop(timeout, results, function(res) {
            callback(results);
        });
    };

};

module.exports = pendingNotifications;