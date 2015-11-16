/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 * CrashReport storing and fetching tests.
 */

'use strict';

var lmHelpers = require('../test_helpers/locMapHelpers');
var CrashReports = require('../lib/crashReports');
var crashReports = new CrashReports();

module.exports = {
    setUp: function (callback) {
        this.currentDate = new Date();
        this.currentYear = this.currentDate.getFullYear();
        this.currentMonth = this.currentDate.getMonth() + 1;

        var dbSetup = require('../../test_helpers/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    storeAndGetCrashReport: function (test) {
        var that = this,
            osType = 'android',
            report1 = {osType: osType, osVersion: '4.4', lokkiVersion: '1.2.3',
                reportTitle: 'title', reportData: 'report\ndata'};

        test.expect(4);
        crashReports.store('user1', osType, report1, function (status) {
            test.equal(status, 200, 'Store data failed.');
            crashReports.getMonth(osType, that.currentYear, that.currentMonth,
                function (status2, result) {
                    test.equal(status2, 200, 'Get data failed.');
                    test.equal(Object.keys(result).length, 1);
                    test.ok(lmHelpers.compareCrashReports(result,
                        [{osType: osType, report: report1}]),
                        'Result did not match reference report.');
                    test.done();
                });
        });
    },

    storeMultipleReports: function (test) {
        var that = this,
            osType = 'android',
            report1 = {osType: osType, osVersion: '4.4', lokkiVersion: '1.2.3',
                reportTitle: 'title1', reportData: 'report\ndata1'},
            report2 = {osType: osType, osVersion: '4.4', lokkiVersion: '1.2.3',
                reportTitle: 'title2', reportData: 'report\ndata2'};
        test.expect(5);
        crashReports.store('user1', osType, report1, function (status) {
            test.equal(status, 200, 'Store data1 failed.');
            crashReports.store('user2', osType, report2, function (status2) {
                test.equal(status2, 200, 'Store data2 failed.');
                crashReports.getMonth(osType, that.currentYear, that.currentMonth,
                    function (status3, result) {
                        test.equal(status3, 200, 'Get data failed.');
                        test.equal(Object.keys(result).length, 2);
                        test.ok(lmHelpers.compareCrashReports(result,
                            [{osType: osType, report: report1}, {osType: osType, report: report2}]),
                            'Result did not match reference report.');
                        test.done();
                    });
            });
        });
    }

};
