import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5000;

// Debug environment variables
console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
  port: process.env.PORT
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || [
    'http://localhost:5173', 
    'https://todo-fullstack-1-bgbx.onrender.com'
  ],
  credentials: true
}));
app.use(express.json());

// PostgreSQL connection pool - FIXED FOR RENDER
const getPoolConfig = () => {
  // If DATABASE_URL is provided (Render), use it directly
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }
  
  // Fallback to local development config
  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'todo_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
};

const pool = new Pool(getPoolConfig());

// Enhanced database connection test
const testConnection = async () => {
  let client;
  try {
    console.log('🔍 Testing database connection...');
    client = await pool.connect();
    
    console.log('✅ PostgreSQL connected successfully');
    
    // Check if todos table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'todos'
      );
    `);
    
    console.log('📊 Todos table exists:', tableCheck.rows[0].exists);
    
    // Create table if it doesn't exist
    if (!tableCheck.rows[0].exists) {
      console.log('🛠️ Creating todos table...');
      await client.query(`
        CREATE TABLE todos (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Add sample data
      await client.query(`
        INSERT INTO todos (title, description) 
        VALUES 
          ('Lär dig React', 'Studera React dokumentation'),
          ('Bygg Todo-app', 'Skapa en fullstack applikation'),
          ('Distribuera till Render', 'Publicera appen på Render');
      `);
      
      console.log('✅ Table created with sample data');
    } else {
      console.log('✅ Table already exists');
    }
    
    // Test data retrieval
    const testResult = await client.query('SELECT COUNT(*) FROM todos');
    console.log(`📈 Total todos in database: ${testResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Error details:', {
      code: error.code,
      detail: error.detail
    });
  } finally {
    if (client) {
      client.release();
      console.log('🔌 Database client released');
    }
  }
};

// Enhanced init database route
app.post('/api/init-db', async (req, res) => {
  let client;
  try {
    console.log('🔄 Initializing database...');
    client = await pool.connect();
    
    // Drop and recreate table
    await client.query('DROP TABLE IF EXISTS todos CASCADE;');
    
    await client.query(`
      CREATE TABLE todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert fresh data
    await client.query(`
      INSERT INTO todos (title, description) 
      VALUES 
        ('Lär dig React', 'Studera React dokumentation'),
        ('Bygg Todo-app', 'Skapa en fullstack applikation'),
        ('Distribuera till Render', 'Publicera appen på Render');
    `);
    
    console.log('✅ Database initialized successfully');
    
    res.json({ 
      success: true, 
      message: 'Database initialized successfully',
      data: {
        table: 'todos',
        records: 3
      }
    });
    
  } catch (error) {
    console.error('❌ Init DB error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check Render environment variables'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Health check with database test
app.get('/api/health', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const dbResult = await client.query('SELECT 1 as test');
    
    res.json({ 
      status: 'OK', 
      message: 'Server and database are running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      databaseTest: dbResult.rows[0].test
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Server running but database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (client) client.release();
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Todo App Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      todos: '/api/todos',
      initDb: '/api/init-db (POST)'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Todos routes
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// FIXED: 404 handler - use express built-in instead of router
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Health check: http://localhost:${port}/api/health`);
  
  // Test connection but don't block server start
  testConnection().then(() => {
    console.log('✅ Database initialization completed');
  }).catch(err => {
    console.log('⚠️ Database initialization had issues, but server is running');
  });
});

export default app;