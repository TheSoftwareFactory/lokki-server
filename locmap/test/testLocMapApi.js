/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
var LocMapUserModel = require('../lib/locMapUserModel');
var helpers = require("../../test_helpers/test_helpers");
var lmHelpers = require("../test_helpers/locMapHelpers");
var locMapRESTAPI = require('../lib/locMapRESTAPI');
var LocMapRestApi = new locMapRESTAPI();

module.exports = {
    setUp: function (callback) {
        var dbSetup = require('../../lib/dbSetup');
        dbSetup(function () {
            callback();
        });
    },

    signUpStoresUserLanguage: function(test) {
        test.expect(3);
        LocMapRestApi.signUpUser({email: "user@example.com.invalid", device_id: "dev1", language: "fi-FI"}, function(status, userData1) {
            test.equal(status, 200);
            var user = new LocMapUserModel(userData1.id);
            user.getData(function(userData) {
                test.ok(typeof userData !== "number");
                test.equal(user.data.language, "fi-FI");
                test.done();
            });
        });
    },

    signUpStoresShortUserLanguage: function(test) {
        test.expect(3);
        LocMapRestApi.signUpUser({email: "user@example.com.invalid", device_id: "dev1", language: "fi"}, function(status, userData1) {
            test.equal(status, 200);
            var user = new LocMapUserModel(userData1.id);
            user.getData(function(userData) {
                test.ok(typeof userData !== "number");
                test.equal(user.data.language, "fi");
                test.done();
            });
        });
    },

    // Language code can be max 10 chars.
    signUpFailsTooLongUserLanguage: function(test) {
        test.expect(1);
        LocMapRestApi.signUpUser({email: "user@example.com.invalid", device_id: "dev1", language: "12345678901"}, function(status, userData1) {
            test.equal(status, 400);
            test.done();
        });
    },

    // Language code can be max 10 chars.
    signUpFailsNotStringUserLanguage: function(test) {
        test.expect(1);
        LocMapRestApi.signUpUser({email: "user@example.com.invalid", device_id: "dev1", language: {not: "string"}}, function(status, userData1) {
            test.equal(status, 400);
            test.done();
        });
    },

    // Set user language.
    setUserLanguage: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                LocMapRestApi.setUserLanguage(reply.id, cache, {'language': 'fi-FI'}, function(langResult) {
                    test.equal(langResult, 200);
                    var user = new LocMapUserModel(reply.id);
                    user.getData(function(userData) {
                        test.ok(typeof userData !== "number");
                        test.equal(user.data.language, 'fi-FI');
                        test.done();
                    });
                });
            });
        });
    },

    // Set user language short code.
    setUserLanguage: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                LocMapRestApi.setUserLanguage(reply.id, cache, {'language': 'fi'}, function(langResult) {
                    test.equal(langResult, 200);
                    var user = new LocMapUserModel(reply.id);
                    user.getData(function(userData) {
                        test.ok(typeof userData !== "number");
                        test.equal(user.data.language, 'fi');
                        test.done();
                    });
                });
            });
        });
    },

    // Too long code fails.
    setUserLanguageTooLongCodeFails: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                LocMapRestApi.setUserLanguage(reply.id, cache, {'language': 'a2345678901'}, function(langResult) {
                    test.equal(langResult, 400);
                    // Verify that language stays as the default.
                    var user = new LocMapUserModel(reply.id);
                    user.getData(function(userData) {
                        test.ok(typeof userData !== "number");
                        test.equal(user.data.language, 'en-US');
                        test.done();
                    });
                });
            });
        });
    },

    // Invalid type fails.
    setUserLanguageInvalidCodeFails: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                LocMapRestApi.setUserLanguage(reply.id, cache, {'language': {not: "string"}}, function(langResult) {
                    test.equal(langResult, 400);
                    // Verify that language stays as the default.
                    var user = new LocMapUserModel(reply.id);
                    user.getData(function(userData) {
                        test.ok(typeof userData !== "number");
                        test.equal(user.data.language, 'en-US');
                        test.done();
                    });
                });
            });
        });
    },

    // Too short code fails.
    setUserLanguageTooShortCodeFails: function(test) {
        test.expect(5);
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                LocMapRestApi.setUserLanguage(reply.id, cache, {'language': 'f'}, function(langResult) {
                    test.equal(langResult, 400);
                    // Verify that language stays as the default.
                    var user = new LocMapUserModel(reply.id);
                    user.getData(function(userData) {
                        test.ok(typeof userData !== "number");
                        test.equal(user.data.language, 'en-US');
                        test.done();
                    });
                });
            });
        });
    },

    // Getting dashboard saves last access timestamp to user.
    getDashboardSavesLastAccessTimestamp: function(test) {
        test.expect(7);
        var startTime = Date.now();
        lmHelpers.createLocMapUserApi(test, LocMapRestApi, "user@example.com.invalid", "dev1", function(reply) {
            lmHelpers.getCacheWithUser(test, LocMapRestApi, reply.id, function(cache) {
                LocMapRestApi.getUserDashboard(reply.id, cache, function(status, dash) {
                    test.equal(status, 200);
                    var user = new LocMapUserModel(reply.id);
                    user.getData(function(userData) {
                        test.ok(typeof userData !== "number");
                        test.ok(typeof user.data.lastDashboardAccess === "number");
                        test.ok(user.data.lastDashboardAccess >= startTime, "Last dashboard access time was not recent.");
                        test.ok(user.data.lastDashboardAccess <= Date.now(), "Last dashboard access time was in the future.");
                        test.done();
                    });
                });
            });
        });
    }

};
