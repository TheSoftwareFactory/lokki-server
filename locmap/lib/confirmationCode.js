/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Confirmation code API methods

 ERROR Codes:
 - 400: Generic error. Most probably DB related.
 - 404: Confirmation code not found.
 */

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var db = require('../../lib/db');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();

var modelPrefix = 'locmapconfirmationcode:';

// Not an actual model to make usage of this simpler.
var ConfirmationCode = function () {
    // Returns confirmation code data if successful, or number if failed.
    // Confirmation code data: {confirmationCode: 'abcdef1234', userId: 'theid'}
    this.getConfirmationCodeData = function (userId, confirmationCode, callback) {
        var that = this;
        db.get(modelPrefix + userId, function (error, result) {
            if (result) {
                result = that._deserializeData(result);
                if (result.confirmationCode !== confirmationCode) {
                    result = 403;
                }
            } else {
                result = 404;
            }
            callback(result);
        });
    };

    this.removeConfirmationCode = function (userId, callback) {
        db.del(modelPrefix + userId, function (error, result) {
            if (error) {
                result = -1;
            }
            callback(result);
        });
    };

    this.createConfirmationCode = function (userId, callback) {
        var confirmationCode = locMapCommon.generateConfirmationCode(),
            data = {confirmationCode: confirmationCode, userId: userId},
            serializedData = this._serializeData(data);
            db.setex(modelPrefix + userId, conf.get('locMapConfig').confirmationCodeTimeout,
                serializedData, function (error, result) {
                    if (error) {
                        result = 400;
                        logger.error('Error storing user ' + userId + ' confirmation code');
                    } else {
                        result = confirmationCode;
                    }
                    callback(result);
            });
    };

    this._deserializeData = function (rawData) {
        var data = {};
        try {
            data = JSON.parse(rawData);
        } catch (error) {
            logger.error('Error while deserializing a confirmation code: ' + error);
        }
        return data;
    };

    this._serializeData = function (data) {
        var serializedData = '';
        try {
            serializedData = JSON.stringify(data);
        } catch (error) {
            logger.error('Error while serializing a confirmation code: ' + error);
        }
        return serializedData;
    };

};

module.exports = ConfirmationCode;
