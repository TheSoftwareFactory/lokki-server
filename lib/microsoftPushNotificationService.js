/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var conf = require('./config');
var logger = require('./logger');
var mpns = require('mpns');

// Implementation of MS messaging service for wp8
var MicrosoftPushNotificationService = function() {
    logger.trace('MicrosoftPushNotificationService created');
    this.notifications = {};// we just store notifications here if not in production. key is token, value is array of messages for this token
};

MicrosoftPushNotificationService.prototype = {};

// push notification to device with deviceToken and text notificationText.
// You can define payload which will be sent also to client or leave it undefined. payload must be an object
MicrosoftPushNotificationService.prototype.pushNotification = function(URL, notificationText) {
    // Detect if we run unit tests (in local machine), and dont push notifications.
    if (conf.get('pushNotifications')) {
        if (this.notifications[URL] === undefined) {
            this.notifications[URL] = [];
        }
        this.notifications[URL].push(notificationText);// we just store notifications here if not in production
        return;
    }

    logger.trace('Sending toast to ' + URL + ': ' + notificationText);

    mpns.sendToast(URL, 'Lokki: ', notificationText, function(err, desc) {
        if (err) {
            logger.error('MPNS returned error: ' + JSON.stringify(err) + ', ' + JSON.stringify(desc));
        }
    });
};

module.exports = MicrosoftPushNotificationService;
