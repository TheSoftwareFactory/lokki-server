'use strict';
var conf = require('./config');
module.exports = require('tracer').colorConsole(conf.get('logging'));
