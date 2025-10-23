import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

const initDatabase = async () => {
  let client;
  
  try {
    console.log('🔄 Starting database initialization...');
    
    // Use DATABASE_URL for Render, fallback for local
    const connectionConfig = process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    } : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

    client = new Client(connectionConfig);
    await client.connect();
    console.log('✅ Connected to database');

    // Create table
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

    // Clear and insert data
    await client.query('DELETE FROM todos;');
    
    await client.query(`
      INSERT INTO todos (title, description) 
      VALUES 
        ('Lär dig React', 'Studera React dokumentation'),
        ('Bygg Todo-app', 'Skapa en fullstack applikation'),
        ('Distribuera till Render', 'Publicera appen på Render');
    `);

    console.log('✅ Database initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
};

initDatabase();