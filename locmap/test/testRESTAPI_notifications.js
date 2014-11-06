/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");

var testUserEmail = "user1@example.com.invalid";

module.exports = {

    // this function must be first as it starts server for testing
    startServer: function (test) {
        helpers.startServer(test);
    },

    setUp: function (callback) {
        helpers.cleanDB(function () {
            callback();
        });
    },

    tearDown: function(callback) {
        callback();
    },

    settingApnOrGcmDoesNotWorkWithoutAuthorization: function(test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, "dev1", function(auth1, reply1) {
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/apnToken',  { headers: {authorizationtoken: "wrong"}, data: {apnToken: "token"}}, lmHelpers.wrongAuthTokenResult, function() {
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/gcmToken',  { headers: {authorizationtoken: "wrong"}, data: {gcmToken: "token"}}, lmHelpers.wrongAuthTokenResult, function() {
                    test.done();
                });
            });
        });
    },

    ////// TODO copypaste, fixable?
    ////// Notification tests for locmap side,
    userPostsHisAppleNotificationDeviceId: function(test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, "dev1", function(auth1, reply1) {
            auth1.data = {apnToken: "token"};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/apnToken', auth1, function(apnRes) {
                test.done();
            });
        });
    },

     userPostsHisWP8NotificationURL: function(test) {
         test.expect(3);
         lmHelpers.createLocMapUser(test, testUserEmail, "dev1", function(auth1, reply1) {
             auth1.data = {wp8Url: "url"};
             lmHelpers.api.post(test, '/v1/user/' + reply1.id + "/wp8NotificationURL", auth1, function(apnRes) {
                 test.done();
             });
         });
     },

    userPostsHisAppleNotificationDeviceId: function(test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, "dev1", function(auth1, reply1) {
            auth1.data = {gcmToken: "token"};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/gcmToken', auth1, function(apnRes) {
                test.done();
            });
        });
    }

};

// this function must be last as it stops test server
    module.exports["stopServer"] = function(test) {
    helpers.stopServer(test);
};