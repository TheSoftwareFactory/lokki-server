/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Locmap location sharing models.
 */

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var db = require('../../lib/db');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();

var LocMapUserPrefix = 'locmapsharemodel:';

var jsonFields = ['canSeeMe', 'ICanSee', 'ignored']; // List of model fields that are JSON encoded.

var LocMapSharingModel = function(userId) {
    this.data = {
        userId: userId,
        canSeeMe: [],
        ICanSee: [],
        ignored: []
    };

    this._serializeData = function(data) {
        var newData = {};
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                newData[key] = data[key];
            }
            if (jsonFields.indexOf(key) !== -1) {
                try {
                    newData[key] = JSON.stringify(data[key]);
                } catch (error) {
                    logger.error('Error while serializing location sharing data: ' + error);
                }
            }
        }
        return newData;
    };

    this.getData = function(callback) {
        var currentUser = this;
        db.hgetall(LocMapUserPrefix + this.data.userId, function(error, result) {
            if (result) { // Convert Data to JSON object. result = this._deserializeData(result);
                for (var key in result) {
                    try {
                        if (jsonFields.indexOf(key) !== -1) {
                            result[key] = JSON.parse(result[key]);
                        }
                    } catch (e) {
                        logger.error('Error while getting location sharing data: ' + e);
                    }
                }
                result.userId = currentUser.data.userId;
                currentUser.data = result;
                currentUser.exists = true;
            } else {
                result = 404;
                currentUser.exists = false;
            }
            callback(result);
        });
    };

    /** Sets and saves the data of this locShare
    @param callback Callback function
    @param data     The data values to set in this locShare (see: this.data)
    Callback param  "OK" if successful, else error code
    */
    this.setData = function(callback, data) {
        var currentUser = this;
        if (data !== null) {
            for (var key in data) {
                if (key !== 'userId') { // Don't overwrite the userId -even if pushed in the object-
                    currentUser.data[key] = data[key];
                }
            }
        }

        var serializedData = currentUser._serializeData(currentUser.data);
        db.hmset(LocMapUserPrefix + currentUser.data.userId, serializedData, function(error, result) {

            if (error) {
                result = 400;
                logger.error('Error setting user data: ' + error);
            } else {
                currentUser.exists = true;
            }
            callback(result);
        });
    };

    this.allowOtherUser = function(otherUserId, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            logger.trace('Setting allowOtherUser to uninitialized locationShare! Id: ' + currentUser.data.userId);
            callback(400);
            return;
        }
        if (currentUser.data.canSeeMe.length >= conf.get('locMapConfig').maxAllowToSeeCount) {
            logger.trace('User ' + currentUser.data.userId + ' tried to allow other users beyond limit!');
            callback(403);
            return;
        }

        currentUser.data.canSeeMe = locMapCommon.addUniqueItemToArray(currentUser.data.canSeeMe, otherUserId);
        currentUser.setData(callback, null);
    };

    this.denyOtherUser = function(otherUserId, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            logger.trace('Setting denyOtherUser to uninitialized locationShare! Id: ' + currentUser.data.userId);
            callback(400);
            return;
        }
        currentUser.data.canSeeMe = locMapCommon.removeItemFromArray(currentUser.data.canSeeMe, otherUserId);
        currentUser.setData(callback, null);
    };

    this.addUserICanSee = function(otherUserId, callback) {
        var currentUser = this;

        currentUser.data.ICanSee = locMapCommon.addUniqueItemToArray(currentUser.data.ICanSee, otherUserId);
        currentUser.setData(callback, null);
    };

    this.removeUserICanSee = function(otherUserId, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            logger.trace('Setting addUserICanSee to uninitialized locationShare! Id: ' + currentUser.data.userId);
            callback(400);
            return;
        }

        currentUser.data.ICanSee = locMapCommon.removeItemFromArray(currentUser.data.ICanSee, otherUserId);
        currentUser.setData(callback, null);
    };

    /** Adds a user to logged in user's ignore list
    @param otherUserId  Encrypted ID of the user to be blocked
    @param callback     Callback function
    Callback param      "OK" if ignoring successful, else error code
    */
    this.ignoreOtherUser = function(otherUserId, callback) {
        var currentUser = this;

        currentUser.data.ignored = locMapCommon.addUniqueItemToArray(currentUser.data.ignored, otherUserId);
        currentUser.setData(callback, null)
    }

    /** Removes a user from the logged in user's ignore list
    @param otherUserId  Encrypted ID of the user to be unblocked
    @param callback     Callback function
    Callback param      "OK" if ignoring successful, else error code
    */
    this.showOtherUser = function(otherUserId, callback) {
        var currentUser = this;

        if (!currentUser.exists) {
            logger.trace('Setting ignored user to uninitialized locationShare! Id: ' + currentUser.data.userId);
            callback(400);
            return;
        }

        currentUser.data.ignored = locMapCommon.removeItemFromArray(currentUser.data.ignored, otherUserId);
        currentUser.setData(callback, null);
    }
};

module.exports = LocMapSharingModel;
