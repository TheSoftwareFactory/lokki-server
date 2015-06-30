/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Recovery code API methods

 ERROR Codes:
 - 200: Success
 - 400: Generic error. Most probably DB related.
 - 403: Confirmation code is wrong
 - 404: Confirmation code not found

 */

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var db = require('../../lib/db');

var modelPrefix = 'locmaprecoverycode:';

var RecoveryCode = function(userId) {
    this.exists = false; // will be true after getData or when recoverycode has been created.
    this.data = {
        userId: userId,
        recoveryCode: ''
    };

    // returns confirmation SMS data or 404 if not found (through callback).
    // data is an object like defined in this.data
    this.getRecoveryCodeData = function(callback) {
        var that = this;
        db.get(modelPrefix + this.data.userId, function(error, result) {
            var finalResult = 0;
            if (result) {
                var resultData = that._deserializeData(result);
                resultData.userId = that.data.userId;
                that.data.recoveryCode = resultData.recoveryCode;
                that.exists = true;
                finalResult = resultData;
            } else {
                finalResult = 404;
                that.exists = false;
            }
            callback(finalResult);
        });
    };

    this.createRecoveryCode = function(callback) {
        var that = this;
        // Always generate new recovery code
        this.data.recoveryCode = this._generateRecoveryCode();
        var serializedData = this._serializeData(this.data);
        db.setex(modelPrefix + this.data.userId, conf.get('locMapConfig').recoveryCodeTimeout, serializedData, function(error, result) {
            if (error) {
                result = 400;
                logger.error('Error storing user ' + that.data.userId + ' recovery code');
            } else {
                that.exists = true;
                result = that.data.recoveryCode;
            }
            callback(result);
        });
    };

    // TODO FIXME Use simpler method.
    // Ascii: 65-90 = A-Z
    this._getRandomCapitalLetter = function() {
        var code = Math.floor(Math.random() * (90 - 65 + 1) + 65);
        return String.fromCharCode(code);
    };

    // 0-9
    this._getRandomNumber = function() {
        var number = Math.floor(Math.random() * (9 - 0 + 1) + 0);
        return number.toString();
    };

    // Code format, two capital letters, one number, two capital letters: AB9CD
    this._generateRecoveryCode = function() {
        // Detect if we run unit tests (in local machine), and return AA1AA. Otherwise, generate random code.
        if (conf.get('env') === 'test') {
            return 'AA1AA';
        } else {
            var recoveryCode = this._getRandomCapitalLetter();
            recoveryCode += this._getRandomCapitalLetter();
            recoveryCode += this._getRandomNumber();
            recoveryCode += this._getRandomCapitalLetter();
            recoveryCode += this._getRandomCapitalLetter();
            return recoveryCode;
        }
    };

    this._deserializeData = function(rawData) {
        var data = {};
        try {
            data = JSON.parse(rawData);
        } catch (error) {
            logger.error('Error while deserializing a recovery code: ' + error);
        }
        return data;
    };

    this._serializeData = function(data) {
        var serializedData = '';
        try {
            serializedData = JSON.stringify(data);
        } catch (error) {
            logger.error('Error while serializing a recovery code: ' + error);
        }
        return serializedData;
    };

};

module.exports = RecoveryCode;
