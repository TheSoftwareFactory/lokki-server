/**
 * Created by suakbas on 25.11.2015.
 */
'use strict';

/*
 * Server Errors
 */

/*
 * ErrorCode should be unique for each error.
 * Error Types are
 * Type DISPLAY_ONLY: Only display, take no action.
 * Type FORCE_TO_CLOSE: Force application to close.
 * Type FORCE_TO_SIGN_UP: Force application to sign up again.
 * Client side takes these actions according to the error types.
 */
var ServerErrors = {
    'GenericError': { 'ErrorCode':'0', 'ErrorType':'DISPLAY_ONLY', 'ErrorMessage':'An unknown error occured.' },
    'OutOfDateVersionError': { 'ErrorCode':'1', 'ErrorType':'FORCE_TO_CLOSE', 'ErrorMessage':'Your application is out of date. Please download the new version from Google Play Store.' },
    'AccountExpiredError': { 'ErrorCode':'2', 'ErrorType':'FORCE_TO_SIGN_UP', 'ErrorMessage':'Your account has expired. Please sign up again.' }
};

module.exports = ServerErrors;