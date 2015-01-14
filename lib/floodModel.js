/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
Flood prevention counters based on given id, expiration and count limit.

Implementation applies "Pattern: Rate Limiter 1" from http://redis.io/commands/incr with some modifications
needed for our use case.

In case of errors, we return whatever is defined as the default response.
*/

'use strict';

var db = require('./db');

var modelPrefix = 'flood:';
var defaultResponse = false;  // Default reply to give in case db connection errors occur.

var FloodModel = function(floodId) {
    this.data = {
        floodId: floodId,
        dbId: modelPrefix + floodId
    };

    this._increment = function(expireTime, callback) {
        var currentFlood = this;
        // There is a possibility of a race condition in case the id does not exist yet and two queries check it
        // simultaneously.  But only consequence is that expiration is set twice roughly at the same time,
        // incrementation does not suffer -> no real harm done.
        db.exists(currentFlood.data.dbId, function(error, result) {
            if (error) {
                callback(error, defaultResponse);
            } else if (result) {
                db.incr(currentFlood.data.dbId, callback);
            } else {
                var multi = db.multi();
                multi.incr(currentFlood.data.dbId);
                multi.pexpire(currentFlood.data.dbId, expireTime);
                multi.exec(function(error2, replies) {
                    // Small hack to pick the incr result from the multi exec result, which is an array.
                    var result2 = null;
                    if (replies !== null) {
                        result2 = replies[0];
                    }
                    callback(error, result2);
                });
            }
        });
    };

    // increases request count for current id and type.
    // callback gets false if flooding limit has been reached, otherwise true.
    this.request = function(expireTime, maxRequestCount, callback) {
        this._increment(expireTime, function(error, result) {
            if (error) {
                callback(defaultResponse);
            } else if (result > maxRequestCount) {
                callback(false);
            } else {
                callback(true);
            }
        });
    };

    // Resets request count (deletes) for current floodId.
    this.reset = function(callback) {
        var currentFlood = this;
        db.del(currentFlood.data.dbId, function(error) {
             if (error) {
                 callback(false);
             } else {
                 callback(true);
             }
        });
    };

};

module.exports = FloodModel;
