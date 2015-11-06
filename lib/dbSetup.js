/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var conf = require('../lib/config');
var logger = require('../lib/logger');
var db = require('../lib/db');

/*
 Prepare DB with fake data for the tests.
 */
var dbSetup = function(callback) {

    var myLocation = '{"time":' + Date.now() + ',"lat":"24.111","lon":"12.444","acc":"100"}';
    var myPlaces = '[\"Home\"]';
    var userFamily = 'family:Miguel';
    var myFriends = '[\"otherUser\"]';
    var myIcon = '';

    var userData = {
        userId : 'testUser',
        name : 'Test User',
        location : myLocation,
        places : myPlaces,
        friends : myFriends,
        family : userFamily,
        icon : myIcon,
        battery : 26
    };

    // Families are not currently implemented so nothing is done with this in the tests.
    // Included here anyway to keep this refactoring equivalent to the original.
    var familyData = {
        familyId : userFamily,
        name : 'Miguel\'s Family',
        allPlaces : '{"TestPlace":{"type": "factory", "name": "TestPlace", "lat":12.23,"lon":64.12,"radius":100}}',
        members : '["Miguel","testUser"]',
        invitedMembers : [],
    };

    var miguelData = {
        userId : 'Miguel',
        name : 'Miguel R.',
        location : myLocation,
        places : myPlaces,
        friends : myFriends,
        family : userFamily, 
        icon : myIcon,
        battery : 25
    };

    // Detect if we are in production
    if (conf.get('env') !== 'test') {
        throw new Error('dbSetup should only be used in tests!');
    } else {
        // Clean DB (careful in production)
        db.flushall(function(err) {
            if (err) {
                logger.error(err);
                throw err;
            }
            db.hmset('users:testUser', userData, function(err) {
                if (err) throw err;
                db.hmset('families:' + userFamily, familyData, function(err) {
                    if (err) throw err;
                    db.hmset('users:Miguel', miguelData, function() {
                        if (err) throw err;
                        logger.trace('DB is ready');

                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        });
    }
}

// Exports function dbSetup on module level, so require(dbSetup.js) will expose it directly
module.exports = dbSetup;
