/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
    Common functions needed by locmap.
 */
var crypto = require('crypto');

var suspend = require('suspend');
var assert = require('assert');
var conf = require('../../lib/config');
var db = require('../../lib/db');
var logger = require('../../lib/logger');

var userPrefix = conf.get('db').userPrefix;

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

    this._randomHexChars = function (count) {
        return crypto.randomBytes(Math.ceil(count / 2))
            .toString('hex').slice(0, count);
    };

    // must be called on initialized user
    this.generateAuthToken = function() {
        var len = conf.get('codeLengths').authToken;
        return this._randomHexChars(len);
    };

    this.generateResetToken = function() {
        var len = conf.get('codeLengths').reset;
        return this._randomHexChars(len);
    };

    this.generateDeleteCode = function () {
        var len = conf.get('codeLengths').delete;
        return this._randomHexChars(len);
    };

    this.generateConfirmationCode = function () {
        var len = conf.get('codeLengths').confirmation;
        return this._randomHexChars(len);
    };

    this.verifyPlace = function(rawPlace) {
        function setAndValidate(place, fields, parseValue, isValid) {
            for (var i in fields) {
                var key = fields[i];
                if (!rawPlace.hasOwnProperty(key)) return null;
                place[key] = parseValue(rawPlace[key]);
                if (!isValid(place[key])) return null;
            }
            return place;
        }

        function floatFieldValidator(place) {
            return setAndValidate(place,
                ['lat', 'lon', 'rad'],
                function parser(value) {return parseFloat(value)},
                function validator(value) { return !isNaN(value); });
        }
        function stringFieldValidator(place) {
            return setAndValidate(place,
                ['name', 'img'],
                function parser(value) {return (value === undefined) ? '' : value.trim();},
                function validator(value) { return typeof value === 'string'; });
        }

        var newPlace = {};
        var fieldValidators = [floatFieldValidator, stringFieldValidator];
        for (var i in fieldValidators) {
            var setAndValidateFields = fieldValidators[i];
            newPlace = setAndValidateFields(newPlace);
            if (newPlace === null) return null;
        }

        newPlace.name = newPlace.name.substr(0, 1).toUpperCase() + newPlace.name.substr(1);

        newPlace.buzz = !!rawPlace.buzz;

        return newPlace;
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

    // Slow - works by going through all user entries in database.
    // Do not use when performance is required!
    this.getUserByEmail = suspend(function* (email, callback) {
        assert.ok(typeof email === 'string');

        // local import to avoid error with cyclical require
        var LocMapUserModel = require('./locMapUserModel');

        try {
            var users = yield db.keys(userPrefix+'*', suspend.resume());
            if (users === null) users = [];
            assert.ok(users instanceof Array);
            for (var i = 0; i < users.length; ++i) {
                var userId = users[i].split(':')[1];
                var user = new LocMapUserModel(userId);
                var data = (yield user.getData(suspend.resumeRaw()))[0];
                if (!data.email) {
                    logger.error('Could not get email of user '+users[i]);
                } else if (data.email === email) {
                    return callback(null, userId);
                }
            }
            // user not in database
            return callback(null, null);
        } catch (err) {
            return callback(err);
        }
    });
};

module.exports = LocMapCommon;
