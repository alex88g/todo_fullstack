import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

const initDatabase = async () => {
  let client;
  let todoClient;
  
  try {
    // Använd DATABASE_URL för Render, fallback till lokal
    const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/postgres`;
    
    client = new Client({
      connectionString: connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    console.log('Connected to PostgreSQL');

    // Kontrollera om databasen redan finns
    const dbName = process.env.NODE_ENV === 'production' ? 'todo_db_t2c0' : 'todo_db';
    const dbCheck = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [dbName]);

    if (dbCheck.rows.length > 0) {
      console.log('Database already exists');
    } else {
      console.log('Creating database...');
      await client.query(`CREATE DATABASE ${dbName}`);
    }

    await client.end();

    // Anslut till den nya databasen
    const todoConnectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`;
    
    todoClient = new Client({
      connectionString: todoConnectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await todoClient.connect();
    console.log('Connected to todo database');

    // Skapa tabell
    await todoClient.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Rensa och lägg till data
    await todoClient.query('DELETE FROM todos');
    
    await todoClient.query(`
      INSERT INTO todos (title, description) 
      VALUES 
        ($1, $2),
        ($3, $4),
        ($5, $6)
    `, [
      'Lär dig React', 
      'Studera React dokumentation',
      'Bygg Todo-app', 
      'Skapa en fullstack applikation',
      'Distribuera till Render', 
      'Publicera appen på Render'
    ]);

    console.log('✅ Database initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  } finally {
    if (todoClient) await todoClient.end();
    if (client) await client.end();
    process.exit(0);
  }
};

initDatabase();