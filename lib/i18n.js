/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var logger = require('./logger');
var fs = require('fs');


// Implementation of i18n module
var I18N = function () {

    var _getDefaultLanguage = function () {
        return 'en-US';
    };

    this.getDefaultLanguage = function () {
        return _getDefaultLanguage();
    };

    var languages = [
        _getDefaultLanguage(),
        'ru-RU',
        'fi-FI',
        'es-ES'
    ];
    this.languages = languages;

    var loadStrings = function () {
        var languageStrings = {};

        for (var l in languages) {
            if (languages.hasOwnProperty(l)) {
                var lang = languages[l];
                var file = './i18n/resources-locale_' + lang + '.json';
                try {
                    var data = fs.readFileSync(file, 'utf8');
                    languageStrings[lang] = JSON.parse(data);
                } catch (err) {
                    logger.warn('Failed to load or parse localization file: ' + file + '. Error: ' + err.message);
                }
            }
        }
        return languageStrings;

    };

    var strings = loadStrings();

    var formatString = function (text, fieldName1, fieldValue1, fieldName2, fieldValue2, fieldName3, fieldValue3) {
        var textBeforeReplace;
        if (fieldName1 !== undefined && fieldValue1 !== undefined) {
            textBeforeReplace = text;
            text = text.replace('%' + fieldName1 + '%', fieldValue1);
            if (textBeforeReplace === text) {
                logger.warn('LOC: string [' + text + '] does not have field %' + fieldName1 + '% to replace to ' + fieldValue1);
            }
        }

        if (fieldName2 !== undefined && fieldValue2 !== undefined) {
            textBeforeReplace = text;
            text = text.replace('%' + fieldName2 + '%', fieldValue2);
            if (textBeforeReplace === text) {
                logger.warn('LOC: string [' + text + '] does not have field %' + fieldName2 + '% to replace to ' + fieldValue2);
            }
        }

        if (fieldName3 !== undefined && fieldValue3 !== undefined) {
            textBeforeReplace = text;
            text = text.replace('%' + fieldName3 + '%', fieldValue3);
            if (textBeforeReplace === text) {
                logger.warn('LOC: string [' + text + '] does not have field %' + fieldName3 + '% to replace to ' + fieldValue3);
            }
        }
        return text;
    };


    // Returns localized string from language lang and with key key.
    // If fieldNameX and fieldValueX are defined then replaces %fieldNameX% with fieldValueX.
    // For instance for "notification.userHasBeenInvitedBy": "%userName% has been invited to your family by %invitingUserName%":
    // getLocalizedString("en-US", "notification.userHasBeenInvitedBy", "userName", "Oleg", "invitingUserName", "Miguel") returns:
    // "Oleg has been invited to your family by Miguel"
    this.getLocalizedString = function (lang, key, fieldName1, fieldValue1, fieldName2, fieldValue2, fieldName3, fieldValue3) {
        if (!strings.hasOwnProperty(lang)) {
            if (typeof lang === 'string' && lang.length === 2) {
                // Compatibility for 2 letter language codes, grab first full code with matching 2 first letters.
                var foundLang = false;
                for (var i = 0; i < languages.length; i++) {
                    var langCode = languages[i];
                    if (langCode.substring(0, 2) === lang) {
                        foundLang = true;
                        lang = langCode;
                        break;
                    }
                }
                if (!foundLang) {
                    logger.warn('LOC: unknown language: ' + lang + ' requested string: ' + key);
                    lang = _getDefaultLanguage();
                }
            } else {
                logger.warn('LOC: unknown language: ' + lang + ' requested string: ' + key);
                lang = _getDefaultLanguage();
            }
        }
        if (!strings[lang].hasOwnProperty(key)) {
            // fallback to default language
            if (!strings[_getDefaultLanguage()].hasOwnProperty(key)) {
                logger.warn('LOC: unknown string requested: ' + key);
                return '';
            }
            return formatString(strings[_getDefaultLanguage()][key], fieldName1, fieldValue1, fieldName2, fieldValue2, fieldName3, fieldValue3);
        }

        return formatString(strings[lang][key], fieldName1, fieldValue1, fieldName2, fieldValue2, fieldName3, fieldValue3);
    };

    // INTERNAL USE ONLY
    this._addString = function (lang, key, string) {
        strings[lang][key] = string;
    };

};

module.exports = I18N;
