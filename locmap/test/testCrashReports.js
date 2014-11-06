/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 * CrashReport storing and fetching tests.
 */
var lmHelpers = require("../test_helpers/locMapHelpers");
var crashReports = require("../lib/crashReports");
var CrashReports = new crashReports();

module.exports = {
    setUp: function (callback) {
        this.currentDate = new Date();
        this.currentYear = this.currentDate.getFullYear();
        this.currentMonth = this.currentDate.getMonth()+1;

        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    storeAndGetCrashReport: function(test) {
        var that = this;
        var osType = 'android';
        var report1 = {osType: osType, osVersion: '4.4', lokkiVersion: '1.2.3', reportTitle: 'title', reportData: 'report\ndata'};

        test.expect(4);
        CrashReports.store('user1', osType, report1, function(status, result) {
            test.equal(status, 200, "Store data failed.");
            CrashReports.getMonth(osType, that.currentYear, that.currentMonth, function(status, result) {
                test.equal(status, 200, "Get data failed.");
                test.equal(Object.keys(result).length, 1);
                test.ok(lmHelpers.compareCrashReports(result, [{osType: osType, report: report1}]), "Result did not match reference report.");
                test.done();
            });
        });
    },

    storeMultipleReports: function(test) {
        var that = this;
        var osType = 'android';
        var report1 = {osType: osType, osVersion: '4.4', lokkiVersion: '1.2.3', reportTitle: 'title1', reportData: 'report\ndata1'};
        var report2 = {osType: osType, osVersion: '4.4', lokkiVersion: '1.2.3', reportTitle: 'title2', reportData: 'report\ndata2'};
        test.expect(5);
        CrashReports.store('user1', osType, report1, function(status, result) {
            test.equal(status, 200, "Store data1 failed.");
            CrashReports.store('user2', osType, report2, function(status, result) {
                test.equal(status, 200, "Store data2 failed.");
                CrashReports.getMonth(osType, that.currentYear, that.currentMonth, function(status, result) {
                    test.equal(status, 200, "Get data failed.");
                    test.equal(Object.keys(result).length, 2);
                    test.ok(lmHelpers.compareCrashReports(result, [{osType: osType, report: report1}, {osType: osType, report: report2}]), "Result did not match reference report.");
                    test.done();
                });
            });
        });
    }

};
