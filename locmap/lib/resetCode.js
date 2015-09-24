/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Recovery code API methods

 ERROR Codes:
 - 400: Generic error. Most probably DB related.
 - 404: Reset code not found.
 */

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var db = require('../../lib/db');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();

var modelPrefix = 'locmapresetcode:';

// Not an actual model to make usage of this simpler.
var ResetCode = function () {
    // Returns reset code data if successful, or number if failed.
    // Reset code data: {resetCode: 'abcdef1234', userId: 'theid'}
    this.getResetCodeData = function (userId, resetCode, callback) {
        var that = this;
        db.get(modelPrefix + userId, function (error, result) {
            if (result) {
                result = that._deserializeData(result);
                if (result.resetCode !== resetCode) {
                    result = 403;
                }
            } else {
                result = 404;
            }
            callback(result);
        });
    };

    this.removeResetCode = function (userId, callback) {
        db.del(modelPrefix + userId, function (error, result) {
            if (error) {
                result = -1;
            }
            callback(result);
        });
    };

    this.createResetCode = function (userId, callback) {
        var resetCode = locMapCommon.generateResetToken(),
            data = {resetCode: resetCode, userId: userId},
            serializedData = this._serializeData(data);
        db.setex(modelPrefix + userId, conf.get('locMapConfig').resetCodeTimeout,
            serializedData, function (error, result) {
                if (error) {
                    result = 400;
                    logger.error('Error storing user ' + userId + ' reset code');
                } else {
                    result = resetCode;
                }
                callback(result);
            });
    };

    this._deserializeData = function (rawData) {
        var data = {};
        try {
            data = JSON.parse(rawData);
        } catch (error) {
            logger.error('Error while deserializing a reset code: ' + error);
        }
        return data;
    };

    this._serializeData = function (data) {
        var serializedData = '';
        try {
            serializedData = JSON.stringify(data);
        } catch (error) {
            logger.error('Error while serializing a reset code: ' + error);
        }
        return serializedData;
    };

};

module.exports = ResetCode;
