/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
    Locmap user object and related methods.
*/
var db = require('../../lib/db');
var AppleNotification = require("../../lib/appleNotificationService");
var LocMapGoogleCloudMessagingService = require('./locMapGoogleCloudMessagingService');
var MicrosoftPushNotificationService = require('../../lib/microsoftPushNotificationService');
var locMapCommon = require('./locMapCommon');
var LocMapCommon = new locMapCommon();
var pendingNotifications = require('./pendingNotifications');
var PendingNotifications = new pendingNotifications();
var I18N = require('../../lib/i18n');
var i18n = new I18N();


var LocMapUserPrefix = "locmapusers:";
var jsonFields = ["visibility", "location", "activated", "accountRecoveryMode", "places", "lastVisibleNotification", "lastInvisibleNotification", "lastDashboardAccess"] // List of model fields that are JSON encoded.

var LocMapUserModel = function(userId) {
    this.data = {
        userId: userId,
        deviceId: "",
        email: "",
        visibility: true,
        location: {},
        battery: "",
        apnToken: "",
        gcmToken: "",
        wp8Url: "",
        authorizationToken: "",
        activated: false,
        accountRecoveryMode: 0,
        places: {},
        lastVisibleNotification: 0,
        lastInvisibleNotification: 0,
        lastDashboardAccess: 0,
        language: ""
    };

    this._serializeData = function (data) {
        var newData = {};
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                newData[key] = data[key];
            }
            if (jsonFields.indexOf(key) != -1) {
                try {
                    newData[key] = JSON.stringify(data[key]);
                }
                catch (error) {
                }
            }
        }
        return newData;
    };

    this.getData = function (callback) {
        var currentUser = this;
        db.hgetall(LocMapUserPrefix + this.data.userId, function (error, result) {
            if (result) { // Convert Data to JSON object. result = this._deserializeData(result);
                for (var key in result) {
                    try {
                        if (jsonFields.indexOf(key) !== -1) {
                            result[key] = JSON.parse(result[key]);
                        }
                    }
                    catch (error) {
                    }
                }
                result['userId'] = currentUser.data.userId;
                for (var key in result) {
                    currentUser.data[key] = result[key];
                }
                //currentUser.data = result;
                currentUser.exists = true;
            }
            else {
                result = 404;
                currentUser.exists = false;
            } // Return NOT found code.}
            callback(result);
        });
    };

    this.setData = function (callback, data) {
        var currentUser = this;
        if (data !== null) {
            for (var key in data) {
                if (key !== 'userId') { // Don't overwrite the userId -even if pushed in the object-
                    currentUser.data[key] = data[key];
                }
            }
        }

        var serializedData = currentUser._serializeData(currentUser.data);
        db.hmset(LocMapUserPrefix + currentUser.data.userId, serializedData, function (error, result) {
            if (error) {
                result = 400;
                console.log("Error setting user data: " + error);
            }
            else {
                currentUser.exists = true;
            }
            callback(result);
        });
    };

    this.setFields = function(data, callback) {
        var currentUser = this;
        if (data !== null) {
            var serializedData = currentUser._serializeData(data);
            db.hmset(LocMapUserPrefix + currentUser.data.userId, serializedData, function(error, result) {
                if (error) {
                    result = 400;
                    console.log("Error setting user data fields: " + error);
                }
                callback(result);
            });
        } else {
            console.log("No data given to setFields!");
            callback(400);
        }
    };

    //TODO test
    // token is either {apn:"token"} or {gcm:"token"} or {wp8: "url"}. if these are missing then clears tokens
    this.setPushNotificationToken = function(token, callback) {
        var currentUser = this;
        currentUser.getData(function (result) {
            if (currentUser.exists) {
                currentUser.data.apnToken = "";
                currentUser.data.gcmToken = "";
                currentUser.data.wp8Url = "";
                if (token.apn !== undefined) {
                    //console.log("Storing apn token " + token.apn + " for user " + currentUser.data.userId);
                    currentUser.data.apnToken = token.apn;
                } else if (token.gcm !== undefined) {
                    //console.log("Storing gcm token " + token.gcm + " for user " + currentUser.data.userId);
                    currentUser.data.gcmToken = token.gcm;
                } else if (token.wp8 !== undefined) {
                    //console.log("Storing wp8 token " + token.wp8 + " for user " + currentUser.data.userId);
                    currentUser.data.wp8Url = token.wp8;
                }
                currentUser.setData(function(result) {
                    callback(result);
                }, null);
            } else {
                callback(result);
            }
        });
    };

    var extractTokens = function(userData) {
        var tokens = {};
        if (userData.apnToken || userData.gcmToken || userData.wp8Url) {
            if (userData.apnToken) {
                tokens.apn = userData.apnToken;
            } else if (userData.gcmToken) {
                tokens.gcm = userData.gcmToken;
            } else {
                tokens.wp8Url = userData.wp8Url;
            }
            return tokens;
        };
        return undefined;
    };

    // returns tokens for apple and google in format: {apn: "token"} or {gcm: "token"} or just undefined if no tokens assigned
    this.getPushNotificationTokens = function(callback) {
        if (this.exists) {
            return callback(extractTokens(this.data));
        }
        var currentUser = this;
        currentUser.getData(function (result) {
            if (currentUser.exists) {
                callback(extractTokens(currentUser.data));
            } else {
                callback(undefined);
            }
        });
    };

    // sends push notification without trying to localize it.
    // you can provide payload for message in 'payload' variable which must be an object or undefined
    this.sendNotLocalizedPushNotification = function(text, payload, silent, addPending, callback) {
        var that = this;
        this.getPushNotificationTokens(function(tokens) {
            if (tokens && tokens.apn) {
                //console.log("Sending APN notification for user " + that.data.userId);
                var appleNotification = new AppleNotification();
                appleNotification.pushNotification(tokens.apn, text, payload, silent);
                that._updateLastSentNotification(silent, addPending, "APN", callback);
            } else if (tokens && tokens.gcm) {
                //console.log("Sending GCM notification for user " + that.data.userId);
                var googleNotification = new LocMapGoogleCloudMessagingService();
                googleNotification.pushNotification(tokens.gcm, text, payload);
                that._updateLastSentNotification(silent, addPending, "GCM", callback);
            } else if (tokens && tokens.wp8Url && tokens.wp8Url.length > 2) {
                //console.log("Sending WP8 notification for user " + that.data.userId);
                var ms = new MicrosoftPushNotificationService();
                ms.pushNotification(tokens.wp8Url, text, payload);
                that._updateLastSentNotification(silent, addPending, "WP8", callback);
            } else {
                console.log("No token found, not sending notification for user " + that.data.userId);
            }
        });
    };

    // Localized version of the push notification sending. Includes optional callback for easier testability.
    this.sendLocalizedPushNotification = function(textKey, callback, par1, val1, par2, val2, par3, val3) {
        var that = this;
        this.getPushNotificationTokens(function(tokens) {
            var lang = LocMapCommon.verifyLangCode(that.data.language);
            var text = i18n.getLocalizedString(lang, textKey, par1, val1, par2, val2, par3, val3);
            if (tokens && tokens.apn) {
                //console.log("Sending visible APN notification for user " + that.data.userId);
                var appleNotification = new AppleNotification();
                appleNotification.pushNotification(tokens.apn, text, undefined, false);
                that._updateLastSentNotification(false, false, "localized APN", callback);
            } else if (tokens && tokens.gcm) {
                //console.log("Sending visible GCM notification for user " + that.data.userId);
                var googleNotification = new LocMapGoogleCloudMessagingService();
                googleNotification.pushNotification(tokens.gcm, text);
                that._updateLastSentNotification(false, false, "localized GCM", callback);
            } else if (tokens && tokens.wp8Url && tokens.wp8Url.length > 2) {
                //console.log("Sending visible WP8 notification for user " + that.data.userId);
                var ms = new MicrosoftPushNotificationService();
                ms.pushNotification(tokens.wp8Url, text);
                that._updateLastSentNotification(false, false, "localized WP8", callback);
            } else {
                console.log("No token found, not sending notification for user " + that.data.userId);
            }
        });
    };

    // Updates the timestamp for last sent notification on this user object.
    // Also adds a new pending notification if the notification was silent.
    // Works only on fully initialized user object.
    this._updateLastSentNotification = function(silent, addPending, type, callback) {
        var that = this;
        var notifyData = {};
        if (silent) {
            notifyData['lastInvisibleNotification'] = Date.now();
        } else {
            notifyData['lastVisibleNotification'] = Date.now();
        }
        // Don't log notifications for intervalnotifications, too much spam..
        if (!silent || addPending) {
            console.log("Sending " + type + " notification to user " + that.data.userId);
        }

        this.setFields(notifyData, function(setResult) {
            if (addPending) {
                PendingNotifications.addNewNotification(that.data.userId, function(addResult) {
                    if (!addResult) {
                        console.log("ERROR Failed to add pending notification for user " + that.data.userId);
                    }
                    if (callback !== undefined) {
                        callback(setResult);
                    }
                });
            } else {
                if (callback !== undefined) {
                    callback(setResult);
                }
            }
        });
    };

    // must be called on initialized user
    this._generateAuthToken = function() {
        console.log("Generating authtoken for " + this.data.userId);
        if (!this.exists) {
            console.log("User does not exist!");
            return;
        }

        if (this.data.authorizationToken.length < 1) {
            this.data.authorizationToken = "";
            var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for(var i = 0; i < 10; i++ )
                this.data.authorizationToken += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        console.log("authtoken: " + this.data.authorizationToken);
    };

    // Returns boolean true/false for device id match.
    // Works only on fully initialized user object.
    this.isMatchingDeviceId = function(deviceId) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log("Checking device id on uninitialized user! Id: " + currentUser.data.userId);
            return false;
        }
        var hashedDeviceId = LocMapCommon.getSaltedHashedId(deviceId);
        if (typeof currentUser.data.deviceId == "string" && currentUser.data.deviceId.length > 0 && hashedDeviceId === currentUser.data.deviceId) {
            return true;
        } else {
            return false;
        }
    };

    this.setLocationAndBattery = function(location, battery, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log("Setting location to uninitialized user! Id: " + currentUser.data.userId);
            callback(400);
            return;
        }
        currentUser.setFields({location: location, battery: battery}, callback);
    };

    this.setVisibility = function(visibility, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log("Setting visibility to uninitialized user! Id: " + currentUser.data.userId);
            callback(400);
            return;
        }
        currentUser.setFields({visibility: visibility}, callback);
    };

    this.setLanguage = function(language, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log("Setting language to uninitialized user! Id: " + currentUser.data.userId);
            callback(400);
            return;
        }
        currentUser.setFields({language: language}, callback);
    };

    this.setAccountRecoveryMode = function(recoveryMode, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log("Setting account recovery mode to uninitialized user! Id: " + currentUser.data.userId);
            callback(400);
            return;
        }
        currentUser.setFields({accountRecoveryMode: recoveryMode, authorizationToken: ""}, callback);
    };

    this.setLastDashboardRead = function(callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log("Setting last dashboard read timestamp to uninitialized user! Id: " + currentUser.data.userId);
            callback(400);
            return
        }
        currentUser.setFields({lastDashboardAccess: Date.now()}, callback);
    }

};

module.exports = LocMapUserModel;