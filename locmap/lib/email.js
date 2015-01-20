/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 * Email helper library for Locmap
 */

var conf = require('../../lib/config');
var logger = require('../../lib/logger');
var LocMapCommon = require('./locMapCommon');
var locMapCommon = new LocMapCommon();

var I18N = require('../../lib/i18n');
var i18n = new I18N();

var LocMapEmail = function() {
    this.emails = [];

    this._sendEmail = function(emailObj, callback) {
        if (conf.get('sendEmails')) {
            logger.trace('Using sendgrid to send email.');
            var sendgrid = require('sendgrid')(
                conf.get('sendGrid').username,
                conf.get('sendGrid').password
            );
            var email = new sendgrid.Email(emailObj);
            sendgrid.send(email, function(err) {
                if (err) {
                    logger.error('Error sending signup email to ' + emailObj.to + ' : ' + err);
                    logger.error(err);
                    callback(false);
                } else {
                    callback(true);
                }
            });
        } else {
            logger.trace('Saving email locally.');
            this.emails.push(emailObj);
            callback(true);
        }
    };

    this.sendSignupMail = function(targetEmail, langCode, callback) {
        var lang = locMapCommon.verifyLangCode(langCode);
        var subject = i18n.getLocalizedString(lang, 'signup.userEmailSubject');
        var messageText = i18n.getLocalizedString(lang, 'signup.userEmailText');

        var emailObj = {
            to: targetEmail,
            from: conf.get('senderEmail'),
            subject: subject,
            text: messageText
        };
        this._sendEmail(emailObj, callback);
    };

    this.sendInviteEmail = function(targetEmail, inviterEmail, langCode, callback) {
        logger.trace('SendInviteEmail with ' + targetEmail + ' ' + inviterEmail + ' ' + langCode);
        var lang = locMapCommon.verifyLangCode(langCode);
        var subject = i18n.getLocalizedString(lang, 'invite.userInvitedToLokkiEmailSubject');
        var messageText = i18n.getLocalizedString(lang, 'invite.userInvitedToLokkiEmailText', 'targetUser', targetEmail, 'senderUser', inviterEmail);

        var emailObj = {
            to: targetEmail,
            from: conf.get('senderEmail'),
            subject: subject,
            text: messageText
        };
        this._sendEmail(emailObj, callback);
    };

    /*
    this._generateResetText = function(targetEmail, resetLink) {
        return "Dear " + targetEmail + ",\n\n" + LocMapCommon.messageTexts.resetEmail1 + resetLink +
            LocMapCommon.messageTexts.resetEmail2;
    };
    */

    this.sendResetEmail = function(targetEmail, resetLink, langCode, callback) {
        var lang = locMapCommon.verifyLangCode(langCode);
        var subject = i18n.getLocalizedString(lang, 'reset.emailSubject');
        var messageText = i18n.getLocalizedString(lang, 'reset.emailText', 'resetLink', resetLink);
        var emailObj = {
            to: targetEmail,
            from: conf.get('senderEmail'),
            subject: subject,
            text: messageText
        };
        this._sendEmail(emailObj, callback);
    };
};

module.exports = LocMapEmail;
