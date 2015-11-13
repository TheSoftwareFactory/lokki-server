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
var LocMapSharingModel = require('./locationShareModel');
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
			places.push(place);
		});

		callback(200, places);
	};

};

module.exports = LocMapRESTAPI2;
