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
var LocMapConfirmationCode = require('../lib/confirmationCode');
var locMapConfirmationCode = new LocMapConfirmationCode();
var LocMapRestApi = require('../lib/locMapRESTAPI');
var locMapRestApi = new LocMapRestApi();
var I18N = require('../../lib/i18n');
var i18n = new I18N();

var userEmail = 'test@example.com.invalid';
var codeLength = conf.get('codeLengths').confirmation;

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../test_helpers/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    // Tests for the confirmationCode class.
    createConfirmationCodeReturnValue: function (test) {
        test.expect(2);
        var myId = 'deadbeef',
            code = new LocMapConfirmationCode(myId);
        code.createConfirmationCode(myId, function (confirmationCode) {
            test.equal(typeof confirmationCode, 'string');
            test.equal(confirmationCode.length, codeLength);
            test.done();
        });
    },

    createAndGetConfirmationCode: function (test) {
        test.expect(3);
        var userId = 'deadbeef';
        locMapConfirmationCode.createConfirmationCode(userId, function (confirmationCode) {
            test.equal(typeof confirmationCode, 'string');
            test.equal(confirmationCode.length, codeLength);
            locMapConfirmationCode.getConfirmationCodeData(userId, confirmationCode, function (confirmationCodeData) {
                test.deepEqual(confirmationCodeData, {confirmationCode: confirmationCode, userId: userId});
                test.done();
            });
        });
    },

    createAndDeleteConfirmationCode: function (test) {
        test.expect(2);
        var userId = 'deadbeef';
        locMapConfirmationCode.createConfirmationCode(userId, function (confirmationCode) {
            locMapConfirmationCode.removeConfirmationCode(userId, function (result) {
                test.equal(result, 1, 'One confirmation code key should have been removed.');
                locMapConfirmationCode.getConfirmationCodeData(userId, confirmationCode, function (confirmationCodeData) {
                    test.equal(confirmationCodeData, 404, 'Confirmation code was not deleted.');
                    test.done();
                });
            });
        });
    },

    confirmationGivesMessage: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapConfirmationCode.createConfirmationCode(userId, function (confirmationCode) {
                test.equal(typeof confirmationCode, 'string', 'Invalid type for confirmation code.');
                test.equal(confirmationCode.length, codeLength, 'Wrong length for confirmation code.');
                locMapRestApi.confirmUserAccount(userId, confirmationCode, function (status, result) {
                    test.equal(status, 200, 'Confirm account call failed.');
                    test.equal(result, i18n.getLocalizedString('en-US', 'confirm.serverMessage'));
                    test.done();
                });
            });
        });
    },


    // Confirmation code is removed from database after it is used
    confirmationRemovedAfterUse: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUserApi(test, locMapRestApi, userEmail, 'dev1', function (userData) {
            var userId = userData.id;
            locMapConfirmationCode.createConfirmationCode(userId, function (confirmationCode) {
                locMapRestApi.confirmUserAccount(userId, confirmationCode, function (status) {
                    test.equal(status, 200, 'Confirm account call failed.');
                    locMapConfirmationCode.getConfirmationCodeData(userId, confirmationCode, function (codeData) {
                        test.equal(codeData, 404, 'Confirmation code still exists.');
                        test.done();
                    });
                });
            });
        });
    }
};
