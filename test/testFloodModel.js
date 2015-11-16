/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var Flood = require('../lib/floodModel');

module.exports = {
    setUp: function(callback) {
        var dbSetup = require('../test_helpers/dbSetup');
        dbSetup(function() {
            callback();
        });
    },

    testFloodAtLimit: function(test) {
        test.expect(2);
        var expireTime = 60000; // 1 minute in milliseconds
        var id = 123;
        var maxRequestCount = 2;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, 'Request should be allowed.');
            flood.request(expireTime, maxRequestCount, function(result2) {
                test.equal(result2, true, 'Request should be allowed.');
                test.done();
            });
        });
    },

    testFloodOverLimit: function(test) {
        test.expect(3);
        var expireTime = 60000; // 1 minute in milliseconds
        var id = 123;
        var maxRequestCount = 2;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, 'Request should be allowed.');
            flood.request(expireTime, maxRequestCount, function(result2) {
                test.equal(result2, true, 'Request should be allowed.');
                flood.request(expireTime, maxRequestCount, function(result3) {
                    test.equal(result3, false, 'Request should not allowed.');
                    test.done();
                });
            });
        });
    },

    testFloodExpiration: function(test) {
        test.expect(3);
        var expireTime = 0; // Immediate expiration
        var id = 123;
        var maxRequestCount = 1;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, 'Request should be allowed.');
            flood.request(expireTime, maxRequestCount, function(result2) {
                test.equal(result2, true, 'Request should be allowed.');
                flood.request(expireTime, maxRequestCount, function(result3) {
                    test.equal(result3, true, 'Request should be allowed.');
                    test.done();
                });
            });
        });
    },

    testFloodReset: function(test) {
        test.expect(3);
        var expireTime = 60000; // 1 minute in milliseconds
        var id = 123;
        var maxRequestCount = 1;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, 'Request should be allowed');
            flood.request(expireTime, maxRequestCount, function(result2) {
                test.equal(result2, false, 'Request should not be allowed');
                flood.reset(function() {
                    flood.request(expireTime, maxRequestCount, function(result3) {
                        test.equal(result3, true, 'Request should be allowed');
                        test.done();
                    });
                });
            });
        });

    }

};
