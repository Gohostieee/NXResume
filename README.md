# NXResume

A streamlined migration of Reactive Resume to a simpler, easier-to-host Next.js stack. This repo focuses on fewer moving parts, faster setup, and a modern UI while keeping the best of the original experience.

## Why this project exists

Reactive Resume is powerful, but the original stack can feel heavy to self-host. This version keeps the core resume builder experience, adds AI tooling, and trims the ops overhead by moving to Next.js + Convex.

## Features

- Resume builder with multiple templates
- Drag-and-drop layouts and section control
- AI-assisted resume editing (bring your own OpenAI key)
- Public resume sharing with view/download tracking
- PDF generation with Puppeteer
- Authentication via Clerk
- Self-hostable with a minimal setup

## Tech stack

- Next.js (App Router)
- Convex (database + serverless functions)
- Clerk (auth)
- Tailwind CSS + Radix UI

## Quickstart

1) Install dependencies

```bash
npm install
```

2) Copy environment variables

```bash
cp .env.example .env.local
```

3) Start Convex (in a separate terminal)

```bash
npx convex dev
```

4) Run the app

```bash
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Configuration

Minimum required environment variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional:

- `OPENAI_API_KEY` for AI features
- `PUPPETEER_EXECUTABLE_PATH` if Puppeteer cannot find a Chrome binary

See `.env.example` for full details.

## Deployment

1) Deploy the Next.js app (Vercel or any Node host).
2) Deploy Convex and set `NEXT_PUBLIC_CONVEX_URL`.
3) Configure Clerk JWT template in Convex.

## Credits

Inspired by and based on [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume) by Amruth Pillai and the community.

## Maintainer

Built and maintained by [webv1.com](https://webv1.com)

## License

MIT License. See `LICENSE.md`.
