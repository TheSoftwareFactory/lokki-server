/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Test file: User API methods
 */

var conf = require('../../lib/config');

var lmHelpers = require('../test_helpers/locMapHelpers');

var LocMapUserModel = require('../lib/locMapUserModel');
var LocMapResetCode = require('../lib/resetCode');
var locMapResetCode = new LocMapResetCode();
var LocMapRestApi = require('../lib/locMapRESTAPI');
var locMapRestApi = new LocMapRestApi();
var I18N = require('../../lib/i18n');
var i18n = new I18N();

var userEmail = 'test@example.com.invalid';
var codeLength = conf.get('codeLengths').reset;

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../test_helpers/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    // Tests for the resetCode class.
    createResetCodeReturnValue: function (test) {
        test.expect(2);
        var myId = 'deadbeef',
            code = new LocMapResetCode(myId);
        code.createResetCode(myId, function (resetCode) {
            test.equal(typeof resetCode, 'string');
            test.equal(resetCode.length, codeLength);
            test.done();
        });
    },

    createAndGetResetCode: function (test) {
        test.expect(3);
        var userId = 'deadbeef';
        locMapResetCode.createResetCode(userId, function (resetCode) {
            test.equal(typeof resetCode, 'string');
            test.equal(resetCode.length, codeLength);
            locMapResetCode.getResetCodeData(userId, resetCode, function (resetCodeData) {
                test.deepEqual(resetCodeData, {resetCode: resetCode, userId: userId});
                test.done();
            });
        });
    },

    createAndDeleteResetCode: function (test) {
        test.expect(2);
        var userId = 'deadbeef';
        locMapResetCode.createResetCode(userId, function (resetCode) {
            locMapResetCode.removeResetCode(userId, function (result) {
                test.equal(result, 1, 'One reset code key should have been removed.');
                locMapResetCode.getResetCodeData(userId, resetCode, function (resetCodeData) {
                    test.equal(resetCodeData, 404, 'Reset code was not deleted.');
                    test.done();
                });
            });
        });
    },

    // Test for general reset code related functionality.
    resetSetsUserRecoveryMode: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapResetCode.createResetCode(userId, function (resetCode) {
                test.equal(typeof resetCode, 'string', 'Invalid type for reset code.');
                test.equal(resetCode.length, codeLength, 'Wrong length for reset code.');
                locMapRestApi.resetUserAccountToRecoveryMode(userId, resetCode, function (status) {
                    test.equal(status, 200, 'Reset account call failed.');
                    var user = new LocMapUserModel(userId);
                    user.getData(function (result) {
                        var now = Date.now();
                        test.ok(typeof result !== 'number', 'Getting user account data failed.');
                        test.equal(typeof user.data.accountRecoveryMode, 'number',
                            'User is not in recovery mode.');
                        test.ok(user.data.accountRecoveryMode > now -
                            conf.get('locMapConfig').accountRecoveryModeTimeout * 1000,
                            'Recovery mode timed out.');
                        test.ok(user.data.accountRecoveryMode <= now,
                            'Recovery mode time in future.');
                        test.done();
                    });
                });
            });
        });
    },

    resetGivesMessage: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapResetCode.createResetCode(userId, function (resetCode) {
                test.equal(typeof resetCode, 'string', 'Invalid type for reset code.');
                test.equal(resetCode.length, codeLength, 'Wrong length for reset code.');
                locMapRestApi.resetUserAccountToRecoveryMode(userId, resetCode, function (status, result) {
                    test.equal(status, 200, 'Reset account call failed.');
                    test.equal(result, i18n.getLocalizedString('en-US', 'reset.serverMessage'));
                    test.done();
                });
            });
        });
    },

    recoveryModeCheckTimeoutJustOver: function (test) {
        test.expect(1);
        var belowLimit = Date.now() - conf.get('locMapConfig').accountRecoveryModeTimeout *
            1000 - 1;
        test.ok(!locMapRestApi._isUserInRecoveryMode(belowLimit),
            'Account should not be in recovery mode.');
        test.done();
    },

    recoveryModeCheckDefaultValue: function (test) {
        test.expect(1);
        test.ok(!locMapRestApi._isUserInRecoveryMode(0), 'Account should not be in recovery mode.');
        test.done();
    },

    recoveryModeFuture: function (test) {
        test.expect(1);
        // Timing sensitive test, 5 seconds should be big enough delay to not trigger unnecessarily.
        test.ok(!locMapRestApi._isUserInRecoveryMode(Date.now() + 5000),
            'Account should not be in recovery mode.');
        test.done();
    },

    recoveryModeCorrect: function (test) {
        test.expect(1);
        test.ok(locMapRestApi._isUserInRecoveryMode(Date.now()),
            'Account should be in recovery mode.');
        test.done();
    },

    // Reset code is removed from database after it is used to set user into recovery mode.
    resetRemovedAfterUse: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapResetCode.createResetCode(userId, function (resetCode) {
                locMapRestApi.resetUserAccountToRecoveryMode(userId, resetCode, function (status) {
                    test.equal(status, 200, 'Reset account call failed.');
                    locMapResetCode.getResetCodeData(userId, resetCode, function (codeData) {
                        test.equal(codeData, 404, 'Reset code still exists.');
                        test.done();
                    });
                });
            });
        });
    },

    // Reset code is removed from database after a second one is created.
    resetRemovedAfterAnother: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapResetCode.createResetCode(userId, function (resetCode) {
                locMapResetCode.createResetCode(userId, function (resetCode2) {
                    // Test that old code no longer works
                    locMapRestApi.resetUserAccountToRecoveryMode(userId, resetCode, function (status) {
                        test.equal(status, 403, 'Reset account call should have failed.');
                        // Test that db doesn't have old code
                        locMapResetCode.getResetCodeData(userId, resetCode, function (codeData) {
                            test.equal(codeData, 403, 'Old reset code exists.');
                            // Test that new reset code works
                            locMapRestApi.resetUserAccountToRecoveryMode(userId, resetCode2, function (status) {
                                test.equal(status, 200, 'Reset account call failed.');
                                test.done();
                            });
                        });
                    });
                });

            });
        });
    },

    // User recovery mode resets current auth.
    accountRecoveryModeResetsAuth: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapResetCode.createResetCode(userId, function (resetCode) {
                locMapRestApi.resetUserAccountToRecoveryMode(userId, resetCode, function (status) {
                    test.equal(status, 200, 'Reset account call failed.');
                    var user = new LocMapUserModel(userId);
                    user.getData(function (result) {
                        test.ok(typeof result !== 'number', 'Getting user account data failed.');
                        test.equal(user.data.authorizationToken, '');
                        test.done();
                    });
                });
            });
        });
    }

};
