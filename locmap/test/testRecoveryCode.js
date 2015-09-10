/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Test file: Recovery code API methods.
 */

var LocMapRecoveryCode = require('../lib/recoveryCode');

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    createRecoveryCode: function (test) {
        test.expect(1);
        var myId = 'deadbeef',
            code = new LocMapRecoveryCode(myId);
        code.createRecoveryCode(function (recoveryCode) {
            test.equal(recoveryCode, 'AA1AA');
            test.done();
        });
    }

};
