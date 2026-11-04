# ReleaseGuard

AI-powered release management and automated recovery platform.

## Overview

ReleaseGuard automates the software release lifecycle by
building, testing, deploying, and monitoring applications.

It uses AI to analyse deployment failures, recommend
corrective actions, and support controlled rollback.

## Technology Stack

- React
- TypeScript
- Vite
- Node.js
- Fastify
- Docker
- SQLite
- Vitest

## Architecture

Modular Monolith

## Repository Structure

```
ReleaseGuard/
├── apps/
│   ├── frontend/        # React + Vite + TypeScript
│   └── backend/         # Fastify + TypeScript
├── packages/
│   └── shared-types/    # Shared TypeScript type definitions
├── sample-app/
├── docker/
├── scripts/
├── docs/
├── package.json         # npm workspaces root
└── README.md
```

## Development

Install all dependencies from the root:

```bash
npm install
```

Start the backend (port 3000):

```bash
npm run dev:backend
```

Start the frontend (port 5173):

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) — the app displays the backend health status.

## Core Modules

- Project Management
- Release Management
- Build Management
- Testing
- Docker Deployment
- Monitoring
- Incident Detection
- AI Analysis
- Policy Engine
- Approval Management
- Rollback and Recovery

## Project Status

Under Development
