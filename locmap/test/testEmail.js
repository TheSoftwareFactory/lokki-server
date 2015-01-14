/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

/*
 Test file: User API methods
 */

var LocMapEmail = require('../lib/email');
var locMapEmail;
var I18N = require('../../lib/i18n');
var i18n = new I18N();

var noReply = 'no-reply@example.com';
var targetUser = 'targetuser@example.com';
var senderUser = 'senderuser@example.com';

module.exports = {
    setUp: function(callback) {
        locMapEmail = new LocMapEmail();
        callback();
    },

    testSignupEmailSend: function(test) {
        test.expect(3);
        locMapEmail.sendSignupMail(targetUser, 'en-US', function(result) {
            test.ok(result);
            test.equal(locMapEmail.emails.length, 1);
            test.deepEqual(locMapEmail.emails[0], {to: targetUser, from: noReply,
                subject: i18n.getLocalizedString('en-US', 'signup.userEmailSubject'),
                text: i18n.getLocalizedString('en-US', 'signup.userEmailText')});
            test.done();
        });
    },

    testInviteEmailSend: function(test) {
        test.expect(3);
        locMapEmail.sendInviteEmail(targetUser, senderUser, 'en-US', function(result) {
            test.ok(result);
            test.equal(locMapEmail.emails.length, 1);
            test.deepEqual(locMapEmail.emails[0], {to: targetUser, from: noReply,
                subject: i18n.getLocalizedString('en-US', 'invite.userInvitedToLokkiEmailSubject'),
                text: i18n.getLocalizedString('en-US', 'invite.userInvitedToLokkiEmailText', 'targetUser', targetUser, 'senderUser', senderUser)});
            test.done();
        });
    },

    testResetEmailSend: function(test) {
        test.expect(3);
        var resetLink = 'https://lokki-server.example.com/api/reset/deadbeef';
        locMapEmail.sendResetEmail(targetUser, resetLink, 'en-US', function(result) {
            test.ok(result);
            test.equal(locMapEmail.emails.length, 1);
            test.deepEqual(locMapEmail.emails[0], {to: targetUser, from: noReply,
                subject: i18n.getLocalizedString('en-US', 'reset.emailSubject'),
                text: i18n.getLocalizedString('en-US', 'reset.emailText', 'resetLink', resetLink)});
            test.done();
        });
    }

};
