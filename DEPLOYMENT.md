# Deployment Guide

This repo is ready for:

- `dmmg-frontend` on Vercel
- `server` on Render or Railway
- PostgreSQL on Render or Railway

## Option 1: Vercel + Render + Postgres

### 1. Deploy the backend on Render

You can deploy with the included [render.yaml](./render.yaml).

- In Render, choose `New +` -> `Blueprint`
- Connect this GitHub repository
- Render will detect `render.yaml`
- Set `OPENAI_API_KEY` when prompted
- After the backend deploys, copy its public URL

Backend env vars used by the service:

- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CORS_ORIGIN`
- `PORT` is provided by Render automatically

### 2. Deploy the frontend on Vercel

- In Vercel, import this GitHub repository
- Set the root directory to `dmmg-frontend`
- Framework preset: `Vite`
- Add env var `VITE_API_BASE_URL=https://your-render-api.onrender.com`
- Deploy

### 3. Allow the frontend origin in Render

Update `CORS_ORIGIN` in the Render backend service to your Vercel URL, for example:

`https://minutes-meeting-generator.vercel.app`

If you use a custom domain, set that instead.

## Option 2: Vercel + Railway + Postgres

### 1. Deploy the backend on Railway

- In Railway, create a new project from this GitHub repo
- Add a PostgreSQL service
- Create a service for the `server` folder
- In the Railway service settings, set the root directory to `server`
- Optionally set the config file path to `/server/railway.json`

Backend env vars to add in Railway:

- `DATABASE_URL`
  Use a reference from the Railway Postgres service
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`
- `CORS_ORIGIN`

Railway provides `PORT` automatically.

### 2. Deploy the frontend on Vercel

- In Vercel, import this GitHub repository
- Set the root directory to `dmmg-frontend`
- Framework preset: `Vite`
- Add env var `VITE_API_BASE_URL=https://your-railway-backend.up.railway.app`
- Deploy

### 3. Allow the frontend origin in Railway

Set `CORS_ORIGIN` in the backend service to your Vercel frontend URL.

## Notes

- `dmmg-frontend/vercel.json` enables SPA route rewrites for React Router.
- The backend runs Prisma migrations during deploy.
- If your frontend URL changes, update `CORS_ORIGIN`.
- If your backend URL changes, update `VITE_API_BASE_URL` in Vercel and redeploy.

## Verified locally

- `server`: `npm run build`
- `server`: Prisma deploy script added
- `dmmg-frontend`: `npm run build`
