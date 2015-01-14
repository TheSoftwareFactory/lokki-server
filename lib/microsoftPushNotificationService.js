/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var mpns = require('mpns');

// Implementation of MS messaging service for wp8
var MicrosoftPushNotificationService = function() {
    console.log('MicrosoftPushNotificationService created');
    this.notifications = {};// we just store notifications here if not in production. key is token, value is array of messages for this token
};

MicrosoftPushNotificationService.prototype = {};

// push notification to device with deviceToken and text notificationText.
// You can define payload which will be sent also to client or leave it undefined. payload must be an object
MicrosoftPushNotificationService.prototype.pushNotification = function(URL, notificationText) {
    // Detect if we run unit tests (in local machine), and dont push notifications.
    var inProduction = process.env.PORT || false;
    if (!inProduction) {
        if (this.notifications[URL] === undefined) {
            this.notifications[URL] = [];
        }
        this.notifications[URL].push(notificationText);// we just store notifications here if not in production
        return;
    }

    // console.log("Sending toast to " + URL + ": " + notificationText);

    mpns.sendToast(URL, 'Lokki: ', notificationText, function(err, desc) {
        if (err) {
            console.log('MPNS returned error: ' + JSON.stringify(err) + ', ' + JSON.stringify(desc));
        }
    });
};

module.exports = MicrosoftPushNotificationService;
