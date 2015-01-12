lokki-server
============

Backend code (API server) for the Lokki project.

## Development

For developing the software, you will need:
- Recent version of [node.js](http://nodejs.org/) (tested with 0.10.33) – the distribution includes npm, which you will also need
- Recent version of [Redis](http://redis.io/) – follow installation and running instructions on Redis website

After these dependencies are installed, go to repository root and run:

    $ npm install

This will install JavaScript dependencies of the project. If you have your Redis server running (on default port), you can run server with:

    $ node lokki-server.js

Tests can be run with:

    $ node unittest-runner.js

## Files

*NOTE: Incomplete. Fill as files functions are discovered.*

- `lokki-server.js`: node.js + express app, exposing REST API.
- `lib/dbSetup.js`: setting up database for testing

## Rest API

*NOTE: this seems to be outdated, but left intact for now.*

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

## Manual tests

*NOTE: ``manual_test`` directory does not seem to exist – outdated section?*

- manual tests are located in "manual_test" subdirectory. They test access against external services (Amazon AWS S3).
    - to run them you need to set the access keys as environment variables. go to "lokki-server" folder and type "AWS_ACCESS_KEY_ID=TheKey AWS_SECRET_ACCESS_KEY=SecretKey ./node_modules/nodeunit/bin/nodeunit manual_test/testAWSS3.js"

## Note

Lokki is available to the open source community under Apache v2 license AS IS.

This fork of the project is READ-ONLY and thus F-Secure will not respond to any pull requests, bug reports or vulnerability reports.
