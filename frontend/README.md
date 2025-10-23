# Todo App - Fullstack Applikation

En fullstack Todo-applikation byggd med React (Vite), Node.js/Express och PostgreSQL. Appen är publicerad på Render och tillgänglig via följande länk:

**Live Demo:** [https://your-todo-app.onrender.com](https://your-todo-app.onrender.com)

## Teknologier

- **Frontend:** React 18, Vite
- **Backend:** Node.js, Express
- **Databas:** PostgreSQL
- **Hosting:** Render (PaaS)

## Funktioner

- ✅ Skapa nya todo-uppgifter
- 📝 Redigera befintliga todos
- 🗑️ Ta bort todos
- ✅ Markera todos som klara/ej klara
- 📱 Responsiv design

## Lokal utveckling

### Förutsättningar
- Node.js 18+
- PostgreSQL
- pgAdmin 4

### Installation

1. **Klona och packa upp projektet**
2. **Databas setup:**
   ```sql
   CREATE DATABASE todo_db;
   \c todo_db
   \i backend/database.sql