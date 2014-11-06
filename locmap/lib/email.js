/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 * Email helper library for Locmap
 *
 */
var locMapCommon = require('./locMapCommon');
var LocMapCommon = new locMapCommon();

var noReplyAddress = 'no-reply@example.com';
var I18N = require('../../lib/i18n');
var i18n = new I18N();

var LocMapEmail = function() {
    this.emails = [];

    this._sendEmail = function(emailObj, callback) {
        var inProduction = process.env.PORT || false;
        console.log("sendEmail, production: " + inProduction);
        if (inProduction) {
            console.log("In production, using sendgrid to send email.");
            var sendgrid = require("sendgrid")(
               process.env.SENDGRID_USERNAME,
               process.env.SENDGRID_PASSWORD
            );
            var email = new sendgrid.Email(emailObj);
            sendgrid.send(email, function(err, json) {
                if (err) {
                    console.log("Error sending signup email to " + emailObj.to + " : " + err);
                    console.error(err);
                    callback(false);
                } else {
                    callback(true);
                }
            });
        } else {
            console.log("Unittesting, saving email locally.");
            this.emails.push(emailObj);
            callback(true);
        }
    };

    this.sendSignupMail = function(targetEmail, langCode, callback) {
        var that = this;
        var lang = LocMapCommon.verifyLangCode(langCode);
        var subject = i18n.getLocalizedString(lang, "signup.userEmailSubject");
        var messageText = i18n.getLocalizedString(lang, "signup.userEmailText");

        var emailObj = {
            to: targetEmail,
            from: noReplyAddress,
            subject: subject,
            text: messageText
        };
        that._sendEmail(emailObj, callback);
    };

    this.sendInviteEmail = function(targetEmail, inviterEmail, langCode, callback) {
        var that = this;
        //console.log("sendInviteEmail with " + targetEmail + " " + inviterEmail + " " + langCode);
        var lang = LocMapCommon.verifyLangCode(langCode);
        var subject = i18n.getLocalizedString(lang, "invite.userInvitedToLokkiEmailSubject");
        var messageText = i18n.getLocalizedString(lang, "invite.userInvitedToLokkiEmailText", "targetUser", targetEmail, "senderUser", inviterEmail);
        //var finalText = LocMapCommon.messageTexts.inviteEmailText1 + targetEmail +
        //    LocMapCommon.messageTexts.inviteEmailText2 + inviterEmail + LocMapCommon.messageTexts.inviteEmailText3;
        var emailObj = {
            to: targetEmail,
            from: noReplyAddress,
            subject: subject,
            text: messageText
        };
        that._sendEmail(emailObj, callback);
    };

    /*
    this._generateResetText = function(targetEmail, resetLink) {
        return "Dear " + targetEmail + ",\n\n" + LocMapCommon.messageTexts.resetEmail1 + resetLink +
            LocMapCommon.messageTexts.resetEmail2;
    };
    */

    this.sendResetEmail = function(targetEmail, resetLink, langCode, callback) {
        var that = this;
        var lang = LocMapCommon.verifyLangCode(langCode);
        var subject = i18n.getLocalizedString(lang, "reset.emailSubject");
        var messageText = i18n.getLocalizedString(lang, "reset.emailText", "resetLink", resetLink);
         var emailObj = {
            to: targetEmail,
            from: noReplyAddress,
            subject: subject,
            text: messageText
         };
        that._sendEmail(emailObj, callback);
    };
};

module.exports = LocMapEmail;