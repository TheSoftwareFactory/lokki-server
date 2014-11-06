/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/
/*
 Test file: User API methods
 */
var locMapEmail = require("../lib/email");
var LocMapEmail = undefined;
var I18N = require('../../lib/i18n');
var i18n = new I18N();

var noReply = "no-reply@example.com";
var targetUser = "targetuser@example.com";
var senderUser = "senderuser@example.com";

module.exports = {
    setUp: function (callback) {
        LocMapEmail = new locMapEmail();
        callback();
    },

    testSignupEmailSend: function(test) {
        test.expect(3);
        LocMapEmail.sendSignupMail(targetUser, 'en-US', function(result) {
            test.ok(result);
            test.equal(LocMapEmail.emails.length, 1);
            test.deepEqual(LocMapEmail.emails[0], {to: targetUser, from: noReply,
                subject: i18n.getLocalizedString('en-US', "signup.userEmailSubject"),
                text: i18n.getLocalizedString('en-US', "signup.userEmailText")});
            test.done();
        });
    },

    testInviteEmailSend: function(test) {
        test.expect(3);
        LocMapEmail.sendInviteEmail(targetUser, senderUser, "en-US", function(result) {
            test.ok(result);
            test.equal(LocMapEmail.emails.length, 1);
            test.deepEqual(LocMapEmail.emails[0], {to: targetUser, from: noReply,
                subject: i18n.getLocalizedString('en-US', "invite.userInvitedToLokkiEmailSubject"),
                text: i18n.getLocalizedString('en-US', "invite.userInvitedToLokkiEmailText", "targetUser", targetUser, "senderUser", senderUser)});
            test.done();
        });
    },

    testResetEmailSend: function(test) {
        test.expect(3);
        var resetLink = "https://lokki-server.example.com/api/reset/deadbeef";
        LocMapEmail.sendResetEmail(targetUser, resetLink, "en-US", function(result) {
            test.ok(result);
            test.equal(LocMapEmail.emails.length, 1);
            test.deepEqual(LocMapEmail.emails[0], {to: targetUser, from: noReply,
                subject: i18n.getLocalizedString('en-US', "reset.emailSubject"),
                text: i18n.getLocalizedString('en-US', "reset.emailText", "resetLink", resetLink)});
            test.done();
        });
    }

};
