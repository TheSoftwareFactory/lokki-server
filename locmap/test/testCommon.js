'use strict'

var lmHelpers = require('../test_helpers/locMapHelpers');
var helpers = require('../../test_helpers/test_helpers');
var LocMapCommon = require('../lib/locMapCommon');
var locMapCommon = new LocMapCommon();
var conf = require('../../lib/config');

var suspend = require('suspend');

module.exports = {
    startServer: function (test) {
        helpers.startServer(test);
    },

    setUp: function (callback) {
        helpers.cleanDB(callback);
    }
};

var client = require('nodeunit-httpclient').create({
    port: conf.get('port'),
    statusCode: 200
});

module.exports.testGetUserByEmail = suspend(function* (test) {

    var email1 = 'one@testing.invalid';
    var email2 = 'two@testing.invalid';
    var reply1 = (yield lmHelpers.createLocMapUser(test,  
            email1, 'dev1', suspend.resumeRaw()))[1];
    var reply2 = (yield lmHelpers.createLocMapUser(test,  
            email2, 'dev2', suspend.resumeRaw()))[1];

    test.ok(!!reply1.id && !!reply2.id);

    var id2 = yield locMapCommon.getUserByEmail(email2, suspend.resume());

    test.equal(id2, reply2.id);
    test.done();
});

module.exports.stopServer = function (test) {
    helpers.stopServer(test);
};
