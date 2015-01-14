/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Locmap location sharing models.
 */
var db = require('../../lib/db');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();
var LocMapConfig = require('./locMapConfig');

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
                    } catch (error) {
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
                console.log('Error setting user data: ' + error);
            } else {
                currentUser.exists = true;
            }
            callback(result);
        });
    };

    this.allowOtherUser = function(otherUserId, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log('Setting allowOtherUser to uninitialized locationShare! Id: ' + currentUser.data.userId);
            callback(400);
            return;
        }
        if (currentUser.data.canSeeMe.length >= LocMapConfig.maxAllowToSeeCount) {
            console.log('User ' + currentUser.data.userId + ' tried to allow other users beyond limit!');
            callback(403);
            return;
        }

        currentUser.data.canSeeMe = locMapCommon.addUniqueItemToArray(currentUser.data.canSeeMe, otherUserId);
        currentUser.setData(callback, null);
    };

    this.denyOtherUser = function(otherUserId, callback) {
        var currentUser = this;
        if (!currentUser.exists) {
            console.log('Setting denyOtherUser to uninitialized locationShare! Id: ' + currentUser.data.userId);
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
            console.log('Setting addUserICanSee to uninitialized locationShare! Id: ' + currentUser.data.userId);
            callback(400);
            return;
        }

        currentUser.data.ICanSee = locMapCommon.removeItemFromArray(currentUser.data.ICanSee, otherUserId);
        currentUser.setData(callback, null);
    };

};

module.exports = LocMapSharingModel;
