/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 LocMap config.

 */

var inDeployment = process.env.PORT || false;
var inStaging = process.env.NODE_ENV === 'staging';

// Default production configuration values.
var locMapConfig = {
    locationNotificationTimeout: 300, // Don't send notifications if user location is newer than x seconds.
    recoveryCodeTimeout: 3600 * 24, // Recovery codes are valid for 1 day.
    resetCodeTimeout: 3600 * 24, // Reset codes are valid for 1 day.
    accountRecoveryModeTimeout: 3600 * 2, // Account recovery mode (anyone can re-signup) valid for 2 hours.
    adminAccountRecoveryAllowedEmails: ['bishop3000home@gmail.com', '1@r.ru', '11@r.ru', '2@r.ru', '22@r.ru',
        '3@r.ru', '33@r.ru', 'harri.kukkonen@gmail.com', 'hki0007@gmail.com', 'marbdq@gmail.com',
        'fsecure.test.10@gmail.com'],
    resetLinkAddress: 'https://lokki-server.example.com/reset/',
    maxAllowToSeeCount: 1000, // Maximum number of users a user can have on their canSeeMe list.
    maxPlacesLimitNormalUser: 5, // Maximum number of places a normal user can add.
    notificationCheckPollingInterval: 120, // How often to trigger pending notifications check in seconds.
    pendingNotificationTimeout: 600, // How long to wait for location from client before sending a visible notification. Should always be larger than locationNotificationTimeout
    visibleNotificationLimit: 3600 * 24 * 1, // How often to allow sending a visible notification to user, 1 / day.
    invisibleNotificationLimit: 60 * 15, // How often to allow sending an invisible notification to user, 1 / 15 minutes.
    backgroundNotificationInterval: 60 * 60, // How often to run the background user invisible notification loop.
    backgroundNotificationLocationAgeLimit: 60 * 30, // How old locations should be renewed in the background notification loop.
    backgroundNotificationUserActivityAgeLimit: 3600 * 24 * 14 // How recently user must have accessed dashboard in order to receive a background location update poll.
};

// We are in staging environment.
if (inDeployment && inStaging) {
    locMapConfig.locationNotificationTimeout = 60;
    locMapConfig.recoveryCodeTimeout = 60;
    locMapConfig.resetLinkAddress = 'https://lokki-test-environment.herokuapp.com/reset/';
    locMapConfig.notificationCheckPollingInterval = 60;
    locMapConfig.pendingNotificationTimeout = 60 * 5;
    locMapConfig.visibleNotificationLimit = 60 * 60;
    locMapConfig.backgroundNotificationInterval = 60 * 10;
    locMapConfig.backgroundNotificationLocationAgeLimit = 5;
}

// Running locally
if (!inDeployment && !inStaging) {
    locMapConfig.recoveryCodeTimeout = 1;
    locMapConfig.resetLinkAddress = 'https://localhost:9000/reset/';
    locMapConfig.maxAllowToSeeCount = 5;
    locMapConfig.maxPlacesLimitNormalUser = 2;
    locMapConfig.notificationCheckPollingInterval = 1;
    locMapConfig.pendingNotificationTimeout = 0;
    locMapConfig.notificationCheckPollingInterval = 10;
}

module.exports = locMapConfig;
