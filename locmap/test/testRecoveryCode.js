/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 Test file: Recovery code API methods.
 */
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");

var locMapRecoveryCode = require('../lib/recoveryCode');
var locMapRESTAPI = require('../lib/locMapRESTAPI');
LocMapRestApi = new locMapRESTAPI();

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    createRecoveryCode: function(test) {
        test.expect(1);
        var myId = 'deadbeef'
        var code = new locMapRecoveryCode(myId);
        code.createRecoveryCode(function(recoveryCode) {
            test.equal(recoveryCode, "AA1AA");
            test.done();
        });
    }

};
