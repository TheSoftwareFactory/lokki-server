'use strict';

/*
    Deleting *all* data related to a user from the database.
*/

var db = require('../../lib/db');
var logger = require('../../lib/logger');
var conf = require('../../lib/config');
var LocMapUserModel = require('./locMapUserModel');
var LocMapShareModel = require('./locMapShareModel');

var assert = require('assert');
var suspend = require('suspend');

var userPrefix = conf.get('db').userPrefix;
var sharePrefix = conf.get('db').sharePrefix;
var codePrefix = conf.get('db').deleteCodePrefix; 

exports.deleteUser = suspend(function* (userId, callback) {

    try {
        yield db.del(userPrefix + userId, suspend.resume());
        yield db.del(sharePrefix + userId, suspend.resume());
        yield db.del(codePrefix + userId, suspend.resume());

        var shareKeys = yield db.keys(sharePrefix+'*', suspend.resume());

        for (var i = 0; i < shareKeys.length; ++i) {

            var id = shareKeys[i].split(':')[1];
            var share = new LocMapShareModel(id);

            var result = yield share.getData(suspend.resumeRaw());
            
            if (result[0] === 404) {
                throw new Error('Could not read data for '+shareKeys[i]);
            } else {
                var data = result[0];
            }

            var lists = [
                data.canSeeMe, 
                data.ICanSee, 
                data.ignored
            ];
            
            for (var j = 0; j < lists.length; ++j) {
                var ix = lists[j].indexOf(userId);
                if (j > -1) {
                    lists[j].splice(ix, 1);
                }
            }

            if (!!data.nameMapping) {
                var mapping = JSON.parse(data.nameMapping);
                if (!!mapping[userId]) {
                    delete mapping[userId];
                }
                data.nameMapping = JSON.stringify(mapping);
            }

            var result = yield share.setData(suspend.resumeRaw(), data);

            if (result[0] === 404) {
                throw new Error('Could not write '+shareKeys[i]);
            }
        }

        return callback(null);

    } catch (err) {
        logger.error('Error deleting user with id '+userId+': '+err);
        return callback(err);
    }
});

exports.tryDeleteUser = suspend(function* (userId, deleteCode, callback) {
    var code = yield getDeleteCode(userId, suspend.resume());
    if (code === null) return callback(null, 404);
    if (code !== deleteCode) { 
        return callback(null, 401);
    }
    yield exports.deleteUser(userId, suspend.resume());
    return callback(null, 'OK');
});

exports.makeDeleteCode = suspend(function* (userId, callback) {
    var code = generateCode();
    try {
        yield db.hmset(codePrefix + userId, {
                userId: userId,
                code: code
            }, suspend.resume());
    } catch (err) {
        return callback(err);
    }
    return callback(null, code);
});

var getDeleteCode = suspend(function* (userId, callback) {
    try {
        var result = yield db.hgetall(codePrefix + userId, suspend.resume());
    } catch (err) {
        return callback(err);
    }
    if (result === null) return callback(null, null);

    assert.ok(result.userId === userId);
    return callback(null, result.code);
});

var generateCode = function () {
    var s = '';
    var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    for (var i = 0; i < 32; ++i) {
        s += chars.charAt(Math.floor(Math.random() * chars.length)); 
    }
    return s;
}
