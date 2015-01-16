/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var redis = require('redis');
var url = require('url');
var conf = require('./config');

var client;

var redisURL = url.parse(conf.get('redis').url);
client = redis.createClient(redisURL.port, redisURL.hostname, conf.get('redis').options);
if (redisURL.auth !== null) {
	client.auth(redisURL.auth.split(':')[1]);
}
module.exports = client;
