/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
// Quite Redis, so that the unittests stop hanging.
var db = require('../lib/db');
db.quit();
console.log('\nUnit testing finished, Redis closed.\n');
