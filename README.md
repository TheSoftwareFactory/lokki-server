lokki-server [![Build Status](https://travis-ci.org/TheSoftwareFactory/lokki-server.svg?branch=master)](https://travis-ci.org/TheSoftwareFactory/lokki-server)
============

Backend code (API server) for the Lokki project.

## Development

For developing the software, you will need:
- Recent version of [node.js](http://nodejs.org/) (tested with 4.3.2) – the distribution includes npm, which you will also need
- Recent version of [Redis](http://redis.io/) – follow installation and running instructions on Redis website

After these dependencies are installed, go to repository root and run:

    $ npm install

This will install JavaScript dependencies of the project. If you have your Redis server running (on default port), you can run server with:

    $ node lokki-server.js

Server can be run with different configurations by setting `NODE_ENV` environment variable (`development` is used by default). For example:

    $ NODE_ENV=production node lokki-server.js

Server loads matching configuration from `config/` directory – see `lib/config.js` for details about all available configuration options.

Tests can be run with (always uses `NODE_ENV=test`):

    $ node unittest-runner.js

See the [Lokki main repository](https://github.com/TheSoftwareFactory/lokki) for more information on development.

### Coding style

[eslint](http://eslint.org/) is used to spot mistakes and to make sure coding style is consistent. Rules used in addition to default rules can be found from `.eslintrc`. Any eslint errors will fail the Travis CI build.

During development, easiest way is to make sure you won't have eslint errors is to have eslint integration in your IDE or text editor. Sublime Text 3 supports this with [SublimeLinter-eslint](https://github.com/roadhump/SublimeLinter-eslint). You can also put `eslint .` to your Git pre-commit hook to make sure you won't make commits that have lint errors.

## Deployment

This repository has been configured to use Heroku for continuous delivery. Whenever a new commit is pushed to this repository Travis CI will run tests and eslint to ensure that commit doesn't break anything. After successfully running all tests Travis will deploy the lokki-server to [Heroku](http://lokki.herokuapp.com).

If you're deploying your version of the server, you want to take note of few things:

- Application is transferring location data over network, so you should use HTTPS.
- There are a few configuration variables you want to change – at least `adminUserId`, `googleCloudMessagingApiKey` and `redis.url`. If you want email to work, set `sendGrid.username` and `sendGrid.password` too. All of these can be provided as an environment variable, see `lib/config.js` for details.

Setting up your own server is pretty simple, as the repository includes `Procfile` needed to run the application in Heroku – just enable the required addons (some kind of Redis server and SendGrid) and set the configuration variables.

## Files

Some files and directories of interest include:

- `lokki-server.js`: Node.js + express app, exposing REST API. You can run the application with `node lokki-server.js`.
- `unittest-runner.js`: Unit test runner. Unit tests are run with `node unittest-runner.js` command.
- `locmap/`: Folder containing logic related to location sharing.
    - `locmap/locmap-server.js`: REST API for locmap
    - `locmap/test`: Tests for locmap
- `test/`: General tests

## Location-Map REST API

The base URL is /api/locmap/v1/ or /api/locmap/v2/ depending on version.

##### User Resources
- [`POST` /user/:userId/location](./locmap/docs/user.md#post-useruseridlocation)
- [`POST` /user/:userId/allow](./locmap/docs/user.md#post-useruseridallow)
- [`DELETE` /user/:userId/allow/:targetUserId](./locmap/docs/user.md#delete-useruseridallowtargetuserid)
- [`POST` /user/:userId/ignore](./locmap/docs/user.md#post-useruseridignore)
- [`DELETE` /user/:userId/ignore/:targetUserId](./locmap/docs/user.md#delete-useruseridignoretargetuserid)
- [`PUT` /user/:userId/visibility](./locmap/docs/user.md#put-useruseridvisibility)
- [`PUT` /user/:userId/language](./locmap/docs/user.md#put-useruseridlanguage)
- [`POST` /user/:userId/apnToken](./locmap/docs/user.md#post-useruseridapntoken)
- [`POST` /user/:userId/gcmToken](./locmap/docs/user.md#post-useruseridgcmtoken)
- [`POST` /user/:userId/wp8NotificationURL](./locmap/docs/user.md#post-useruseridwp8notificationurl)
- [`GET` /user/:userId/dashboard](./locmap/docs/user.md#get-useruseriddashboard)
- [`GET` /user/:userId/contacts](./locmap/docs/user.md#get-useruseridcontacts)
- [`DELETE` /user/:userId/contacts/:targetUserId](./locmap/docs/user.md#delete-useruseridcontactstargetuserid)
- [`POST` /user/:userId/rename/:targetUserId](./locmap/docs/user.md#post-useruseridrenametargetuserid)
- [`POST` /user/:userId/update/locations](./locmap/docs/user.md#post-useruseridupdatelocations)
- [`POST` /user/:userId/place](./locmap/docs/user.md#post-useruseridplace)
- [`PUT` /user/:userId/place/:placeId](./locmap/docs/user.md#put-useruseridplaceplaceid)
- [`DELETE` /user/:userId/place/:placeId](./locmap/docs/user.md#delete-useruseridplaceplaceid)
- [`GET` /user/:userId/places](./locmap/docs/user.md#get-useruseridplaces)

##### Admin Resources
- [`GET` /admin/:userId/crashReport/:osType/:year/:month](./locmap/docs/admin.md#get-adminuseridcrashreportostypeyearmonth)
- [`POST` /admin/:userId/accountRecovery](./locmap/docs/admin.md#post-adminuseridaccountrecovery)
- [`GET` /admin/:userId/userStats](./locmap/docs/admin.md#get-adminuseriduserstats)

##### Miscellaneous Resources
- [`POST` /signup](./locmap/docs/misc.md#post-signup)
- [`POST` /crashReport/:userId](./locmap/docs/misc.md#post-crashreportuserid)
- [`GET` /reset/:resetid](./locmap/docs/misc.md#get-resetresetid)

## Note

Lokki is available to the open source community under Apache v2 license AS IS.
