import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

const initDatabase = async () => {
  let client;
  let todoClient;
  
  try {
    client = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: 'postgres',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    await client.connect();
    console.log('Connected to PostgreSQL');

    // Kontrollera om databasen redan finns
    const dbCheck = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = 'todo_db'
    `);

    if (dbCheck.rows.length > 0) {
      console.log('Database already exists, dropping...');
      // Koppla bort alla anslutningar först
      await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = 'todo_db' AND pid <> pg_backend_pid()
      `);
      await client.query('DROP DATABASE todo_db');
    }

    // Skapa databas
    await client.query('CREATE DATABASE todo_db');
    console.log('Database created successfully');

    await client.end();

    // Anslut till den nya databasen
    todoClient = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: 'todo_db',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    await todoClient.connect();
    console.log('Connected to todo_db');

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

    // Lägg till data med svenska tecken
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

    console.log('✅ Database initialized successfully with Swedish characters');
    
    // Verifiera data
    const result = await todoClient.query('SELECT * FROM todos');
    console.log('Sample data:');
    result.rows.forEach(row => {
      console.log(`- ${row.title}: ${row.description}`);
    });
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  } finally {
    // Stäng alltid connections
    if (todoClient) {
      await todoClient.end();
      console.log('Todo client connection closed');
    }
    if (client) {
      await client.end();
      console.log('Main client connection closed');
    }
    process.exit(0);
  }
};

initDatabase();