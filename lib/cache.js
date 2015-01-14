/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Cache anything with cache function and retrieve with get function.
 Used always within the same process (node.js instance and same call (function).
 */

var Cache = function() {
    var cache = {};

    // Cache object obj with id 'id'. type is "user" or "family"
    this.cache = function(type, id, obj) {
        if (!cache[type]) {
            cache[type] = {};
        }
        cache[type][id] = obj;
    };

    // Retrieve cached object with id 'id'. type is "user" or "family". returns undefined if not found
    this.get = function(type, id) {
        if (!cache[type]) {
            return undefined;
        }
        return cache[type][id];
    };

};

module.exports = Cache;
