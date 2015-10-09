/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
    Common functions needed by locmap.
 */
var crypto = require('crypto');

var LocMapCommon = function() {

    // converts password from clear text to salted hashed password to store
    this.getSaltedHashedId = function(id) {
        var shasum = crypto.createHash('sha1');
        shasum.update(id);
        shasum.update('LokkiIsTheGreatTool'); // Separate salt for locmap
        var userId = shasum.digest('hex');
        return userId;
    };

    // If result is a number then returns it as is, if not - returns 200 with result
    this.statusFromResult = function(result) {
        var status = ((typeof result === 'number') ? result : 200);
        return status;
    };

    // must be called on initialized user
    this.generateAuthToken = function() {
        var token = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 10; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    };

    this.generateResetToken = function() {
        var token = crypto.randomBytes(40).toString('hex');
        return token;
    };

    this.verifyPlace = function(rawPlace) {
        var newPlace = {
            lat: parseFloat(rawPlace.lat),
            lon: parseFloat(rawPlace.lon),
            rad: parseFloat(rawPlace.rad),
            name: '',
            img: ''
        };
        if (rawPlace.name !== undefined) {
            newPlace.name = rawPlace.name;
        }
        if (rawPlace.img !== undefined) {
            newPlace.img = rawPlace.img;
        }
        if (isNaN(newPlace.lat) || isNaN(newPlace.lon) || isNaN(newPlace.rad) || typeof newPlace.name !== 'string' || typeof newPlace.img !== 'string') {
            return null;
        } else {
            newPlace.name = newPlace.name.trim();
            return newPlace;
        }
    };

    this.verifyLocation = function(rawLocation) {
        var newLocation = {
            lat: parseFloat(rawLocation.lat),
            lon: parseFloat(rawLocation.lon),
            acc: parseFloat(rawLocation.acc),
            time: Date.now()
        };
        if (isNaN(newLocation.lat) || isNaN(newLocation.lon) || isNaN(newLocation.acc)) {
            return null;
        } else {
            return newLocation;
        }
    };

    this.isLocationTimedout = function(location, timeout) {
        if (typeof location === 'object' && typeof location.time === 'number') {
            if (Date.now() < location.time + timeout * 1000) {
                return false;
            }
        }
        // If user has no location, consider it timed out.
        return true;
    };

    this.combineListsUnique = function(list1, list2) {
        var tempHashes = {};
        var combinedList = [];
        var i, value;

        for (i = 0; i < list1.length; i++) {
            value = list1[i];
            if (!tempHashes.hasOwnProperty(value)) {
                combinedList.push(value);
            }
        }

        for (i = 0; i < list2.length; i++) {
            value = list2[i];
            if (!tempHashes.hasOwnProperty(value)) {
                combinedList.push(value);
            }
        }

        return combinedList;
    };

    this.removeItemFromArray = function(arr, item) {
        if (arr !== undefined) {
            var idx = arr.indexOf(item);
            if (idx !== -1) {
                arr.splice(idx, 1);
            }
        }
        if (arr === undefined || arr === 'undefined') {
            arr = [];
        }
        return arr;
    };

    this.addUniqueItemToArray = function(arr, item) {
        if (arr === undefined || arr === 'undefined') {
            arr = [];
        }
        var idx = arr.indexOf(item);
        if (idx === -1) {
            arr.push(item);
        }
        return arr;
    };

    this._createHistogramDict = function(count) {
        var struct = {more: 0};
        for (var i = 0; i <= count; i++) {
            struct[i] = 0;
        }
        return struct;
    };

    this.getDefaultStatsDict = function() {
        var statsStruct = {
            totalAccounts: 0,
            activatedAccounts: 0,
            invitePendingAccounts: 0,
            activatedUsersByPlatform: {'ios': 0, 'android': 0, 'wp8': 0, 'noToken': 0},
            activatedUsersByVisibility: {'visible': 0, 'invisible': 0},
            userLocationUpdatedSince: this._createHistogramDict(31),
            contactsPerActivatedUser: this._createHistogramDict(20),
            userDashboardAccessSince: this._createHistogramDict(31)
        };
        statsStruct.userLocationUpdatedSince.older = 0;
        statsStruct.userLocationUpdatedSince.never = 0;
        statsStruct.userLocationUpdatedSince.future = 0;
        statsStruct.contactsPerActivatedUser.more = 0;
        statsStruct.contactsPerActivatedUser.never = 0;
        statsStruct.userDashboardAccessSince.older = 0;
        statsStruct.userDashboardAccessSince.never = 0;
        statsStruct.userDashboardAccessSince.future = 0;
        return statsStruct;
    };

    // Make sure language code isn't empty etc.
    this.verifyLangCode = function(langCode) {
        if (typeof langCode === 'string' && langCode !== '') {
            return langCode;
        } else {
            return 'en-US';
        }
    };

};

module.exports = LocMapCommon;
