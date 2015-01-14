/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var GCM = require('gcm').GCM;

// Implementation of google messaging service for Android
var LocMapGoogleCloudMessagingService = function() {
    this.notifications = {};// we just store notifications here if not in production. key is token, value is array of messages for this token
    this.gcm = new GCM('AIzaSyBoebawHMikB1pYALYz4k9ELCorM232RDk');

};

LocMapGoogleCloudMessagingService.prototype = {};
// push notification to device with deviceToken and text notificationText.
// You can define payload which will be sent also to client or leave it undefined. payload must be an object
LocMapGoogleCloudMessagingService.prototype.pushNotification = function(deviceToken, notificationText, payload) {
    // Detect if we run unit tests (in local machine), and dont push notifications.
    var inProduction = process.env.PORT || false;
    if (!inProduction) {
        if (this.notifications[deviceToken] === undefined) {
            this.notifications[deviceToken] = [];
        }
        this.notifications[deviceToken].push(notificationText);// we just store notifications here if not in production
        return;
    }

    var message = {
        'registration_id': deviceToken, // required
        'collapse_key': 'Message',
        'data.message': notificationText
    };
    if (payload) {
        message['data.payload'] = JSON.stringify(payload);
    }

    // console.log("GCM Send for device: " + deviceToken);
    this.gcm.send(message, function(err) {
        if (err) {
            console.log('GoogleCloudMessagingService send error: ' + err);
        }
    });

};

module.exports = LocMapGoogleCloudMessagingService;
