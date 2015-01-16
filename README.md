lokki-server [![Build Status](https://travis-ci.org/TheSoftwareFactory/lokki-server.svg?branch=master)](https://travis-ci.org/TheSoftwareFactory/lokki-server)
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

See the [Lokki Wiki](https://github.com/TheSoftwareFactory/lokki/wiki) for more information on development.

## Files

Some files and directories of interest include:

- `lokki-server.js`: Node.js + express app, exposing REST API. You can run the application with `node lokki-server.js`.
- `unittest-runner.js`: Unit test runner. Unit tests are run with `node unittest-runner.js` command. 
- `lib/dbSetup.js`: Setting up database for testing.
- `locmap/`: Folder containing logic related to location sharing.
    - `locmap/locmap-server.js`: REST API for locmap
    - `locmap/test`: Tests for locmap
- `test/`: General tests

## Note

Lokki is available to the open source community under Apache v2 license AS IS.
