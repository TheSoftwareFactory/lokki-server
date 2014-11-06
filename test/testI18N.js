/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
var I18N = require('../lib/i18n');

var i18n = new I18N();


module.exports = {


    setUp: function (callback) {
        i18n._addString("en-US", "test.withParams", "%test1% is %test2%");
        i18n._addString("en-US", "test.DoNotTranslate2", "test2");

        callback();
    },

    testDefaultLanguage: function(test) {
        test.equal(i18n.getDefaultLanguage(), "en-US");
        test.done();

    },

    testExistingId: function (test) {
        test.equal(i18n.getLocalizedString("en-US", "test.DoNotTranslate"), "test");
        test.done();
    },

    testLocalizedId: function (test) {
        test.equal(i18n.getLocalizedString("ru-RU", "test.DoNotTranslate"), "тест");
        test.done();
    },

    testLocalizedIdWithParams: function (test) {
        test.equal(i18n.getLocalizedString("ru-RU", "test.withParams", "test1", "Oleg", "test2", "good"), "Oleg is good");
        test.done();
    },

    testMissingLocalizedIdShouldFallbackToEnglish: function (test) {
        test.equal(i18n.getLocalizedString("ru-RU", "test.DoNotTranslate2"), "test2");
        test.done();
    },

    testWrongId: function (test) {
        test.equal(i18n.getLocalizedString("en-US", "somewrongid"), "");
        test.done();
    },

    testShortIdEn: function(test) {
        test.equal(i18n.getLocalizedString("en", "test.DoNotTranslate"), "test");
        test.done();
    },

    testShortIdFi: function(test) {
        test.equal(i18n.getLocalizedString("fi", "test.DoNotTranslate"), "testi");
        test.done();
    }

};
