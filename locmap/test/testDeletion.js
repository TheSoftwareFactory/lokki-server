'use strict'

var lmHelpers = require('../test_helpers/locMapHelpers');
var conf = require('../../lib/config');
var helpers = require('../../test_helpers/test_helpers');
var LocMapCommon = require('../lib/locMapCommon');
var locMapCommon = new LocMapCommon();
var LocMapUserModel = require('../lib/locMapUserModel');
var db = require('../../lib/db');

var suspend = require('suspend');
var assert = require('assert');

var userPrefix = conf.get('db').userPrefix;
var sharePrefix = conf.get('db').sharePrefix;
var codePrefix = conf.get('db').deleteCodePrefix;

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

module.exports.deleteNonexistentFail = suspend(function* (test) {

    var myEmail = 'nonexistent@nothing.com';

    test.ok((yield locMapCommon.getUserByEmail(
            myEmail, suspend.resume())) === null);

    var numDelCodes = (yield db.keys(
          codePrefix + '*', suspend.resume())).length;
    test.ok(numDelCodes === 0);
    yield client.get(test, '/request-delete/' + myEmail,
            {}, suspend.resumeRaw());

    // confirm that no new deletion code was created
    var newNumDelCodes = (yield db.keys(codePrefix + '*', 
          suspend.resume())).length;
    test.equal(numDelCodes, newNumDelCodes);

    test.done();
});

module.exports.deleteCodeCreated = suspend(function* (test) {

    var myEmail = 'user@example.com.invalid';
    var reply = (yield lmHelpers.createLocMapUser(test,  
            myEmail, 'dev1', suspend.resumeRaw()))[1];

    test.ok(!(yield helpers.keyExists(
                codePrefix + reply.id, suspend.resume())));
    yield client.get(test, '/request-delete/' + myEmail,
            {}, suspend.resumeRaw());
    test.ok(yield helpers.keyExists(
                codePrefix + reply.id, suspend.resume()));

    test.done();
});

module.exports.deleteStartToFinish = suspend(function* (test) {

    var myEmail = 'user@example.com.invalid';
    var reply = (yield lmHelpers.createLocMapUser(test,  
            myEmail, 'dev1', suspend.resumeRaw()))[1];

    test.ok(!!reply.id);

    test.ok(yield helpers.keyExists(userPrefix + reply.id, 
                suspend.resume()));
    test.ok(yield helpers.keyExists(sharePrefix + reply.id, 
                suspend.resume()));

    var user = new LocMapUserModel(reply.id);
    yield user.getData(suspend.resumeRaw());

    test.ok(user.exists);

    test.ok(!(yield helpers.keyExists(codePrefix+reply.id, 
                suspend.resume())));
    yield client.get(test, '/request-delete/' + myEmail,
            {}, suspend.resumeRaw());

    test.ok(yield helpers.keyExists(codePrefix+reply.id, 
                suspend.resume()));

    var lastmail_ = yield db.lindex('sentmail', -1, suspend.resume());
    var lastmail = JSON.parse(lastmail_);

    test.ok(!!lastmail);
    test.ok(!!lastmail.text);

    var confirmDeleteLinkM = lastmail.text.match(
            'http(?:s|)://[^ ]+/confirm-delete/[^ ]+');
    test.ok(!!confirmDeleteLinkM);
    test.ok(confirmDeleteLinkM.length > 0);

    var confirmDeleteLink = confirmDeleteLinkM[0];
    test.ok(!!confirmDeleteLink && typeof confirmDeleteLink === 'string');
    test.ok(confirmDeleteLink.length > 10);

    var confirmDeletePostfixM = confirmDeleteLink.match('[^:/]/[^ ]+');
    test.ok(!!confirmDeletePostfixM);
    test.equal(confirmDeletePostfixM.length, 1);

    var confirmDeletePostfix = confirmDeletePostfixM[0].slice(1);
    test.ok(!!confirmDeletePostfix && confirmDeletePostfix.length > 5);
    test.ok(confirmDeletePostfix.indexOf(reply.id) > -1);

    var res = (yield client.get(test, confirmDeletePostfix, {}, 
                suspend.resumeRaw()))[0];

    test.ok(!!res && !!res.body && res.body.length > 10);
    test.ok(res.statusCode === 200);

    var doDeleteLinkM = res.body.match(
            'http(?:s|)://[^ ]+/do-delete/[a-zA-Z0-9/]+');
    test.ok(!!doDeleteLinkM);
    test.equal(doDeleteLinkM.length, 1);

    var doDeleteLink = doDeleteLinkM[0];
    test.ok(doDeleteLink.length > 10);

    var doDeletePostfix = doDeleteLink.match('[^:/]/[^ ]+')[0].slice(1);
    test.ok(!!doDeletePostfix && doDeletePostfix.length > 10);
    test.ok(doDeletePostfix.indexOf(reply.id) > -1);

    var res = (yield client.get(test, doDeletePostfix, {},
                suspend.resumeRaw()))[0];

    test.ok(!!res && !!res.body && res.body.length > 10);

    test.ok(!(yield helpers.keyExists(
                userPrefix + reply.id, suspend.resume())));
    test.ok(!(yield helpers.keyExists(
                sharePrefix + reply.id, suspend.resume())));
    test.ok(!(yield helpers.keyExists(
                codePrefix + reply.id, suspend.resume())));

    test.done();
});

module.exports.stopServer = function (test) {
    helpers.stopServer(test);
};

