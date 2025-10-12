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

## Project Structure (Nx Monorepo)

This project is now organized as an Nx monorepo:

```
pointing-poker/
├── apps/
│   ├── frontend/         # Angular 20 application (zoneless)
│   └── backend/          # Express + WebSocket server
├── libs/
│   └── shared/           # Shared types and interfaces
└── dist/                 # Build output
```

## Technical Stack

* **Frontend**: Angular 20 (zoneless), Angular Material, Chart.js, FontAwesome
* **Backend**: Node.js, Express 5, WebSocket (ws)
* **Shared**: TypeScript types and interfaces
* **Build Tools**: Nx, Webpack
* Node.js 18.3.0 or higher required

## Architecture Highlights

* **Modular Backend**: Organized with utility functions, session manager, and structured logging
* **Type Safety**: Shared types and message constants across frontend and backend
* **Session Management**: Automatic cleanup of inactive sessions to prevent memory leaks
* **Structured Logging**: Configurable log levels with contextual information
* **Environment Configuration**: All settings configurable via environment variables
* **User Fingerprinting**: Persistent user identification across name changes

## How to run Pointing Poker

### Configuration

Configuration is managed through environment variables. See `.env.example` for all available options:

```bash
cp .env.example .env
# Edit .env with your preferred settings
```

Key configuration options:
- `PORT`: Server port (default: 4000)
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `WS_INACTIVITY_TIMEOUT`: How long before disconnecting inactive clients
- `SESSION_CLEANUP_INTERVAL`: How often to clean up old sessions

### Development Mode

1. Clone the repository
2. cd into the directory
3. Install dependencies: `npm install`
4. (Optional) Configure environment variables: `cp .env.example .env`
5. Run both frontend and backend: `npm run start:dev`
   - Or run separately:
     - Frontend only: `npm run serve:frontend` (runs on port 4200)
     - Backend only: `npm run serve:backend` (runs on port 4000)

### Production Mode

1. Clone the repository
2. cd into the directory
3. Install dependencies: `npm install`
4. Configure environment: `cp .env.example .env` and set `NODE_ENV=production`
5. Build all projects: `npm run build`
6. Start the server: `npm start`
7. The app should now be running by default on port 4000

**Production Tips:**
- Set `LOG_LEVEL=warn` to reduce log verbosity
- Configure `SESSION_CLEANUP_INTERVAL` based on your expected session lifespan
- Enable `ENABLE_ACCESS_LOG=true` for HTTP request logging

* **Heroku**

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/charlesabarnes/pointing-poker)

## Nx Commands

This project uses Nx for monorepo management. Useful commands:

```bash
# Run a specific target for a project
npx nx <target> <project>

# Run a target for multiple projects
npx nx run-many --target=<target> --projects=<projects>

# View project dependency graph
npx nx graph

# Lint all projects
npm run lint
```

## Questions, Concerns, and Feature Request

* Please create an **[issue](https://github.com/charlesabarnes/pointing-poker/issues)** or send me an email if you have feedback to give

Created by **[Charles Barnes](https://charlesabarnes.com)**

