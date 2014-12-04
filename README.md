lokki-server
============

Backend code (API server) for the Lokki project.


REST API
=======

User API
- create new user:
POST /api/user/:userId

- update user info:
PUT /api/user/:userId - body should have user object with fields which need to be changed, like: {name: "My new name"}

- get user info
GET /api/user/:userId

- user updates his location:
POST /api/user/:userId/location - body should have object like: {lon:22.2, lat:12.3, acc:10}

Dashboard API
GET /api/user/:userId/dashboard

Family API
- userId invites userId2 to his family:
POST /api/user/:userId/family/invite/:userId2

- userId accepts invitation from userId2:
POST /api/user/:userId/family/:userId2

- add or delete place. body must have place object for POST
POST|DEL /api/user/:userId/family/place/:placeId


FILES
=====
- lokki-server.js: node.js + express app, exposing REST API.
- lib/RESTAPI.js: REST API wrappers.
- lib/familyModel.js: API for Families.
- lib/userModel.js: API for User.
- lib/dbSetup.js: setting up database for testing


TESTS
=====
To be able to run the unit and end-to-end tests you need:
- do "npm install" in root folder to install dependencies
- You also need to install nodeunit (which isn't part of the production dependencies:
-- do "npm install nodeunit" to install unit test framework
-- do "npm install nodeunit-httpclient" to install unit test framework

- download and build redis:
    - download latest version from http://redis.io/
    - it will unpack to local folder, go there and type "make" - it will build redid. If you don't have "make" installed - install it from XCode (XCode\Preferences\Downloads\CommandineTools)
    - go to "src" subfolder and execute "./redis-server" from there
    - remember that you need to have server running locally on default port for unit tests to work.
    - Simplest way to handle Redis: you can keep shortcut to redis-server in dock and just execute it when you need right from there.

- go to "lokki-server" folder and type "node ./unittest-runner.js" - it will execute unit tests.

- manual tests are located in "manual_test" subdirectory. They test access against external services (Amazon AWS S3).
    - to run them you need to set the access keys as environment variables. go to "lokki-server" folder and type "AWS_ACCESS_KEY_ID=TheKey AWS_SECRET_ACCESS_KEY=SecretKey ./node_modules/nodeunit/bin/nodeunit manual_test/testAWSS3.js"

Note
====

Lokki is available to the open source community under Apache v2 license AS IS.

This fork of the project is READ-ONLY and thus F-Secure will not respond to any pull requests, bug reports or
vulnerability reports.
