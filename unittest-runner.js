#!/usr/bin/env node

/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

var reporter = require('nodeunit').reporters.default;

global.lokkiUnitTestingMode = {};// just inform everyone that we are in "run unittests" mode

// Start all tests
reporter.run(['locmap/test', 'test']);
