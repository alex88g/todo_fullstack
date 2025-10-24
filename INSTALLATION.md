# Komplett arbetsmiljöinställning för **Vite React + PostgreSQL** (Fullstack Todo‑app)

Den här guiden är professionellt strukturerad, komplett och kronologisk. Den täcker installation på Windows, macOS och Linux, databas‑setup i PostgreSQL (inkl. svenska tecken/UTF‑8), backend med Express/Node, frontend med Vite React, testning, felsökning, samt praktiska scripts. All kod och alla kommandon är samlade och konsekventa.

---

## Innehåll

1. [Förutsättningar & installation](#förutsättningar--installation)
2. [PostgreSQL: databas & användare](#postgresql-databas--användare)
3. [pgAdmin 4: anslutning](#pgadmin-4-anslutning)
4. [Projektstruktur](#projektstruktur)
5. [Backend: konfiguration & kod](#backend-konfiguration--kod)
6. [Frontend (Vite React): konfiguration](#frontend-vite-react-konfiguration)
7. [Root‑scripts (valfritt)](#root-scripts-valfritt)
8. [Starta utvecklingsmiljön](#starta-utvecklingsmiljön)
9. [Testa installationen (API & UI)](#testa-installationen-api--ui)
10. [.gitignore & ESLint](#gitignore--eslint)
11. [Felsökning](#felsökning)
12. [Svenska tecken & UTF‑8 (viktigt)](#svenska-tecken--utf-8-viktigt)
13. [Automatisk DB‑initiering (init.js) + PowerShell‑alternativ](#automatisk-db-initiering-initjs--powershell-alternativ)
14. [Snabbguide (hela setup‑processen)](#snabbguide-hela-setup-processen)

---

## 1) Förutsättningar & installation

### Node.js & npm

Kontrollera versioner (krav: Node 18+ och npm 9+):

```bash
node --version   # ska vara 18+
npm --version    # ska vara 9+
```

Om Node.js saknas: ladda ner från [https://nodejs.org/](https://nodejs.org/)

### PostgreSQL & pgAdmin 4

**Windows**: ladda ner installer från [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)

**macOS** (Homebrew):

```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Starta och aktivera tjänsten
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 2) PostgreSQL: databas & användare

Öppna psql (på Linux/macOS kan du behöva `sudo -u postgres psql`).

```sql
-- Logga in som postgres-superuser (ex. Linux):
-- sudo -u postgres psql

-- Skapa databas och användare
CREATE DATABASE todo_db;
CREATE USER todo_user WITH PASSWORD 'securepassword123';
GRANT ALL PRIVILEGES ON DATABASE todo_db TO todo_user;

-- Anslut till databasen
\c todo_db

-- Skapa tabell "todos"
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exempeldata
INSERT INTO todos (title, description) VALUES
('Lär dig React', 'Studera React dokumentation'),
('Bygg Todo-app', 'Skapa en fullstack applikation'),
('Distribuera till Render', 'Publicera appen på Render');

-- Rättigheter på tabeller & sekvenser
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO todo_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO todo_user;

-- Verifiera
SELECT * FROM todos;
```

> Avsluta psql: `\q`

---

## 3) pgAdmin 4: anslutning

**Skapa ny Server**

* **Name**: `Local PostgreSQL`
* **Host**: `localhost`
* **Port**: `5432`
* **Username**: `todo_user`
* **Password**: `securepassword123`
* **Database**: `todo_db`

---

## 4) Projektstruktur

Skapa mappstruktur:

```bash
mkdir todo-app
cd todo-app
mkdir backend frontend
```

Resultat:

```
todo-app/
├─ backend/
└─ frontend/
```

---

## 5) Backend: konfiguration & kod

Gå till backend och initiera Node‑projekt:

```bash
cd backend
npm init -y
npm install express cors pg dotenv
npm install -D nodemon
```

### `package.json` (backend)

```json
{
  "name": "todo-backend",
  "version": "1.0.0",
  "description": "Backend API for Todo app with PostgreSQL",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:init": "node database/init.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["express", "postgresql", "api", "todo"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### `.env` (backend)

> **Använd säkra lösenord i verkliga projekt.** Följande är exempelvärden.

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL (fältvisa variabler)
DB_HOST=localhost
DB_PORT=5432
DB_USER=todo_user
DB_PASSWORD=securepassword123
DB_NAME=todo_db

# PostgreSQL (connection string – används av servern)
DATABASE_URL=postgresql://todo_user:securepassword123@localhost:5432/todo_db
```

### `server.js` (backend)

En komplett Express‑server med CORS, hälsa och CRUD för `/api/todos`.

```js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL?.split(',').map(s => s.trim()) || '*'
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // aktivera vid molndatabaser som kräver SSL
});

// Healthcheck
app.get('/api/health', async (_req, res) => {
  try {
    const dbNow = await pool.query('SELECT NOW() as now');
    res.json({ status: 'ok', db: 'connected', now: dbNow.rows[0].now });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// Hämta alla todos
app.get('/api/todos', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM todos ORDER BY id ASC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Skapa todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const { rows } = await pool.query(
      `INSERT INTO todos (title, description) VALUES ($1, $2)
       RETURNING *`,
      [title, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Uppdatera todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;
    const { rows } = await pool.query(
      `UPDATE todos
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title ?? null, description ?? null, completed ?? null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Ta bort todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`Server running on port ${port}`);
    console.log('Database connected successfully');
  } catch (e) {
    console.error('Database connection failed:', e.message);
  }
});
```

> **Förväntad start‑logg:**
>
> ```
> Server running on port 5000
> Database connected successfully
> ```

---

## 6) Frontend (Vite React): konfiguration

Skapa Vite‑app och installera beroenden:

```bash
cd ../frontend
npm create vite@latest . -- --template react
npm install
```

### `package.json` (frontend)

```json
{
  "name": "todo-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "vite": "^4.4.5"
  }
}
```

### `vite.config.js`

```js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: { outDir: 'dist', sourcemap: true },
    define: { 'process.env': {} }
  }
})
```

### `.env` (frontend)

```env
# API
VITE_API_URL=http://localhost:5000

# App
VITE_APP_NAME=Todo App
VITE_APP_VERSION=1.0.0
```

> **Testa UI:** Starta dev‑server (nedan) och öppna [http://localhost:5173](http://localhost:5173)

---

## 7) Root‑scripts (valfritt)

Skapa `package.json` i **projektroten** (`todo-app/`) för smidiga kommandon:

```json
{
  "name": "todo-fullstack-app",
  "version": "1.0.0",
  "description": "Fullstack Todo app with React and PostgreSQL",
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "install:all": "cd backend && npm install && cd ../frontend && npm install",
    "build:frontend": "cd frontend && npm run build",
    "start:backend": "cd backend && npm start"
  },
  "keywords": ["react", "postgresql", "express", "vite"],
  "author": "Your Name",
  "license": "MIT"
}
```

---

## 8) Starta utvecklingsmiljön

**Terminal 1 – Backend**

```bash
cd backend
npm run dev
```

Förväntad output:

```
Server running on port 5000
Database connected successfully
```

**Terminal 2 – Frontend**

```bash
cd frontend
npm run dev
```

Förväntad output (exempel):

```
VITE v4.4.5  ready in 327 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 9) Testa installationen (API & UI)

**Backend API**

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/todos
```

**Exempel på svar från `/api/todos`:**

```json
[
  {
    "id": 1,
    "title": "Lär dig React",
    "description": "Studera React dokumentation",
    "completed": false,
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:00:00.000Z"
  }
]
```

**Skapa en todo:**

```bash
curl -X POST http://localhost:5000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test todo","description":"This is a test"}'
```

**Frontend**

* Öppna: [http://localhost:5173](http://localhost:5173)

---

## 10) .gitignore & ESLint

### `.gitignore` (i projektroten)

```gitignore
# Dependencies
node_modules/
*/node_modules/

# Environment variables
.env
.env.local
.env.production

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tgz

# Database
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

### ESLint (frontend/`.eslintrc.cjs`)

> Valfritt men användbart. Konfig enligt ditt underlag (även om projektet är JS):

```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  },
}
```

---

## 11) Felsökning

**Databasanslutning**

```bash
# Kontrollera att PostgreSQL körs (Linux)
sudo systemctl status postgresql

# Testa anslutning
psql -U todo_user -d todo_db -h localhost
```

**Port redan använd**

```bash
# macOS/Linux
lsof -i :5000
lsof -i :5173
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :5000
netstat -ano | findstr :5173
# Avsluta i Aktivitetshanteraren, eller:
taskkill /PID <PID> /F
```

**CORS‑fel**

* Säkerställ att `CLIENT_URL` i backend `.env` matchar din frontend‑URL.
* Bekräfta att `app.use(cors({ origin: ... }))` är korrekt.

**Module not found / trasiga paket**

```bash
rm -rf node_modules package-lock.json
npm install
```

**Snabbverifiering**

```bash
# 1) Databas
psql -U todo_user -d todo_db -c "SELECT version(); SELECT * FROM todos;"

# 2) Backend API
curl http://localhost:5000/api/todos

# 3) Frontend dev‑server
curl http://localhost:5173
```

---

## 12) Svenska tecken & UTF‑8 (viktigt)

För att undvika problem med å/ä/ö:

**Lösning 1 (rekommenderad): skapa databasen med UTF‑8**

```sql
CREATE DATABASE todo_db
WITH
  ENCODING = 'UTF8'
, LC_COLLATE = 'sv_SE.UTF-8'
, LC_CTYPE   = 'sv_SE.UTF-8'
, TEMPLATE = template0;
```

**Windows‑alternativ:**

```sql
CREATE DATABASE todo_db
WITH
  ENCODING = 'UTF8'
, LC_COLLATE = 'Swedish_Sweden.1252'
, LC_CTYPE   = 'Swedish_Sweden.1252'
, TEMPLATE = template0;
```

**Lösning 2: tvinga UTF‑8 i klient** (om du använder manuella fält i `pg`):

```js
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  client_encoding: 'UTF8'
});
```

**Snabbfix på existerande data:**

```sql
UPDATE todos SET title = 'Lär dig React' WHERE title LIKE 'L,r dig React%';
UPDATE todos SET title = 'Distribuera till Render' WHERE title LIKE 'Distribuera till Render%';
SELECT * FROM todos;
```

> Efter att ha skapat databasen med rätt encoding, skapa tabell & exempeldata igen (se avsnitt 2) om du vill börja om helt.

---

## 13) Automatisk DB‑initiering (`init.js`) + PowerShell‑alternativ

Skapa mappen och filen:

```bash
cd backend
mkdir -p database
```

### `backend/database/init.js`

Robust script som kan (1) ansluta till `postgres`, (2) droppa befintlig `todo_db` säkert, (3) skapa om den med UTF‑8, (4) skapa tabell & exempeldata med svenska tecken.

```js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

const initDatabase = async () => {
  let sysClient; // ansluter mot "postgres"
  let appClient; // ansluter mot "todo_db"

  try {
    // Bygg en klient mot systemdatabasen "postgres"
    sysClient = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: 'postgres',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    await sysClient.connect();
    console.log('Connected to PostgreSQL (postgres)');

    // Droppa om databasen finns (terminera sessioner först)
    const exists = await sysClient.query(`SELECT 1 FROM pg_database WHERE datname = 'todo_db'`);
    if (exists.rows.length > 0) {
      console.log('Database already exists, dropping...');
      await sysClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'todo_db' AND pid <> pg_backend_pid();
      `);
      await sysClient.query('DROP DATABASE todo_db');
    }

    // Skapa med UTF-8 och svensk locale (justera för Windows vid behov)
    await sysClient.query(`
      CREATE DATABASE todo_db
      WITH ENCODING = 'UTF8'
           LC_COLLATE = 'sv_SE.UTF-8'
           LC_CTYPE   = 'sv_SE.UTF-8'
           TEMPLATE   = template0;
    `);
    console.log('Database created successfully (UTF-8)');

    // Ge privilegier till app-användaren
    await sysClient.query(`GRANT ALL PRIVILEGES ON DATABASE todo_db TO ${process.env.DB_USER};`);

    // Anslut till den nya databasen
    appClient = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: 'todo_db',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    await appClient.connect();
    console.log('Connected to todo_db');

    // Skapa tabell
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Exempeldata (svenska tecken)
    await appClient.query(
      `INSERT INTO todos (title, description) VALUES ($1,$2),($3,$4),($5,$6);`,
      [
        'Lär dig React', 'Studera React dokumentation',
        'Bygg Todo-app', 'Skapa en fullstack applikation',
        'Distribuera till Render', 'Publicera appen på Render'
      ]
    );

    console.log('Database initialized successfully with Swedish characters');

    // Verifiera
    const result = await appClient.query('SELECT * FROM todos');
    console.log('Sample data:');
    result.rows.forEach(r => console.log(`- ${r.title}: ${r.description}`));

  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    if (appClient) { await appClient.end(); console.log('Todo client connection closed'); }
    if (sysClient) { await sysClient.end(); console.log('Main client connection closed'); }
    process.exit(0);
  }
};

initDatabase();
```

**Kör init‑scriptet:**

```bash
cd backend
npm run db:init
```

### PowerShell‑alternativ (skapa filen direkt)

Kör i `backend/` på Windows PowerShell:

```powershell
if (!(Test-Path "database")) { New-Item -ItemType Directory -Path "database" }
@"
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

const initDatabase = async () => {
  let client;
  let todoClient;
  try {
    client = new Client({ user: process.env.DB_USER, host: process.env.DB_HOST, database: 'postgres', password: process.env.DB_PASSWORD, port: process.env.DB_PORT });
    await client.connect();
    const dbCheck = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'todo_db'`);
    if (dbCheck.rows.length > 0) { await client.query('DROP DATABASE todo_db'); }
    await client.query('CREATE DATABASE todo_db');
    await client.end();

    todoClient = new Client({ user: process.env.DB_USER, host: process.env.DB_HOST, database: 'todo_db', password: process.env.DB_PASSWORD, port: process.env.DB_PORT });
    await todoClient.connect();
    await todoClient.query(`CREATE TABLE IF NOT EXISTS todos (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, completed BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await todoClient.query(`INSERT INTO todos (title, description) VALUES ('Lär dig React','Studera React dokumentation'),('Bygg Todo-app','Skapa en fullstack applikation'),('Distribuera till Render','Publicera appen på Render');`);
    console.log('Database initialized successfully');
  } catch (e) { console.error('Database initialization error:', e); }
  finally { if (todoClient) await todoClient.end(); if (client) await client.end(); }
};

initDatabase();
"@ | Out-File -FilePath "database/init.js" -Encoding UTF8
```

---

## 14) Snabbguide (hela setup‑processen)

**1. Skapa struktur**

```bash
mkdir todo-app && cd todo-app
mkdir backend frontend
```

**2. Backend**

```bash
cd backend
npm init -y
npm install express cors pg dotenv
npm install -D nodemon
# Skapa .env och server.js (se ovan)
# Skapa database/init.js (se ovan)
```

**3. Initiera databas**

```bash
npm run db:init
```

**4. Starta backend**

```bash
npm run dev
```

**5. Frontend**

```bash
cd ../frontend
npm create vite@latest . -- --template react
npm install
npm run dev
```

**6. Testa**

```bash
# Backend
curl http://localhost:5000/api/health
curl http://localhost:5000/api/todos

# Skapa todo
curl -X POST http://localhost:5000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test todo","description":"This is a test"}'

# Frontend
# Öppna i webbläsare: http://localhost:5173
```

> **Snabb manuell DB‑setup i psql (om du vill köra allt för hand):**
>
> ```sql
> psql -U postgres
> CREATE DATABASE todo_db;
> \c todo_db
> CREATE TABLE todos (
>   id SERIAL PRIMARY KEY,
>   title VARCHAR(255) NOT NULL,
>   description TEXT,
>   completed BOOLEAN DEFAULT FALSE,
>   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
>   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
> );
> INSERT INTO todos (title, description) VALUES
> ('Lär dig React','Studera React dokumentation'),
> ('Bygg Todo-app','Skapa en fullstack applikation'),
> ('Distribuera till Render','Publicera appen på Render');
> SELECT * FROM todos;
> \q
> ```

---

### Klart!

Denna guide ger dig en **färdig utvecklingsmiljö** för en fullstack Todo‑app med **Vite React + Express + PostgreSQL**. Följ stegen i ordning, och använd felsökningsdelen vid behov.

---

## 15) Deployment till **Render** (PostgreSQL + Backend + Frontend)

Nedan följer **professionella, steg‑för‑steg** instruktioner för att deploya din Todo‑app på Render. Guiden utgår från att koden ligger i ett Git‑repo med roten `todo-app/` och mapparna `backend/` och `frontend/`.

### Förberedelser i kod

1. **Backend `package.json` – lås Node‑version (rekommenderas)**

   ```json
   {
     "engines": { "node": ">=18" }
   }
   ```
2. **Backend CORS i produktion** – i din `.env` på Render sätt `CLIENT_URL` till din frontend‑domän (kan vara kommaseparerad för flera ursprung):

   ```env
   CLIENT_URL=https://todo-frontend.onrender.com, http://localhost:5173
   ```
3. **(Valfritt men bra) SSL mot moln‑DB** – uppdatera `server.js` så SSL aktiveras i produktion endast när det behövs:

   ```js
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
   });
   ```

---

### Steg 1 – Skapa **PostgreSQL** på Render

1. Gå till **Render Dashboard** → klicka **New +** → **PostgreSQL**.
2. Välj plan (Free tier räcker för test).
3. Namnge databasen t.ex. **todo-db**.
4. Klicka **Create Database**.
5. På DB‑sidan, kopiera **Connection string** (External eller Internal). Du använder den som `DATABASE_URL` i backendens miljövariabler.

> **Obs:** Tjänster på Render i samma region kan ofta använda **Internal Database URL** (lägre latency). För anslutning utanför Render använd **External**. Om din Postgres kräver TLS används koden i `server.js` ovan.

---

### Steg 2 – Deploy **backend** (Web Service)

1. I Render: **New +** → **Web Service**.
2. Koppla ditt **GitHub‑repo**.
3. Inställningar:

   * **Name:** `todo-backend`
   * **Root Directory:** `backend`
   * **Environment:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
   * **Auto Deploy:** On (rekommenderas)
4. **Miljövariabler** (Environment → Add Environment Variable):

   * `NODE_ENV=production`
   * `DATABASE_URL=<din Render PostgreSQL connection string>`
   * `CLIENT_URL=https://todo-frontend.onrender.com` *(lägg ev. till `, http://localhost:5173` för lokala tester)*
5. (Valfritt) **Health Check Path:** `/api/health` (Services → Settings → Health Checks).
6. Skapa tjänsten. Vänta tills builden är klar. Notera backend‑URL, t.ex. `https://todo-backend.onrender.com`.

> **Tips:** Kolla **Logs** om deploy misslyckas. Vanliga fel: felaktig `DATABASE_URL`, saknad tabell (kör init‑SQL), eller att servern inte lyssnar på `process.env.PORT` (vår server gör det redan).

---

### Steg 3 – Deploy **frontend** (Static Site)

1. I Render: **New +** → **Static Site**.
2. Koppla samma GitHub‑repo.
3. Inställningar:

   * **Name:** `todo-frontend`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Publish Directory:** `dist`
4. **Miljövariabler** (Environment):

   * `VITE_API_URL=https://todo-backend.onrender.com`
5. Skapa tjänsten och vänta tills publiceringen är klar. Notera frontend‑URL, t.ex. `https://todo-frontend.onrender.com`.

> **Viktigt:** Uppdatera backendens `CLIENT_URL` med din verkliga frontend‑domän om du inte redan gjort det (CORS).

---

### Steg 4 – Initiera databasen i Render

Du har två enkla vägar:

**A) Via Render DB‑konsolen**
På din PostgreSQL‑resurs i Render → fliken **Data / Connect / psql** (eller motsvarande query‑verktyg). Kör SQL från din `database.sql` (eller från guiden i avsnitt 2):

```sql
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO todos (title, description) VALUES 
('Lär dig React', 'Studera React dokumentation'),
('Bygg Todo-app', 'Skapa en fullstack applikation'),
('Distribuera till Render', 'Publicera appen på Render');
```

**B) Via pgAdmin / psql**
Anslut med Render‑DB:ens **External Connection String** och kör samma SQL som ovan.

---

### Steg 5 – Verifiera i produktion

1. Öppna **backendens hälsa**: `https://<din-backend>.onrender.com/api/health`
   → Ska svara `{ status: 'ok', db: 'connected', ... }`.
2. Öppna **todos‑API**: `https://<din-backend>.onrender.com/api/todos`
   → Ska visa JSON‑lista.
3. Öppna **frontend**: `https://<din-frontend>.onrender.com`
   → UI ska kunna hämta och skapa todos mot backend.

---

### Vanliga Render‑tips & fallgropar

* **CORS**: säkerställ att `CLIENT_URL` exakt matchar din frontend‑domän (https). Stöder flera ursprung via kommaseparering.
* **Miljöhemligheter**: checka **inte** in `.env`. Lägg alla hemligheter i Render **Environment Variables**.
* **Node‑version**: säkra Node 18+ via `"engines"` eller Render‑inställning.
* **Kalla starter (Free Plan)**: första request kan ta längre tid. Överväg betald plan för produktion.
* **DB‑anslutningar**: sätt `ssl` endast där det behövs. Begränsa onödiga idle‑connections.
* **Region**: håll DB och tjänster i **samma region** för lägre latency.

---

### Checklista innan du zippar/pushar

* `.env`, hemligheter och `node_modules/` **ska inte** med i repo/ZIP.
* Säkerställ att **Root Directory** är korrekt (backend/frontend) i Render‑tjänsterna.
* **Health Check Path** satt till `/api/health` (valfritt men underlättar autoskala/monitorering).

---

### Klart!

Din app är nu redo i molnet via **Render**: PostgreSQL, backend (Web Service) och frontend (Static Site) – allt konfigurerat i rätt ordning. 🚀

---

## 16) Render – fullständig setup (steg‑för‑steg)

Den här delen är en **koncis, professionell och kronologisk** checklista särskilt för Render, med EU‑region (Frankfurt) och tydliga fältvärden.

### 1) Skapa **PostgreSQL Database** på Render

**Steg 1 – Logga in**

* Gå till **render.com**, logga in/skapa konto.
* Klicka **New +** → **PostgreSQL**.

**Steg 2 – Konfigurera**

* **Name (tjänstnamn):** `todo-db`
* **Database (databans namn inne i tjänsten):** `todo_db` *(notera att detta skiljer sig från tjänstnamnet)*
* **User:** `todo_user`
* **Region:** `Frankfurt (EU Central)` *(närmast Sverige)*
* **Plan:** `Free` *(för test)*
* Klicka **Create PostgreSQL**.

**Steg 3 – Spara connection string**

* Öppna din nya databas → **Connect**.
* **Spara “External Database URL”** → den behövs som `DATABASE_URL` i backend.

> **Tips:** Om backend körs på Render i **samma region** kan du ofta använda **Internal Database URL** för lägre latency. Annars: **External**.

---

### 2) Deploy **Backend** (Web Service)

**Steg 1 – Skapa tjänst**

* **New +** → **Web Service** → koppla ditt **GitHub‑repo**.

**Steg 2 – Konfiguration**

* **Name:** `todo-backend` (valfritt)
* **Environment:** `Node`
* **Region:** `Frankfurt` *(matcha DB‑region)*
* **Branch:** `main` *(eller `master`)*
* **Root Directory:** `backend`
* **Build Command:** `npm install`
* **Start Command:** `npm start`
* **Auto Deploy:** On (rekommenderas)

**Steg 3 – Environment Variables**
Lägg till under **Environment → Add Environment Variable**:

```
NODE_ENV=production
DATABASE_URL=<din EXTERNAL Database URL från steget ovan>
CLIENT_URL=https://your-frontend-app.onrender.com
```

> Lägg gärna till din lokala dev‑URL också vid behov, ex:
> `CLIENT_URL=https://your-frontend-app.onrender.com, http://localhost:5173`

**Steg 4 – Deploy**

* Klicka **Create Web Service** och notera backend‑URL, t.ex. `https://todo-backend.onrender.com`.

**Rekommenderade backend‑förbättringar**

* I `package.json` (backend):

```json
{
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:init": "node database/init.js"
  }
}
```

* I `server.js`: SSL endast i produktion (vanligt för moln‑Postgres):

```js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

* Health check: ställ in **/api/health** som Health Check Path (valfritt men bra).

---

### 3) Deploy **Frontend** (Static Site)

**Steg 1 – Skapa tjänst**

* **New +** → **Static Site** → koppla samma **GitHub‑repo**.

**Steg 2 – Konfiguration**

* **Name:** `todo-frontend`
* **Branch:** `main` *(eller `master`)*
* **Root Directory:** `frontend`
* **Build Command:** `npm run build`
* **Publish Directory:** `dist`

**Steg 3 – Environment Variables**

```
VITE_API_URL=https://your-backend-app.onrender.com
```

**Steg 4 – Deploy**

* Klicka **Create Static Site** och notera frontend‑URL, t.ex. `https://todo-frontend.onrender.com`.

**SPA‑routing (404→index.html)**
Lägg till filen `frontend/public/_redirects` med:

```
/*    /index.html   200
```

---

### 4) Initiera databasen på Render

**Metod 1 – Render Shell (rekommenderad för engångsinit)**

* Gå till **todo-backend** → fliken **Shell**.
* Kör:

```bash
node database/init.js
```

> **Viktigt:** Se till att `init.js` är **moln‑säker** (skapar endast tabeller/data, droppar inte DB).

**Moln‑säker `init.js` (exempel)**

* Koppla mot `process.env.DATABASE_URL`, exportera en funktion så att vi kan återanvända den från en route.

```js
// backend/database/init.js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

export const initDatabase = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(
      `INSERT INTO todos (title, description)
       VALUES ($1,$2),($3,$4),($5,$6)
       ON CONFLICT DO NOTHING;`,
      [
        'Lär dig React','Studera React dokumentation',
        'Bygg Todo-app','Skapa en fullstack applikation',
        'Distribuera till Render','Publicera appen på Render'
      ]
    );
    console.log('Database initialized');
  } finally {
    await client.end();
  }
};

// Gör filen körbar via `node database/init.js`
if (process.argv[1]?.endsWith('init.js')) {
  initDatabase().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
```

**Metod 2 – Init‑route (tillfälligt)**
Lägg till i `backend/server.js` och ta bort den efter användning (eller skydda med env‑nyckel):

```js
import { initDatabase } from './database/init.js';
app.post('/api/init-db', async (_req, res) => {
  try {
    await initDatabase();
    res.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Kör sedan:

```bash
curl -X POST https://your-backend.onrender.com/api/init-db
```

---

### 5) Production‑scripts (backend)

Säkerställ att dina scripts passar Render:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:init": "node database/init.js"
  }
}
```

---

### 6) Final **checklista**

**Innan deploy**

* Backend fungerar lokalt
* Frontend fungerar lokalt
* All kod är pushad till GitHub
* `DATABASE_URL` från Render är sparad
* `init.js` finns i `backend/database/` (moln‑säker)

**Efter deploy**

* Backend health: `https://your-backend.onrender.com/api/health`
* Initiera databasen (Shell eller init‑route)
* Testa API: `https://your-backend.onrender.com/api/todos`
* Testa frontend: `https://your-frontend.onrender.com`

---

### 7) Troubleshooting (snabb)

* **CORS error** → uppdatera `CLIENT_URL` i backend‑env till exakt frontend‑domän.
* **Database connection failed** → kontrollera `DATABASE_URL`, region och ev. SSL.
* **Frontend visar ingen data** → kontrollera `VITE_API_URL` i frontend‑env.
* **Static site blank page** → säkerställ `public/_redirects` med `/* /index.html 200`.
* **Cold starts (Free)** → första request kan vara seg; uppgradera plan vid behov.

---

### 8) Live URLs (exempel)

* **Frontend:** `https://todo-frontend.onrender.com`
* **Backend:** `https://todo-backend.onrender.com`
* **Database:** Render PostgreSQL (hanteras via Render)

> **Rekommendation:** Deploya **backend först**, **initiera DB**, därefter **frontend**. 
