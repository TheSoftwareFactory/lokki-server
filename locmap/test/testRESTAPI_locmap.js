/*
Copyright (c) 2014-2015 F-Secure
See LICENSE for details
*/

'use strict';

var helpers = require('../../test_helpers/test_helpers');
var lmHelpers = require('../test_helpers/locMapHelpers');

var testUserEmail = 'user1@example.com.invalid';
var testUserEmail2 = 'user2@example.com.invalid';
var testUserEmail3 = 'user3@example.com.invalid';

var testStubUser = 'testuser@fi.invalid';

var userDashboard = {};
var userDashboard2 = {};

module.exports = {

    // this function must be first as it starts server for testing
    startServer: function (test) {
        helpers.startServer(test);
    },

    setUp: function (callback) {
        helpers.cleanDB(function () {
            callback();
        });
        userDashboard = JSON.parse(JSON.stringify(lmHelpers.userDashboard));
        userDashboard2 = JSON.parse(JSON.stringify(lmHelpers.userDashboard));
    },

    tearDown: function (callback) {
        callback();
    },

    // User signup call returns correct information.
    userSignUpReply: function (test) {
        test.expect(7);
        lmHelpers.api.post(test, '/v1/signup', {'data': {'email': testUserEmail,
            'device_id': 'testDeviceId'}}, {headers: {'content-type':
            'application/json; charset=utf-8'}}, function (res) {
            var result = res.data;
            test.equal(result.id, '31ec43882c3898c7f8d72d6107cff6f38fb515b7');
            test.ok(typeof result.authorizationtoken === 'string');
            test.equal(result.authorizationtoken.length, 10);
            test.deepEqual(result.icansee, []);
            test.deepEqual(result.canseeme, []);
            test.done();
        });
    },

    // User signup with invalid email gives an error and user is not created.
    userSignupInvalidEmail: function (test) {
        test.expect(3);
        lmHelpers.api.post(test, '/v1/signup', {data:
            {email: 'thisisnotanemail@', 'device_id': 'someid'}},
            {status: 400, headers: {'content-type': 'text/html; charset=utf-8'}}, function (res) {
                test.equal(res.body, 'Invalid email address.');
                test.done();
            });
    },

    // Second signup call with different device id fails.
    userSignUpDeviceIdNotAuthorized: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function () {
            lmHelpers.api.post(test, '/v1/signup', {'data': {'email': testUserEmail,
                'device_id': 'differentid'}}, {status: 401}, function (res) {
                test.equal(res.body, 'Signup authorization failed.');
                test.done();
            });
        });
    },

    // Uppercases in email are forced to lower.
    userSignupLowerCasesEmail: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUser(test, 'testuser1@example.com', 'dev1', function (auth1, reply1) {
            lmHelpers.api.post(test, '/v1/signup', {data: {email: 'tEsTuSeR1@EXample.COM',
                'device_id': 'dev1'}}, {status: 200}, function (res) {
                test.equal(res.data.id, reply1.id);
                test.done();
            });
        });
    },

    // User dashboard requires authentication.
    userDashboardAuthentication: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth, reply) {
            lmHelpers.api.get(test, '/v1/user/' + reply.id + '/dashboard',
                {headers: {authorizationtoken: ''}}, lmHelpers.wrongAuthTokenResult, function () {
                    test.done();
                });
        });
    },

    // User dashboard has correct information.
    userDashBoardNewUser: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth, reply) {
            lmHelpers.api.get(test, '/v1/user/' + reply.id + '/dashboard', auth, function (res) {
                var idMapping = {};
                idMapping[reply.id] = testUserEmail;
                userDashboard.idmapping = idMapping;
                test.deepEqual(res.data, userDashboard);
                test.done();
            });
        });
    },

    // User dashboard contains location when it has been posted.
    userDashBoardWithLocation: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth, reply) {
            var authWithLocation = JSON.parse(JSON.stringify(auth));
            authWithLocation.data = JSON.parse(JSON.stringify(lmHelpers.locMapReport1));
            lmHelpers.api.post(test, '/v1/user/' + reply.id + '/location', authWithLocation,
                function () {
                    lmHelpers.api.get(test, '/v1/user/' + reply.id + '/dashboard', auth,
                        function (res) {
                            lmHelpers.compareLocation(test, res.data.location,
                                lmHelpers.locMapReport1.location);
                            test.done();
                        });
                });
        });
    },

    // User dashboard contains battery status when it has been posted.
    userDashBoardWithBattery: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth, reply) {
            var authWithLocation = JSON.parse(JSON.stringify(auth));
            authWithLocation.data = JSON.parse(JSON.stringify(lmHelpers.locMapReport1));
            lmHelpers.api.post(test, '/v1/user/' + reply.id + '/location', authWithLocation,
                function () {
                    lmHelpers.api.get(test, '/v1/user/' + reply.id + '/dashboard', auth,
                        function (res) {
                            test.equal(res.data.battery, 99);
                            test.done();
                        });
                });
        });
    },

    // Setting user location gives status 200
    userLocation: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth, reply) {
            auth.data = JSON.parse(JSON.stringify(lmHelpers.locMapReport1));
            lmHelpers.api.post(test, '/v1/user/' + reply.id + '/location', auth, function () {
                test.done();
            });
        });
    },

    // Allowing another user adds them to icansee and idmapping in dashboard.
    allowAnotherUser: function (test) {
        test.expect(9);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {emails: [testUserEmail2]};
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                    // Verify that icansee list for user2 contains user1
                    lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/dashboard', auth2,
                        function (res) {
                            var ICanSeeData = {},
                                idMapping = {};
                            idMapping[reply1.id] = testUserEmail;
                            idMapping[reply2.id] = testUserEmail2;
                            ICanSeeData[reply1.id] = {location: {}, battery: '', visibility: true};
                            userDashboard.icansee = ICanSeeData;
                            userDashboard.idmapping = idMapping;
                            test.deepEqual(res.data, userDashboard);
                            // Verify that canseeme list for user1 contains user2
                            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard', auth1,
                                function (res2) {
                                    userDashboard2.canseeme = [reply2.id];
                                    userDashboard2.idmapping = idMapping;
                                    test.deepEqual(res2.data, userDashboard2);
                                    test.done();
                                });
                        });
                });
            });
        });
    },

    // Allowing another user adds them to icansee and idmapping in contacts.
    allowAnotherUserContacts: function (test) {
        test.expect(9);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {emails: [testUserEmail2]};
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {

                    // Verify that icansee list for user2 contains user1
                    lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/contacts', auth2,
                        function (res) {
                            var expected = {canseeme: [], icansee: [], ignored: [], idmapping: [], nameMapping: {}};
                            expected.idmapping[reply1.id] = testUserEmail;
                            expected.icansee[reply1.id] = {location: {}, visibility: true, battery: ''}
                            test.deepEqual(res.data, expected);

                            // Verify that canseeme list for user1 contains user2
                            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1,
                                function (res2) {
                                    var expected = {canseeme: [reply2.id], icansee: [], ignored: [], idmapping: [], nameMapping: {}};
                                    expected.idmapping[reply2.id] = testUserEmail2;
                                    test.deepEqual(res2.data, expected);
                                    test.done();
                                });
                        });
                });
            });
        });
    },

    // Multiple allow users do not create duplicate entries.
    allowAnotherUserMultiple: function (test) {
        test.expect(10);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {emails: [testUserEmail2]};
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1,
                        function () {
                            // Verify that icansee list for user2 contains user1 only once.
                            lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/dashboard', auth2,
                                function (res) {
                                    var ICanSeeData = {},
                                        idMapping = {};
                                    idMapping[reply1.id] = testUserEmail;
                                    idMapping[reply2.id] = testUserEmail2;
                                    ICanSeeData[reply1.id] = {location: {}, battery: '',
                                        visibility: true};
                                    userDashboard.icansee = ICanSeeData;
                                    userDashboard.idmapping = idMapping;
                                    test.deepEqual(res.data, userDashboard);
                                    // Verify that canseeme list for user1 contains user2 only once.
                                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard',
                                        auth1, function (res2) {
                                            userDashboard2.canseeme = [reply2.id];
                                            userDashboard2.idmapping = idMapping;
                                            test.deepEqual(res2.data, userDashboard2);
                                            test.done();
                                        });
                                });
                        });
                });
            });
        });
    },

    // Removing user location sharing allowance.
    allowAnotherUserRemove: function (test) {
        test.expect(12);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                var authWithEmail1 = JSON.parse(JSON.stringify(auth1));
                authWithEmail1.data = {emails: [testUserEmail2]};
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', authWithEmail1,
                    function () {
                        lmHelpers.api.del(test, '/v1/user/' + reply1.id + '/allow/' + reply2.id,
                            auth1, function () {
                                // Verify that icansee list is empty for the other user.
                                lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/dashboard',
                                    auth2, function (res) {
                                        var idMapping = {};
                                        idMapping[reply2.id] = testUserEmail2;
                                        test.deepEqual(res.data.idmapping, idMapping);
                                        test.deepEqual(res.data.icansee, []);
                                        // Verify that canseeme list is empty for the denying user.
                                        lmHelpers.api.get(test, '/v1/user/' + reply1.id +
                                            '/dashboard', auth1, function (res2) {
                                                var idMapping2 = {};
                                                idMapping2[reply1.id] = testUserEmail;
                                                test.deepEqual(res2.data.idmapping, idMapping2);
                                                test.deepEqual(res2.data.canseeme, []);
                                                test.done();
                                            });
                                    });
                            });
                    });
            });
        });
    },

    // Cannot allow own user.
    cannotAllowSelf: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithEmail = JSON.parse(JSON.stringify(auth1));
            authWithEmail.data = {emails: [testUserEmail]};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', authWithEmail,
                {status: 400}, function () {
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard', auth1,
                        function (dash) {
                            test.deepEqual(dash.data.canseeme, []);
                            test.done();
                        });
                });
        });
    },

    // Cannot allow users with invalid email.
    cannotAllowInvalidEmail: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithEmail = JSON.parse(JSON.stringify(auth1));
            authWithEmail.data = {emails: ['thisisnotanemail@']};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', authWithEmail,
                {status: 400}, function () {
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard', auth1,
                        function (dash) {
                            test.deepEqual(dash.data.canseeme, []);
                            test.done();
                        });
                });
        });
    },

    // Emails are lowercased when used in allow method.
    allowWithUpperCasesEmail: function (test) {
        test.expect(7);
        lmHelpers.createLocMapUser(test, 'testuser1@example.com', 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, 'testuser2@example.com', 'dev2',
                function (auth2, reply2) {
                    var authWithEmail = JSON.parse(JSON.stringify(auth1));
                    authWithEmail.data = {emails: ['TeStUsEr2@Example.COM']};
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', authWithEmail,
                        function () {
                            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard', auth1,
                                function (dash) {
                                    test.deepEqual(dash.data.canseeme, [reply2.id]);
                                    test.done();
                                });
                        });
                });
        });
    },

    // Dashboard shows another users location if allowed.
    userDashboardAllowedUserLocation: function (test) {
        test.expect(14);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = JSON.parse(JSON.stringify(lmHelpers.locMapReport1));
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/location', auth1, function () {
                    auth1.data = {emails: [testUserEmail2]};
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1,
                        function () {
                            lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/dashboard', auth2,
                                function (dash) {
                                    test.equal(dash.data.visibility, true,
                                        'User visibility should be true.');
                                    test.deepEqual(dash.data.canseeme, [],
                                        'Canseeme list does not match.');
                                    lmHelpers.compareLocation(test,
                                        dash.data.icansee[reply1.id].location,
                                        lmHelpers.locMapReport1.location);
                                    test.equal(true, dash.data.icansee[reply1.id].visibility);
                                    test.done();
                                });
                        });
                });
            });
        });
    },

    // Dashboard shows allowed users battery status.
    userDashboardAllowedUserBatteryStatus: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = JSON.parse(JSON.stringify(lmHelpers.locMapReport1));
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/location', auth1, function () {
                    auth1.data = {emails: [testUserEmail2]};
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1,
                        function () {
                            lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/dashboard', auth2,
                                function (dash) {
                                    test.equal(dash.data.icansee[reply1.id].battery, 99);
                                    test.done();
                                });
                        });
                });
            });
        });
    },

    // Previously non-existing user shows up in idmapping if allowed by user.
    userDashboardIdMappingAllowedNewUser: function (test) {
        test.expect(6);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            auth1.data = {emails: [testUserEmail2]};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard', auth1,
                    function (dash) {
                        test.equal(dash.data.canseeme.length, 1);
                        // Canseeme id (user2) must be in idmapping, value must be "user2"
                        var idMapping = {};
                        idMapping[dash.data.canseeme[0]] = testUserEmail2;
                        idMapping[reply1.id] = testUserEmail;
                        test.deepEqual(dash.data.idmapping, idMapping);
                        test.done();
                    });
            });
        });
    },

    // Multiple allowed users show up correctly.
    seeMultipleAllowedUsers: function (test) {
        test.expect(10);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                lmHelpers.createLocMapUser(test, testUserEmail3, 'dev3', function (auth3, reply3) {
                    auth2.data = {emails: [testUserEmail]};
                    lmHelpers.api.post(test, '/v1/user/' + reply2.id + '/allow', auth2,
                        function () {
                            auth3.data = {emails: [testUserEmail]};
                            lmHelpers.api.post(test, '/v1/user/' + reply3.id + '/allow', auth3,
                                function () {
                                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard',
                                        auth1, function (dash) {
                                            var ICanSeeData = {},
                                                idMapping = {};
                                            ICanSeeData[reply2.id] = {location: {}, battery: '',
                                                visibility: true};
                                            ICanSeeData[reply3.id] = {location: {}, battery: '',
                                                visibility: true};

                                            idMapping[reply1.id] = testUserEmail;
                                            idMapping[reply2.id] = testUserEmail2;
                                            idMapping[reply3.id] = testUserEmail3;
                                            userDashboard.icansee = ICanSeeData;
                                            userDashboard.idmapping = idMapping;
                                            test.deepEqual(dash.data, userDashboard);
                                            test.done();
                                        });
                                });
                        });
                });
            });
        });
    },

    // User cannot add more allowed users beyond certain limit (unittesting 5, production 1000)
    allowedUsersUpperLimit: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            auth1.data = {emails: ['email1@example.com']};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                auth1.data = {emails: ['email2@example.com']};
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                    auth1.data = {emails: ['email3@example.com']};
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1,
                        function () {
                            auth1.data = {emails: ['email4@example.com']};
                            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1,
                                function () {
                                    auth1.data = {emails: ['email5@example.com']};
                                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow',
                                        auth1, function () {
                                            auth1.data = {emails: ['email6@example.com']};
                                            lmHelpers.api.post(test, '/v1/user/' + reply1.id +
                                                '/allow', auth1, {status: 400}, function () {
                                                    test.done();
                                                });
                                        });
                                });
                        });
                });
            });
        });
    },

    // Ignoring another user adds them to ignore list in contacts
    ignoreAnotherUser: function (test) {
        test.expect(7);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {ids: [reply2.id]};

                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/ignore', auth1, function () {
                    // Verify that the ignore list for user 1 contains user 2
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1, function (res) {
                        var expected = {canseeme: [], icansee: [], ignored: [reply2.id], idmapping: [], nameMapping: {}};
                        test.deepEqual(res.data, expected);
                        test.done();
                    });
                });
            });
        });
    },

    // Unignoring another user removes them from ignore list in contacts
    unignoreAnotherUser: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {ids: [reply2.id]};

                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/ignore', auth1, function () {
                    lmHelpers.api.del(test, '/v1/user/' + reply1.id + '/ignore/' + reply2.id, auth1, function () {
                        // Verify that the ignore list for user 1 doesn't contain user 2
                        lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1, function (res) {
                            var expected = {canseeme: [], icansee: [], ignored: [], idmapping: [], nameMapping: {}};
                            test.deepEqual(res.data, expected);
                            test.done();
                        });
                    });
                });
            });
        });
    },

    // Multiple ignore users do not create duplicate entries.
    ignoreAnotherUserMultiple: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {ids: [reply2.id]};
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/ignore', auth1, function () {
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/ignore', auth1,
                        function () {
                            // Verify that ignore list for user1 contains user2 only once.
                            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1, function (res) {
                                var expected = {canseeme: [], icansee: [], ignored: [reply2.id], idmapping: [], nameMapping: {}};
                                test.deepEqual(res.data, expected);
                                test.done();
                            });
                        });
                });
            });
        });
    },

    // Cannot ignore own user.
    cannotIgnoreSelf: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithEmail = JSON.parse(JSON.stringify(auth1));
            authWithEmail.data = {ids: [reply1.id]};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/ignore', authWithEmail,
                {status: 400}, function () {
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1,
                        function (res) {
                            test.deepEqual(res.data.ignored, []);
                            test.done();
                        });
                });
        });
    },

    // Contacts can be deleted.
    deleteContact: function (test) {
        test.expect(15);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail2, 'dev2', function (auth2, reply2) {
                auth1.data = {emails: [testUserEmail2]};
                auth2.data = {emails: [testUserEmail]};
                // Allow both users to see each other
                lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                    lmHelpers.api.post(test, '/v1/user/' + reply2.id + '/allow', auth2, function () {
                        // Ignore user 2
                        auth1.data = {ids: [reply2.id]};
                        lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/ignore', auth1, function () {
                            // Rename user 2
                            auth1.data = {name: 'deletetest'};
                            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/rename/' + reply2.id, auth1, function () {
                                // Verify that user1 can see and can be seen by user2 and that user 2 is on 1's ignore list
                                lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1,
                                    function (res) {
                                        var expected = {canseeme: [reply2.id], icansee: [], ignored: [reply2.id], idmapping: [], nameMapping: {}};
                                        expected.nameMapping[reply2.id] = 'deletetest';
                                        expected.idmapping[reply2.id] = testUserEmail2;
                                        expected.icansee[reply2.id] = {location: {}, visibility: true, battery: ''}
                                        test.deepEqual(res.data, expected);
                                        // Delete user 2 from contacts
                                        auth1.data = undefined;
                                        lmHelpers.api.del(test, '/v1/user/' + reply1.id + '/contacts/' + reply2.id, auth1, function () {
                                                // Verify that user 1's contact list is clear
                                                lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1, function (res2) {
                                                    var expected2 = {canseeme: [], icansee: [], ignored: [], idmapping: [], nameMapping: {}};
                                                    test.deepEqual(res2.data, expected2);
                                                    // Verify that user 2's contact list is clear
                                                    lmHelpers.api.get(test, '/v1/user/' + reply2.id + '/contacts', auth2, function (res3) {
                                                        test.deepEqual(res3.data, expected2);
                                                        test.done();
                                                    });
                                                });
                                        });
                                    });
                            });
                        });
                    });
                });
            });
        });
    },

    // User can delete a stub contact
    deleteStubContact: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            auth1.data = {emails: [testStubUser]};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                // Verify that user1 can see and can be seen by user2 and that user 2 is on 1's ignore list
                lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1,
                    function (res) {
                        var expected = {canseeme: ['b4b265d4a1a7f40c631e4dd003510ebf43f32135'], icansee: [], ignored: [], idmapping: [], nameMapping: {}};
                        expected.idmapping['b4b265d4a1a7f40c631e4dd003510ebf43f32135'] = testStubUser;
                        test.deepEqual(res.data, expected);
                        // Delete user 2 from contacts
                        auth1.data = undefined;
                        lmHelpers.api.del(test, '/v1/user/' + reply1.id + '/contacts/' + 'b4b265d4a1a7f40c631e4dd003510ebf43f32135', auth1, function () {
                                // Verify that user 1's contact list is clear
                                lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/contacts', auth1, function (res2) {
                                    var expected2 = {canseeme: [], icansee: [], ignored: [], idmapping: [], nameMapping: {}};
                                    test.deepEqual(res2.data, expected2);
                                    test.done();
                                });
                        });
                    });
            });
        });
    },

    // User can rename contacts
    userRenameContacts:function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth, reply) {
        auth.data = {name: 'userName'};

            lmHelpers.api.post(test, '/v1/user/' + reply.id + '/rename/' + 'testUserId',
                auth, function () {
                    console.log('got rename result')
                    lmHelpers.api.get(test, '/v1/user/' + reply.id + '/contacts', auth,
                    function (res) {
                        var expected = {canseeme: [], icansee: [], ignored: [], idmapping: []};
                        expected.nameMapping= {'testUserId':'userName'};
                        test.deepEqual(res.data, expected);
                        test.done();
                    });
                });
            });
        },

    // Stub users cannot be authorized.
    stubUserDashboardFails: function (test) {
        test.expect(6);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            auth1.data = {emails: [testStubUser]};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                // Hash for stub user email, depends on the hashing function.
                lmHelpers.api.get(test,
                    '/v1/user/b4b265d4a1a7f40c631e4dd003510ebf43f32135/dashboard',
                    {'headers': {'authorizationtoken': ''}}, lmHelpers.wrongAuthTokenResult,
                    function () {
                        test.done();
                    });
            });
        });
    },

    // Test signup with stub user.
    stubUserSignup: function (test) {
        test.expect(10);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            auth1.data = {emails: [testStubUser]};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/allow', auth1, function () {
                lmHelpers.api.post(test, '/v1/signup', {'data':
                    {'email': testStubUser, 'device_id': 'testDeviceId'}},
                    {headers: {'content-type': 'application/json; charset=utf-8'}}, function (res) {
                        var result = res.data;
                        test.equal(result.id, 'b4b265d4a1a7f40c631e4dd003510ebf43f32135');
                        test.ok(typeof result.authorizationtoken === 'string');
                        test.equal(result.authorizationtoken.length, 10);
                        test.deepEqual(result.icansee, [reply1.id]);
                        test.deepEqual(result.canseeme, []);
                        test.done();
                    });
            });
        });
    },

    // Test signup with an existing user
    // (should return existing stuff without changes if device id matches.)
    existingUserSignupValidDeviceid: function (test) {
        test.expect(5);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth2, reply2) {
                test.deepEqual(reply1, reply2);
                test.done();
            });
        });
    },

    // Not authorized if device id's don't match on an existing user.
    existingUserSignupWrongDeviceid: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function () {
            lmHelpers.api.post(test, '/v1/signup',
                {data: {email: testUserEmail, 'device_id': 'differentid'}}, {status: 401},
                function () {
                    test.done();
                });
        });
    },

    setVisibility: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithVisibility = JSON.parse(JSON.stringify(auth1));
            authWithVisibility.data = {visibility: false};
            lmHelpers.api.put(test, '/v1/user/' + reply1.id + '/visibility', authWithVisibility,
                function () {
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard', auth1,
                        function (dash) {
                            test.equal(dash.data.visibility, false);
                            authWithVisibility.data = {visibility: true};
                            lmHelpers.api.put(test, '/v1/user/' + reply1.id + '/visibility',
                                authWithVisibility, function () {
                                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/dashboard',
                                        auth1, function (dash2) {
                                            test.equal(dash2.data.visibility, true);
                                            test.done();
                                        });
                                });
                        });
                });
        });
    },

    // User without places gives an empty object back.
    getPlacesFromUserWithoutPlaces: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places', auth1, function (result) {
                test.deepEqual(result.data, {});
                test.done();
            });
        });
    },

    // Create a new place
    createAndGetUserPlace: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function (result) {
                    // Verify that placeid is a uuid string.
                    var placeId = result.data.id;
                    test.equal(typeof placeId, 'string');
                    test.equal(placeId.length, 36);
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places', auth1,
                        function (result2) {
                            test.equal(Object.keys(result2.data).length, 1);
                            test.deepEqual(result2.data[placeId], lmHelpers.locMapPlace1);
                            test.done();
                        });
                });
        });
    },

    // Create invalid place gives 400
    createInvalidPlace: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = {lat: 1.2, lon: 2.3};
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                {status: 400}, function () {
                    test.done();
                });
        });
    },

    // Create multiple places
    createMultiplePlaces: function (test) {
        test.expect(12);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function (p1Result) {
                    // Verify that placeid is a uuid string.
                    var placeId1 = p1Result.data.id;
                    test.equal(typeof placeId1, 'string');
                    test.equal(placeId1.length, 36);

                    authWithPlace.data = lmHelpers.locMapPlace2;
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                        function (p2Result) {
                            // Verify that placeid is a uuid string.
                            var placeId2 = p2Result.data.id;
                            test.equal(typeof placeId2, 'string');
                            test.equal(placeId2.length, 36);

                            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places', auth1,
                                function (result) {
                                    test.equal(Object.keys(result.data).length, 2);
                                    test.deepEqual(result.data[placeId1], lmHelpers.locMapPlace1);
                                    test.deepEqual(result.data[placeId2], lmHelpers.locMapPlace2);
                                    test.done();
                                });
                        });
                });
        });
    },

    // Create multiple places with same name
    createMultiplePlacesWithSameNameShouldError: function (test) {
        test.expect(4);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function () {
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                        {status: 403}, function () {
                            test.done();
                        });
                });
        });
    },

    // Place creation has a limit.
    createPlacesLimit: function (test) {
        test.expect(9);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function (p1Result) {
                    authWithPlace.data = lmHelpers.locMapPlace2;
                    lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                        function (p2Result) {
                            authWithPlace.data = lmHelpers.locMapPlace3;
                            // Request over the limit should return status 403.
                            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place',
                                authWithPlace, {status: 403}, function () {
                                    // Verify that only the places added before hitting limit
                                    // exist on user places.
                                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places',
                                        auth1, function (result) {
                                            test.equal(Object.keys(result.data).length, 2);
                                            test.deepEqual(result.data[p1Result.data.id],
                                                lmHelpers.locMapPlace1);
                                            test.deepEqual(result.data[p2Result.data.id],
                                                lmHelpers.locMapPlace2);
                                            test.done();
                                        });
                                });
                        });
                });
        });
    },

    // Modify an existing place.
    modifyPlace: function (test) {
        test.expect(9);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function (result1) {
                    var placeId1 = result1.data.id;
                    // Verify that first place is in.
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places', auth1,
                        function (placesResult1) {
                            test.deepEqual(placesResult1.data[placeId1], lmHelpers.locMapPlace1);
                            authWithPlace.data = lmHelpers.locMapPlace2;
                            lmHelpers.api.put(test, '/v1/user/' + reply1.id + '/place/' + placeId1,
                                authWithPlace, function () {
                                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places',
                                        auth1, function (placesResult2) {
                                            // Verify that number of places is still one,
                                            // and that the place is the latest.
                                            test.equal(Object.keys(placesResult2.data).length, 1);
                                            test.deepEqual(placesResult2.data[placeId1],
                                                lmHelpers.locMapPlace2);
                                            test.done();
                                        });
                                });
                        });
                });
        });
    },

    // Modify existing place with invalid gives 400.
    modifyPlaceWithInvalid: function (test) {
        test.expect(6);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function (result1) {
                    var placeId1 = result1.data.id;
                    authWithPlace.data = {lat: 1.2, lon: 3.5, rad: 'plop'};
                    lmHelpers.api.put(test, '/v1/user/' + reply1.id + '/place/' + placeId1,
                        authWithPlace, {status: 400}, function () {
                            // Verify that place is still the original.
                            lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places', auth1,
                                function (placesResult1) {
                                    test.deepEqual(placesResult1.data[placeId1],
                                        lmHelpers.locMapPlace1);
                                    test.done();
                                });
                        });
                });
        });
    },

    // Modify non-existing place returns 404
    modifyNonExistingPlace: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.put(test, '/v1/user/' + reply1.id + '/place/wrongPlaceId',
                authWithPlace, {status: 404}, function () {
                    test.done();
                });
        });
    },

    // Remove an existing place.
    removePlace: function (test) {
        test.expect(8);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            var authWithPlace = JSON.parse(JSON.stringify(auth1));
            authWithPlace.data = lmHelpers.locMapPlace1;
            lmHelpers.api.post(test, '/v1/user/' + reply1.id + '/place', authWithPlace,
                function (result1) {
                    var placeId1 = result1.data.id;
                    // Verify that first place is in.
                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places', auth1,
                        function (placesResult1) {
                            test.equal(Object.keys(placesResult1.data).length, 1);
                            lmHelpers.api.del(test, '/v1/user/' + reply1.id + '/place/' + placeId1,
                                auth1, function () {
                                    lmHelpers.api.get(test, '/v1/user/' + reply1.id + '/places',
                                        auth1, function (placesResult2) {
                                            test.deepEqual(placesResult2.data, {});
                                            test.done();
                                        });
                                });
                        });
                });
        });
    },

    // Remove non-existing place gives 404.
    removeNonExistingPlace: function (test) {
        test.expect(3);
        lmHelpers.createLocMapUser(test, testUserEmail, 'dev1', function (auth1, reply1) {
            lmHelpers.api.del(test, '/v1/user/' + reply1.id + '/place/wrongPlaceId', auth1,
                {status: 404}, function () {
                    test.done();
                });
        });
    }

};

// this function must be last as it stops test server
module.exports.stopServer = function (test) {
    helpers.stopServer(test);
};
