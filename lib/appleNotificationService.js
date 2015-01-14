/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var conf = require('./config');
var logger = require('./logger');
var apns = require('apn');

var apnsErrorCallback = function(err, notification) {
    if (err !== 8) {
        logger.error('AppleNotificationService not delivered: ' + err + ' : ' + JSON.stringify(notification));
    }
};

var apnsErrorCallbackDev = function(err, notification) {
    if (err !== 8) {
        logger.error('AppleNotificationService dev not delivered: ' + err + ' : ' + JSON.stringify(notification));
    }
};

var apnsErrorCallbackAppStore = function(err, notification) {
    if (err !== 8) {
        logger.error('apnsErrorCallbackAppStore not delivered: ' + err + ' : ' + JSON.stringify(notification));
    }
};

// Implementation of Apple Notification Service API
var AppleNotificationService = function() {

    // official appstore build notifications
    var optionsAppStore = {
        cert: './certs/appStore/lokki_aps_prod_cer.pem',  /* Certificate file path */
        // cert: './certs/dev/lokki_aps_dev_cer.pem',  /* dev Certificate file path */
        certData: null,                   /* String or Buffer containing certificate data, if supplied uses this instead of cert file path */
        key: './certs/appStore/lokki_aps_prod_key.pem',  /* Key file path */
        // key:  './certs/dev/lokki_aps_dev_key.pem',  /* dev Key file path */
        keyData: null,                    /* String or Buffer containing key data, as certData */
        passphrase: 'df478444',           /* A passphrase for the Key file */
        ca: null,                         /* String or Buffer of CA data to use for the TLS connection */
        pfx: null,                        /* File path for private key, certificate and CA certs in PFX or PKCS12 format. If supplied will be used instead of certificate and key above */
        pfxData: null,                    /* PFX or PKCS12 format data containing the private key, certificate and CA certs. If supplied will be used instead of loading from disk. */
        // gateway: 'gateway.sandbox.push.apple.com',/* development gateway address */
        // gateway: 'gateway.push.apple.com',   /* production gateway address, may be omitted */
        port: 2195,                       /* gateway port */
        rejectUnauthorized: true,         /* Value of rejectUnauthorized property to be passed through to tls.connect() */
        enhanced: true,                   /* enable enhanced format */
        errorCallback: apnsErrorCallbackAppStore,         /* Callback when error occurs function(err,notification) */
        cacheLength: 100,                 /* Number of notifications to cache for error purposes */
        autoAdjustCache: true,            /* Whether the cache should grow in response to messages being lost after errors. */
        connectionTimeout: 0              /* The duration the socket should stay alive with no activity in milliseconds. 0 = Disabled. */
    };


    // production build for internal rollout
    var options = {
        cert: './certs/prod/lokki_aps_prod_cer.pem',  /* Certificate file path */
        // cert: './certs/dev/lokki_aps_dev_cer.pem',  /* dev Certificate file path */
        certData: null,                   /* String or Buffer containing certificate data, if supplied uses this instead of cert file path */
        key: './certs/prod/lokki_aps_prod_key.pem',  /* Key file path */
        // key:  './certs/dev/lokki_aps_dev_key.pem',  /* dev Key file path */
        keyData: null,                    /* String or Buffer containing key data, as certData */
        passphrase: 'df478444',           /* A passphrase for the Key file */
        ca: null,                         /* String or Buffer of CA data to use for the TLS connection */
        pfx: null,                        /* File path for private key, certificate and CA certs in PFX or PKCS12 format. If supplied will be used instead of certificate and key above */
        pfxData: null,                    /* PFX or PKCS12 format data containing the private key, certificate and CA certs. If supplied will be used instead of loading from disk. */
        // gateway: 'gateway.sandbox.push.apple.com',/* development gateway address */
        // gateway: 'gateway.push.apple.com',   /* production gateway address, may be omitted */
        port: 2195,                       /* gateway port */
        rejectUnauthorized: true,         /* Value of rejectUnauthorized property to be passed through to tls.connect() */
        enhanced: true,                   /* enable enhanced format */
        errorCallback: apnsErrorCallback,         /* Callback when error occurs function(err,notification) */
        cacheLength: 100,                 /* Number of notifications to cache for error purposes */
        autoAdjustCache: true,            /* Whether the cache should grow in response to messages being lost after errors. */
        connectionTimeout: 0              /* The duration the socket should stay alive with no activity in milliseconds. 0 = Disabled. */
    };


    // development signed builds
    var optionsDev = {
        cert: './certs/dev/lokki_aps_dev_cer.pem',  /* dev Certificate file path */
        certData: null,                   /* String or Buffer containing certificate data, if supplied uses this instead of cert file path */
        key: './certs/dev/lokki_aps_dev_key.pem',  /* dev Key file path */
        keyData: null,                    /* String or Buffer containing key data, as certData */
        passphrase: 'df478444',           /* A passphrase for the Key file */
        ca: null,                         /* String or Buffer of CA data to use for the TLS connection */
        pfx: null,                        /* File path for private key, certificate and CA certs in PFX or PKCS12 format. If supplied will be used instead of certificate and key above */
        pfxData: null,                    /* PFX or PKCS12 format data containing the private key, certificate and CA certs. If supplied will be used instead of loading from disk. */
        gateway: 'gateway.sandbox.push.apple.com',/* development gateway address */
        port: 2195,                       /* gateway port */
        rejectUnauthorized: true,         /* Value of rejectUnauthorized property to be passed through to tls.connect() */
        enhanced: true,                   /* enable enhanced format */
        errorCallback: apnsErrorCallbackDev, /* Callback when error occurs function(err,notification) */
        cacheLength: 100,                 /* Number of notifications to cache for error purposes */
        autoAdjustCache: true,            /* Whether the cache should grow in response to messages being lost after errors. */
        connectionTimeout: 0              /* The duration the socket should stay alive with no activity in milliseconds. 0 = Disabled. */
    };

    this.apnsConnection = new apns.Connection(options);
    this.devAPNSConnection = new apns.Connection(optionsDev);
    this.appStoreAPNSConnection = new apns.Connection(optionsAppStore);

    this.notifications = {};// we just store notifications here if not in production. key is token, value is array of messages for this token

};

AppleNotificationService.prototype = {};

// push notification to device with deviceToken and text notificationText.
// You can define payload which will be sent also to client or leave it undefined. payload must be an object
AppleNotificationService.prototype.pushNotification = function(deviceToken, notificationText, payload, silent) {
    // logger.info("Sending APN to " + deviceToken + ". text: " + notificationText + " payload: " + payload + " silent: " + silent);
    // Detect if we run unit tests (in local machine), and dont push notifications.
    if (conf.get('pushNotifications')) {
        if (this.notifications[deviceToken] === undefined) {
            this.notifications[deviceToken] = [];
        }
        this.notifications[deviceToken].push(notificationText);// we just store notifications here if not in production
        return;
    }

    var myDevice = new apns.Device(deviceToken);
    var note = new apns.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    if (silent) {
        note.contentAvailable = 1;
        note.sound = '';
    } else {
        note.sound = 'ping.aiff';
        note.alert = notificationText;
        note.badge = 1;
        if (payload) {
            note.payload = payload;
        }
    }

    this.apnsConnection.pushNotification(note, myDevice);
    this.devAPNSConnection.pushNotification(note, myDevice); // DEBUG: we want to get notifications to dev machines also. remove me when no need
    this.appStoreAPNSConnection.pushNotification(note, myDevice);
};

module.exports = AppleNotificationService;
