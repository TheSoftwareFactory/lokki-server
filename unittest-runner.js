/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

process.env.NODE_ENV = 'test';

var reporter = require('nodeunit').reporters.default;

global.lokkiUnitTestingMode = {};// just inform everyone that we are in "run unittests" mode

// Start all tests
reporter.run(['locmap/test', 'test'], null, function(err) {
    // Redis connection should be closed after tests are run, otherwise process will hang
    var db = require('./lib/db');
    db.quit();
    if (err) {
        throw err;
    }
});
