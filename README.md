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

## Live Demo Link

https://minutes-meeting-generator.vercel.app/

## Notes

- The frontend currently includes its default Vite README in `dmmg-frontend/README.md`; this root README is the main project documentation.
- Do not commit real secrets in `.env` files. Use local-only values and rotate any exposed keys immediately.

## License

This project is proprietary and confidential.  
All rights reserved.

No part of this codebase may be copied, modified, distributed, or used without explicit written permission from the owner.
