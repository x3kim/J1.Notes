<div align="center">

# J1.Notes

**Self-hosted, privacy-first notes app — your data, your server.**

[![Version](https://img.shields.io/badge/version-1.0.3-yellow.svg)](https://github.com/x3kim/J1.Notes/releases) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org) [![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://hub.docker.com)

</div>

---

## What is J1.Notes?

J1.Notes is a self-hosted note-taking application inspired by Google Keep. It runs entirely on your own server, stores all data locally (SQLite or PostgreSQL), and requires zero external services. Write notes, organize them with labels, attach images, draw sketches, and set reminders — all without giving up your privacy.

## Features

| Feature | Description |
|---|---|
| **Rich text editor** | Bold, italic, underline, highlights, links, text color, alignment |
| **Checklists** | Drag-and-drop reorderable to-do lists |
| **Drawing** | Freehand sketch pad per note |
| **Image attachments** | Attach photos and screenshots to notes |
| **Labels** | Color-coded tags for organizing notes |
| **Reminders** | In-app browser notifications at a set time |
| **Drag & drop** | Reorder notes on the board |
| **Archive & Trash** | Soft-delete with 7-day auto-purge |
| **Version history** | Automatic snapshots of significant edits |
| **Pin notes** | Keep important notes at the top |
| **Color & background** | Per-note background color or image |
| **Grid / List view** | Switch between masonry grid and compact list |
| **Dark / Light themes** | 4 built-in themes (dark, light, sepia, midnight) |
| **Multi-language** | English, German, French |
| **App lock** | Optional password or PIN protection |
| **PWA** | Install as a desktop / mobile app |
| **REST API** | Full OpenAPI 3 spec at `/api/docs` |
| **Docker-ready** | Single `docker compose up` deployment |
| **SQLite & PostgreSQL** | Choose your database backend |

## Quick Start

### Docker (recommended)

```bash
# 1. Clone the repository
git clone https://github.com/x3kim/J1.Notes.git
cd J1.Notes

# 2. Start with SQLite (simplest)
docker compose up -d

# 3. Open in your browser
open http://localhost:3000
```

> The app is available at **http://localhost:3000** by default.  
> Data is stored in a named Docker volume (`j1notes_data`) and survives container restarts.

### PostgreSQL variant

```bash
# Uses docker-compose.postgres.yml for a two-container setup
docker compose -f docker-compose.postgres.yml up -d
```

### Local development

```bash
# Prerequisites: Node.js 20+, npm
git clone https://github.com/x3kim/J1.Notes.git
cd J1.Notes

npm install
npx prisma db push          # create SQLite database
npm run dev                 # starts at http://localhost:3000
```

## Configuration

All settings are passed as environment variables (or in a `.env` file):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATABASE_PROVIDER` | `sqlite` | `sqlite` or `postgresql` |
| `DATABASE_URL` | `file:/data/j1notes.db` | Database connection string |
| `JWT_SECRET` | *(insecure default)* | **Change in production!** Secret for session tokens |
| `SMTP_HOST` | — | SMTP server for password-reset emails |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | `true` for port 465 / TLS |
| `SMTP_USER` | — | SMTP login username |
| `SMTP_PASS` | — | SMTP login password |
| `SMTP_FROM` | `J1.Notes <no-reply@j1notes.local>` | From address for emails |
| `NEXT_PUBLIC_GITHUB_URL` | — | Shown as GitHub link in the footer |

### Example `.env` for production

```env
JWT_SECRET=your-very-long-random-secret-here
DATABASE_URL=file:/data/j1notes.db
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=secret
SMTP_FROM=J1.Notes <noreply@example.com>
NEXT_PUBLIC_GITHUB_URL=https://github.com/x3kim/J1.Notes
```

## API Documentation

J1.Notes ships with an interactive **Swagger UI** at:

```
http://localhost:3000/api/docs
```

The raw OpenAPI 3.1 specification (YAML) is available at:

```
http://localhost:3000/api/docs?format=yaml
```

### API overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notes` | List all notes |
| `POST` | `/api/notes` | Create a note |
| `DELETE` | `/api/notes` | Empty trash |
| `GET` | `/api/notes/:id` | Get a note |
| `PATCH` | `/api/notes/:id` | Update a note |
| `DELETE` | `/api/notes/:id` | Move to trash / delete |
| `PATCH` | `/api/notes/:id/checklist/:itemId` | Toggle checklist item |
| `GET` | `/api/notes/:id/versions` | Version history |
| `GET/POST` | `/api/labels` | Labels CRUD |
| `PATCH/DELETE` | `/api/labels/:id` | Update / delete label |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `POST` | `/api/auth/forgot-password` | Request reset email |
| `POST` | `/api/auth/reset-password` | Reset password |
| `GET/PATCH` | `/api/profile` | Profile (username, avatar) |
| `POST/DELETE` | `/api/avatar` | Avatar upload / delete |
| `POST/DELETE` | `/api/upload` | File upload / delete |
| `GET/POST` | `/api/settings/auth` | Auth settings |

## Architecture

```
J1.Notes
├── src/
│   ├── app/
│   │   ├── api/          # Next.js Route Handlers (REST API)
│   │   ├── login/        # Login page
│   │   ├── reset-password/
│   │   └── page.tsx      # Main notes board
│   ├── components/       # React UI components
│   └── lib/
│       ├── db.ts         # Prisma client singleton
│       ├── email.ts      # SMTP / nodemailer
│       ├── i18n/         # Internationalization (i18next)
│       └── themes/       # Theme system
├── prisma/
│   ├── schema.prisma     # SQLite schema
│   └── schema.postgres.prisma
├── public/
│   ├── api/openapi.yaml  # OpenAPI 3.1 spec
│   └── locales/          # Translation files (en, de, fr)
├── Dockerfile
├── docker-compose.yml         # SQLite deployment
└── docker-compose.postgres.yml
```

**Stack:** Next.js 15, React, Prisma ORM, SQLite (better-sqlite3) / PostgreSQL, Tiptap, Tailwind CSS, TypeScript.

## Updating

```bash
# Pull the latest image and restart
docker compose pull
docker compose up -d
```

Your data volume (`j1notes_data`) is preserved automatically.

## Security notes

- **Change `JWT_SECRET`** before exposing the app to the internet.
- App lock (password/PIN) is optional but recommended for shared servers.
- File uploads are validated for MIME type and size server-side.
- All database queries go through Prisma (no raw SQL).

## Contributing

Pull requests are welcome! Please open an issue first for large changes.

```bash
# Run the development server
npm run dev

# Lint
npm run lint

# Run tests
npm test
```

## License

MIT © [x3kim](https://github.com/x3kim)
