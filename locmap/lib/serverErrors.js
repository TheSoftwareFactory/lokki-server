/**
 * Created by suakbas on 25.11.2015.
 */
'use strict';

/*
 * Server Errors
 */

//ErrorCode should be unique for each error.
//Error Types are
// Type 0: Only display, take no action.
// Type 1: Force application to close.
// Type 2: Force application to sign up again.
//Client side takes these actions according to the error types.
var ServerErrors = {
    'GenericError': { 'ErrorCode':'0', 'ErrorType':'0', 'ErrorMessage':'An unknown error occured.' },
    'OutOfDateVersionError': { 'ErrorCode':'1', 'ErrorType':'1', 'ErrorMessage':'Your application is out of date. Please download the new version from Google Play Store.' },
    'AccountExpiredError': { 'ErrorCode':'2', 'ErrorType':'2', 'ErrorMessage':'Your account has expired. Please sign up again.' }
};

module.exports = ServerErrors;