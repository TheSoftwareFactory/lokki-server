/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Locmap location sharing models.
 */

var db = require('../../lib/db');

var crashReportPrefix = 'locmapcrash:';

var CrashReports = function() {

    // userId is used to differentiate reports, as timestamp alone can conflict.
    this.store = function(userId, osType, reportObject, callback) {
        var date = new Date();
        // We can get all reports per month with the same hgetall redis call.
        var key = crashReportPrefix + osType + ':' + date.getFullYear() + ':' + (date.getMonth() + 1);
        // Field differentiates within the key, using unix time in milliseconds, should be good enough for now.
        var field = userId + ':' + date.getTime();

        var data = {
            timestamp: date.getTime(),
            osType: osType,
            report: reportObject
        };
        db.hset(key, field, JSON.stringify(data), function(error) {
            if (error) {
                callback(400, 'Database write failed');
            } else {
                callback(200, 'OK: ' + key);
            }
        });
    };

    this.getMonth = function(osType, year, month, callback) {
        var redisKey = crashReportPrefix + osType + ':' + year + ':' + month;
        var reports = {};
        db.hgetall(redisKey, function(error, result) {
            if (result) {
                for (var key in result) {
                    if (result.hasOwnProperty(key)) {
                        if (result[key] !== null && result[key] !== undefined) {
                            var item = JSON.parse(result[key]);
                            // Attempt to convert timestamp to human readable format.
                            var date = new Date(item.timestamp);
                            var isoStamp = date.toISOString();
                            item.timestamp = isoStamp;
                            reports[isoStamp + ' ' + key] = item;
                        }
                    }
                }
                callback(200, reports);
            } else {
                callback(404, 'Not found');
            }
        });
    };
};

module.exports = CrashReports;
