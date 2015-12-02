/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
    Logic needed for locmap RESTAPI v2 calls.
 */

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var LocMapUserModel = require('./locMapUserModel');
var FloodModel = require('../../lib/floodModel');
var LocMapShareModel = require('./locMapShareModel');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();
var LocMapCrashReports = require('./crashReports');
var locMapCrashReports = new LocMapCrashReports();
var LocMapEmail = require('./email');
var locMapEmail = new LocMapEmail();
var LocMapResetCode = require('./resetCode');
var locMapResetCode = new LocMapResetCode();
var LocMapConfirmationCode = require('./confirmationCode');
var locMapConfirmationCode = new LocMapConfirmationCode();
var I18N = require('../../lib/i18n');
var i18n = new I18N();

var check = require('validator').check;
var uuid = require('node-uuid');

var LocMapRestApi = require('./locMapRESTAPI');
var locMapRestApi = new LocMapRestApi();

// Rest API version 2
var LocMapRESTAPI2 = function() {

    // Get user places.
    this.getUserPlaces = function(userId, cache, callback) {
        var user = cache.get('locmapuser', userId);

        var cachedPlaces = user.data.places;
        var places = [];

        Object.keys(cachedPlaces).forEach(function(id) {
            var place = cachedPlaces[id];
            place.id = id;
            place.location = {};
            ['lat', 'lon'].forEach(function(field) {
                place.location[field] = place[field];
                delete place[field];
            });
            place.location.acc = place.rad;
            delete place.rad;
            place.buzz = !!place.buzz;
            places.push(place);
        });

        callback(200, places);
    };

    /* Get user contacts.
    param userId        Encrypted ID of the user whose contacts are being fetched
    callback callback   Callback function
    returns a list of contacts. Contact: {userId, name, email, <boolean> isIgnored, <boolean> canSeeMe, <Location> location}.
    */
    this.getUserContacts = function(userId, callback) {
        // Load contact data from server
        var locShare = new LocMapShareModel(userId);
        locShare.getData(function (locShareResult) {
            if (typeof locShareResult !== 'number') {
                // nameMapping: userId -> name
                var nameMapping = JSON.parse(locShare.data.nameMapping);

                // Array of userIds who can see me. We create a dictionary for better performance.
                var canSeeMe = {};
                locShare.data.canSeeMe.forEach(function(userId) {
                    canSeeMe[userId] = true;
                });

                // Array of userIds who I have ignored (= I can't see on the map). We create a dictionary for better performance.
                var ignored = {};
                locShare.data.ignored.forEach(function(userId) {
                    ignored[userId] = true;
                });

                // iCanSee: userId -> {location: {lat, lon, acc}, battery: <string>, visibility: <boolean>}
                locMapRestApi._getUserShareData(locShare.data.ICanSee, function(ICanSee) {

                    var contacts = [];

                    locMapRestApi._generateIdMapping(locShare.data.ICanSee, locShare.data.canSeeMe, function(idMapping) {
                        // idMapping: userId -> email
                        Object.keys(idMapping).forEach(function(contactUserId) {
                            var email = idMapping[contactUserId];
                            var contact = {userId: contactUserId, email: email};
                            contact.name = (nameMapping[contactUserId]) ? nameMapping[contactUserId] : null;
                            contact.isIgnored = !!ignored[contactUserId];
                            contact.location = (ICanSee[contactUserId]) ? ICanSee[contactUserId].location : null;
                            contact.canSeeMe = !!canSeeMe[contactUserId];

                            contacts.push(contact);
                        });

                        // Send everything back
                        callback(200, contacts);
                    });
                });
            } else {
                logger.warn('Failed to get contact for user ' + userId);
                callback(404, 'Failed to get contact data for user.');
            }
        });
    };

    // Set place's buzz.
    this.setUserPlaceBuzz = function(userId, cache, placeId, callback) {
        // Get user places.
        locMapRestApi.getUserPlaces(userId, cache, function(status, places) {
            if (status === 200 && places && places[placeId]) {
                var place = places[placeId];
                place.buzz = !place.buzz;
                locMapRestApi.modifyUserPlace(userId, cache, placeId, place, callback);
            } else {
                callback(400, 'Place not found');
            }
        });
    };

    this.transformToAPIv1Format = function(v2place) {
        if (v2place.location === undefined) {
            return v2place;
        }
        v2place.rad = v2place.location.acc;
        v2place.lon = v2place.location.lon;
        v2place.lat = v2place.location.lat;


        delete v2place.location;

        return v2place;
    }

};

module.exports = LocMapRESTAPI2;
