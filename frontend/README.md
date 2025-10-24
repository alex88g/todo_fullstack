# Todo App – Fullstack (Vite React + Node/Express + PostgreSQL)

En fullstack Todo‑applikation byggd med **React (Vite)**, **Node.js/Express** och **PostgreSQL**.

**Live Demo:** [https://todo-fullstack-1-bgbx.onrender.com](https://todo-fullstack-1-bgbx.onrender.com)

---

## Innehåll

* [Förutsättningar](#förutsättningar)
* [Projektstruktur](#projektstruktur)
* [Miljövariabler](#miljövariabler)
* [Installation & lokal utveckling](#installation--lokal-utveckling)
* [Testa API & UI](#testa-api--ui)
* [Deployment på Render](#deployment-på-render)
* [Felsökning (kort)](#felsökning-kort)
* [CDN & Monitorering (kortfattat)](#cdn--monitorering-kortfattat)

---

## Förutsättningar

* **Node.js** 18+ och **npm** 9+
* **PostgreSQL** (lokalt eller moln)
* (Valfritt) **pgAdmin 4**

Kontrollera versioner:

```bash
node --version   # 18+
npm --version    # 9+
```

---

## Projektstruktur

```
repo-root/
├─ backend/                  # Express-API
│  ├─ database/
│  │  └─ init.js            # DB-init (Node)
│  ├─ .env                  # (inte incheckad)
│  ├─ .gitignore
│  ├─ database.sql          # DB-init (SQL)
│  ├─ package.json
│  ├─ package-lock.json
│  └─ server.js
├─ frontend/                 # React (Vite)
│  ├─ dist/                  # build-output (ignoreras av git)
│  ├─ node_modules/          # dependencies (ignoreras av git)
│  ├─ public/
│  │  └─ vite.svg
│  ├─ src/
│  │  ├─ assets/
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ index.css
│  │  └─ main.jsx
│  ├─ .env                   # (inte incheckad)
│  ├─ .gitignore
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package.json
│  ├─ package-lock.json
│  ├─ README.md              # (projektets frontend-README)
│  └─ vite.config.js
└─ INSTALLATION.md           # detaljerad installationsguide

```

---

## Miljövariabler

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Connection string (rekommenderad)
DATABASE_URL=postgresql://todo_user:securepassword123@localhost:5432/todo_db

# (Valfritt: fältvisa, om du bygger connection string själv)
DB_HOST=localhost
DB_PORT=5432
DB_USER=todo_user
DB_PASSWORD=securepassword123
DB_NAME=todo_db
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Todo App
VITE_APP_VERSION=1.0.0
```

---

## Installation & lokal utveckling

### 1) Klona repo

```bash
git clone <ditt-repo-url>
cd <repo-mapp>
```

### 2) Databas (välj ett av alternativen nedan)

**A) psql – skapa DB och tabell manuellt**

```sql
CREATE DATABASE todo_db;
\c todo_db

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO todos (title, description) VALUES
('Lär dig React','Studera React dokumentation'),
('Bygg Todo-app','Skapa en fullstack applikation'),
('Distribuera till Render','Publicera appen på Render');
```

> Har du SQL-fil? Kör: `\i backend/database.sql`

**B) Node‑script – initiera via `init.js`**

```bash
cd backend
npm install
npm run db:init
```

### 3) Starta backend

```bash
cd backend
npm install
npm run dev    # http://localhost:5000
```

### 4) Starta frontend

```bash
cd ../frontend
npm install
npm run dev    # http://localhost:5173
```

---

## Testa API & UI

**API (exempel):**

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/todos
curl -X POST http://localhost:5000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test todo","description":"This is a test"}'
```

**UI:** Öppna `http://localhost:5173` i webbläsaren.

---

## Deployment på Render

### 1) PostgreSQL

* Render Dashboard → **New +** → **PostgreSQL**
* **Region:** *Frankfurt (EU Central)*
* **Name:** `todo-db` (tjänstnamn)
* **Database:** `todo_db`
* **User:** `todo_user`
* **Plan:** *Free* (för test)
* Klicka **Create PostgreSQL**
* Kopiera **External Database URL** (används som `DATABASE_URL` i backend)

### 2) Backend (Web Service)

* **New +** → **Web Service** → koppla GitHub‑repo
* **Name:** `todo-backend`
* **Root Directory:** `backend`
* **Environment:** `Node`
* **Build Command:** `npm install`
* **Start Command:** `npm start`
* **Env:**

  * `NODE_ENV=production`
  * `DATABASE_URL=<din External Database URL>`
  * `CLIENT_URL=https://<din-frontend>.onrender.com`
* (Valfritt) Health Check Path: `/api/health`

> **SSL i produktion:** Använd `ssl: { rejectUnauthorized: false }` i `pg` Pool om din Render‑databas kräver TLS.

### 3) Frontend (Static Site)

* **New +** → **Static Site** → koppla samma repo
* **Name:** `todo-frontend`
* **Root Directory:** `frontend`
* **Build Command:** `npm run build`
* **Publish Directory:** `dist`
* **Env:** `VITE_API_URL=https://<din-backend>.onrender.com`
* Lägg fil `frontend/public/_redirects` med:

```
/*    /index.html   200
```

### 4) Initiera DB i Render

* **Via Shell:** Gå till backendtjänsten → *Shell* → kör `node database/init.js`
* **Eller via psql/pgAdmin:** Kör SQL från `backend/database.sql`

### 5) Verifiera

* Backend: `https://<din-backend>.onrender.com/api/health`
* API: `https://<din-backend>.onrender.com/api/todos`
* Frontend: `https://<din-frontend>.onrender.com`

---

## Felsökning (kort)

* **CORS error:** uppdatera `CLIENT_URL` (backend) till exakt frontend‑domän.
* **DB connection failed:** kontrollera `DATABASE_URL` + ev. SSL.
* **Blank SPA:** lägg `frontend/public/_redirects`.
* **Ingen data i UI:** kontrollera `VITE_API_URL`.

---

## CDN & Monitorering (kortfattat)

### CDN (Content Delivery Network)

Distribuerar statiskt innehåll via servrar nära användaren.

* **Fördelar:** snabbare laddning, lägre latens, avlastad origin, cache, ibland DDoS/WAF.
* **Exempel:** Cloudflare, Akamai, Fastly, AWS CloudFront.

### Monitorering

Övervakar tillgänglighet, prestanda och fel.

* **Fördelar:** tidig driftvarning, prestandainsikt (APM), enklare felspårning.
* **Exempel:** UptimeRobot, Pingdom (uptime), Datadog/New Relic (APM), Sentry (felspårning/loggning).
