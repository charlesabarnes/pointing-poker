# Pointing-poker

Pointing poker is an easy self hosted solution for Agile teams wanting to add points to their user stories.

## Releases

* **[Latest Release](https://github.com/charlesabarnes/SPFtoolbox/pointing-poker/latest)**
* **[All Releases](https://github.com/charlesabarnes/SPFtoolbox/pointing-poker)**

## Contribute

There are many ways to contribute to pointing-poker.
* **[Submit bugs](https://github.com/charlesabarnes/pointing-poker/issues)** and help us verify fixes as they are checked in.
* Review **[source code changes](https://github.com/charlesabarnes/pointing-poker/pulls)**.

## Screenshot

![big screenshot](https://i.imgur.com/xs7PhY0.png "Screenshot")

## Technical Stack

* Built with **Angular 17.3.12**
* Uses **novo-elements 10.14.0** UI library
* Node.js 18.3.0 or higher required

## How to run Pointing Poker

* **Heroku**

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/charlesabarnes/pointing-poker)

* **Manually start**

1. Clone the repository
2. cd into the directory
3. Build the application using one of these methods:
   - Modern build (recommended): `npm run build:modern`
   - Legacy build: `NODE_OPTIONS=--openssl-legacy-provider npm run build`
4. run `node dist/server` (a node process manager such as PM2 could be used for this)
5. The app should now be running by default on port 4000

**Note**: The server-side build still requires the Node.js legacy OpenSSL provider due to webpack, but the client-side build can now run with modern Node.js crypto.

## Questions, Concerns, and Feature Request

* Please create an **[issue](https://github.com/charlesabarnes/pointing-poker/issues)** or send me an email if you have feedback to give

Created by **[Charles Barnes](https://charlesabarnes.com)**

