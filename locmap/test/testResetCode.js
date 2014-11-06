/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 Test file: User API methods
 */
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");

var locMapUserModel = require('../lib/locMapUserModel')
var locMapResetCode = require('../lib/resetCode');
var LocMapResetCode = new locMapResetCode();
var locMapRESTAPI = require('../lib/locMapRESTAPI');
var LocMapRestApi = new locMapRESTAPI();
var I18N = require('../../lib/i18n');
var i18n = new I18N();
var LocMapConfig = require('../lib/locMapConfig');

var userEmail = 'test@example.com.invalid';

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    //// Tests for the resetCode class.
    createResetCodeReturnValue: function(test) {
        test.expect(2);
        var myId = 'deadbeef';
        var code = new locMapResetCode(myId);
        code.createResetCode(myId, function(resetCode) {
            test.equal(typeof resetCode, "string");
            test.equal(resetCode.length, 80);
            test.done();
        });
    },

    createAndGetResetCode: function(test) {
        test.expect(3);
        var userId = 'deadbeef';
        LocMapResetCode.createResetCode(userId, function(resetCode) {
            test.equal(typeof resetCode, "string");
            test.equal(resetCode.length, 80);
            LocMapResetCode.getResetCodeData(resetCode, function(resetCodeData) {
                test.deepEqual(resetCodeData, {resetCode: resetCode, userId: userId});
                test.done();
            });
        });
    },

    createAndDeleteResetCode: function(test) {
        test.expect(2);
        var userId = 'deadbeef';
        LocMapResetCode.createResetCode(userId, function(resetCode) {
            LocMapResetCode.removeResetCode(resetCode, function(result) {
                test.equal(result, 1, "One reset code key should have been removed.");
                LocMapResetCode.getResetCodeData(resetCode, function(resetCodeData) {
                    test.equal(resetCodeData, 404, "Reset code was not deleted.");
                    test.done();
                });
            });
        });
    },

    //// Test for general reset code related functionality.
    resetSetsUserRecoveryMode: function(test) {
        test.expect(8);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, userEmail, "dev1", function(userData) {
            var userId = userData.id;
            LocMapResetCode.createResetCode(userId, function(resetCode) {
                test.equal(typeof resetCode, "string", "Invalid type for reset code.");
                test.equal(resetCode.length, 80, "Wrong length for reset code.");
                LocMapRestApi.resetUserAccountToRecoveryMode(resetCode, function(status, result) {
                    test.equal(status, 200, "Reset account call failed.");
                    var user = new locMapUserModel(userId);
                    user.getData(function(result) {
                        var now = Date.now();
                        test.ok(typeof result !== "number", "Getting user account data failed.");
                        test.equal(typeof user.data.accountRecoveryMode, "number", "User is not in recovery mode.");
                        test.ok(user.data.accountRecoveryMode > now - LocMapConfig.accountRecoveryModeTimeout*1000, "Recovery mode timed out.");
                        test.ok(user.data.accountRecoveryMode <= now, "Recovery mode time in future.");
                        test.done();
                    });
                });
            });
        });
    },

    resetGivesMessage: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, userEmail, "dev1", function(userData) {
            var userId = userData.id;
            LocMapResetCode.createResetCode(userId, function(resetCode) {
                test.equal(typeof resetCode, "string", "Invalid type for reset code.");
                test.equal(resetCode.length, 80, "Wrong length for reset code.");
                LocMapRestApi.resetUserAccountToRecoveryMode(resetCode, function(status, result) {
                    test.equal(status, 200, "Reset account call failed.");
                    test.equal(result, i18n.getLocalizedString('en-US', "reset.serverMessage"));
                    test.done();
                });
            });
        });
    },

    recoveryModeCheckTimeoutJustOver: function(test) {
        test.expect(1);
        var belowLimit = Date.now() - LocMapConfig.accountRecoveryModeTimeout*1000 - 1;
        test.ok(!LocMapRestApi._isUserInRecoveryMode(belowLimit), "Account should not be in recovery mode.");
        test.done();
    },

    recoveryModeCheckDefaultValue: function(test) {
        test.expect(1);
        test.ok(!LocMapRestApi._isUserInRecoveryMode(0), "Account should not be in recovery mode.");
        test.done();
    },

    recoveryModeFuture: function(test) {
        test.expect(1);
        // Timing sensitive test, 5 seconds should be big enough delay to not trigger unnecessarily.
        test.ok(!LocMapRestApi._isUserInRecoveryMode(Date.now() + 5000), "Account should not be in recovery mode.");
        test.done();
    },

    recoveryModeCorrect: function(test) {
        test.expect(1);
        test.ok(LocMapRestApi._isUserInRecoveryMode(Date.now()), "Account should be in recovery mode.");
        test.done();
    },

    // Reset code is removed from database after it is used to set user into recovery mode.
    resetRemovedAfterUse: function(test) {
        test.expect(3);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, userEmail, "dev1", function(userData) {
            var userId = userData.id;
            LocMapResetCode.createResetCode(userId, function(resetCode) {
                LocMapRestApi.resetUserAccountToRecoveryMode(resetCode, function(status, result) {
                    test.equal(status, 200, "Reset account call failed.");
                    LocMapResetCode.getResetCodeData(resetCode, function(codeData) {
                        test.equal(codeData, 404, "Reset code still exists.");
                        test.done();
                    });
                });
            });
        });
    },

    // User recovery mode resets current auth.
    accountRecoveryModeResetsAuth: function(test) {
        test.expect(4);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, userEmail, "dev1", function(userData) {
            var userId = userData.id;
            LocMapResetCode.createResetCode(userId, function(resetCode) {
                LocMapRestApi.resetUserAccountToRecoveryMode(resetCode, function(status, result) {
                    test.equal(status, 200, "Reset account call failed.");
                    var user = new locMapUserModel(userId);
                    user.getData(function(result) {
                        test.ok(typeof result !== "number", "Getting user account data failed.");
                        test.equal(user.data.authorizationToken, "");
                        test.done();
                    });
                });
            });
        });
    }

};
