import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5000;
const __dirname = path.resolve();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || [
    'http://localhost:5173', 
    'https://todo-frontend.onrender.com'
  ],
  credentials: true
}));
app.use(express.json());

// PostgreSQL connection pool - UPPDATERAD FÖR RENDER
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Testa att tabellen finns, skapa om den inte gör det
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'todos'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('Creating todos table...');
        await client.query(`
          CREATE TABLE todos (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Lägg till exempeldata
        await client.query(`
          INSERT INTO todos (title, description) 
          VALUES 
            ('Lär dig React', 'Studera React dokumentation'),
            ('Bygg Todo-app', 'Skapa en fullstack applikation'),
            ('Distribuera till Render', 'Publicera appen på Render')
        `);
        console.log('✅ Table created with sample data');
      }
    } catch (tableError) {
      console.log('Table check skipped:', tableError.message);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    // Avsluta inte processen i production, låt Render hantera omstarter
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Init database route för Render
app.post('/api/init-db', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Skapa tabell om den inte finns
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Rensa befintlig data och lägg till ny
    await client.query('DELETE FROM todos');
    
    await client.query(`
      INSERT INTO todos (title, description) 
      VALUES 
        ('Lär dig React', 'Studera React dokumentation'),
        ('Bygg Todo-app', 'Skapa en fullstack applikation'),
        ('Distribuera till Render', 'Publicera appen på Render')
    `);
    
    client.release();
    
    res.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
  } catch (error) {
    console.error('Init DB error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM todos ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    const result = await pool.query(
      `INSERT INTO todos (title, description) 
       VALUES ($1, $2) 
       RETURNING *`,
      [title.trim(), description?.trim() || '']
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Todo created successfully'
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    const result = await pool.query(
      `UPDATE todos 
       SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [title, description, completed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Todo updated successfully'
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    res.json({
      success: true,
      message: 'Todo deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  await testConnection();
});