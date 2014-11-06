/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/


var Flood = require('../lib/floodModel');
var db = require('../lib/db');
var helpers = require("../test_helpers/test_helpers");


module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    testFloodAtLimit: function (test) {
        test.expect(2);
        var expireTime = 60000; // 1 minute in milliseconds
        var id = 123;
        var maxRequestCount = 2;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, "Request should be allowed.");
            flood.request(expireTime, maxRequestCount, function(result) {
                test.equal(result, true, "Request should be allowed.");
                test.done();
            });
        });
    },

    testFloodOverLimit: function (test) {
        test.expect(3);
        var expireTime = 60000; // 1 minute in milliseconds
        var id = 123;
        var maxRequestCount = 2;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, "Request should be allowed.");
            flood.request(expireTime, maxRequestCount, function(result) {
                test.equal(result, true, "Request should be allowed.");
                flood.request(expireTime, maxRequestCount, function(result) {
                    test.equal(result, false, "Request should not allowed.");
                    test.done();
                })
            });
        });
    },

    testFloodExpiration: function (test) {
        test.expect(3);
        var expireTime = 0; // Immediate expiration
        var id = 123;
        var maxRequestCount = 1;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, "Request should be allowed.");
            flood.request(expireTime, maxRequestCount, function(result) {
                test.equal(result, true, "Request should be allowed.");
                flood.request(expireTime, maxRequestCount, function(result) {
                    test.equal(result, true, "Request should be allowed.");
                    test.done();
                })
            });
        });
    },

    testFloodReset: function (test) {
        test.expect(3);
        var expireTime = 60000; // 1 minute in milliseconds
        var id = 123;
        var maxRequestCount = 1;
        var flood = new Flood(id);
        flood.request(expireTime, maxRequestCount, function(result) {
            test.equal(result, true, "Request should be allowed");
            flood.request(expireTime, maxRequestCount, function(result) {
                test.equal(result, false, "Request should not be allowed");
                flood.reset(function (result) {
                    flood.request(expireTime, maxRequestCount, function(result) {
                        test.equal(result, true, "Request should be allowed");
                        test.done();
                    })
                })
            })
        })

    }

}
