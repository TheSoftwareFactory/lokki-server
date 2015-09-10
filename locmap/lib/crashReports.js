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

var CrashReports = function () {

    // userId is used to differentiate reports, as timestamp alone can conflict.
    this.store = function (userId, osType, reportObject, callback) {
        var date = new Date(),
        // We can get all reports per month with the same hgetall redis call.
            key = crashReportPrefix + osType + ':' +
                date.getFullYear() + ':' + (date.getMonth() + 1),
        // Field differentiates within the key, using
        // unix time in milliseconds, should be good enough for now.
            field = userId + ':' + date.getTime(),
            data = {
                timestamp: date.getTime(),
                osType: osType,
                report: reportObject
            };
        db.hset(key, field, JSON.stringify(data), function (error) {
            if (error) {
                callback(400, 'Database write failed');
            } else {
                callback(200, 'OK: ' + key);
            }
        });
    };

    this.getMonth = function (osType, year, month, callback) {
        var redisKey = crashReportPrefix + osType + ':' + year + ':' + month,
            reports = {};
        db.hgetall(redisKey, function (error, result) {
            var key, item, date, isoStamp = null;
            if (result) {
                for (key in result) {
                    if (result.hasOwnProperty(key)) {
                        if (result[key] !== null && result[key] !== undefined) {
                            item = JSON.parse(result[key]);
                            // Attempt to convert timestamp to human readable format.
                            date = new Date(item.timestamp);
                            isoStamp = date.toISOString();
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
