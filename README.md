# Minutes Meeting Generator

Minutes Meeting Generator is a full-stack app for creating meetings, collecting notes, generating AI-assisted minutes, and exporting minutes as PDF files.

The repository contains:

- `dmmg-frontend`: React + Vite + TypeScript frontend
- `server`: Express + TypeScript + Prisma backend

## Features

- Organization creation and login
- Join existing organizations with approval flow
- Admin review for pending users and password reset
- Create, edit, list, and delete meetings
- Public and private meeting visibility inside an organization
- AI-assisted meeting title/topic suggestions
- AI-generated minutes of meeting from notes
- PDF export for generated minutes

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Query, Axios
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma ORM
- AI: OpenAI API
- Deployment: Vercel + Render or Railway

## Project Structure

```text
minutes-meeting-generator/
|- dmmg-frontend/   # frontend app
|- server/          # backend API + Prisma
|- DEPLOYMENT.md    # deployment guide
|- render.yaml      # Render blueprint
```

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd minutes-meeting-generator
```

### 2. Install dependencies

Frontend:

```bash
cd dmmg-frontend
npm install
```

Backend:

```bash
cd server
npm install
```

### 3. Configure environment variables

Backend `server/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=http://localhost:5173
PORT=5000
```

Frontend `dmmg-frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Prepare the database

Generate the Prisma client:

```bash
cd server
npm run prisma:generate
```

Apply migrations:

```bash
npx prisma migrate deploy
```

For local development, `npx prisma migrate dev` also works if you want to create or apply migrations interactively.

### 5. Start the backend

```bash
cd server
npm run dev
```

The API runs on `http://localhost:5000` by default.

### 6. Start the frontend

```bash
cd dmmg-frontend
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Available Scripts

### Frontend

- `npm run dev`: start Vite dev server
- `npm run build`: create production build
- `npm run lint`: run ESLint
- `npm run preview`: preview production build

### Backend

- `npm run dev`: start Express server with hot reload
- `npm run build`: compile TypeScript
- `npm run start`: run compiled server
- `npm run prisma:generate`: generate Prisma client
- `npm run migrate:deploy`: apply Prisma migrations
- `npm run data:copy`: run project data copy script

## Main Backend Routes

- `/auth`: registration, login, forgot password
- `/orgs`: public organization listing, join requests, member approval
- `/admin`: pending user management and password reset
- `/meetings`: meeting CRUD, notes updates, minutes generation, PDF export
- `/ai`: AI endpoints for minutes generation and meeting suggestions

## Data Model Overview

The main Prisma models are:

- `Organization`
- `User`
- `Meeting`
- `MeetingParticipant`
- `MeetingMinutes`
- `OrgSettings`
- `AuditLog`

## Deployment

Deployment instructions are available in [DEPLOYMENT.md](./DEPLOYMENT.md).

Current deployment setup in this repo supports:

- Frontend on Vercel
- Backend on Render or Railway
- PostgreSQL on Render or Railway

## Notes

- The frontend currently includes its default Vite README in `dmmg-frontend/README.md`; this root README is the main project documentation.
- Do not commit real secrets in `.env` files. Use local-only values and rotate any exposed keys immediately.
