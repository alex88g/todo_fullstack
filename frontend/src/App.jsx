import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchTodos();
  }, []);

 const fetchTodos = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/todos`);
    const result = await response.json();
    
    console.log('API Response:', result);
    
    if (result.success && Array.isArray(result.data)) {
      setTodos(result.data);
    } else if (Array.isArray(result)) {
      setTodos(result);
    } else {
      console.error('Unexpected API response:', result);
      setTodos([]);
    }
  } catch (error) {
    console.error('Error fetching todos:', error);
    setTodos([]);
  }
};
  const createTodo = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (response.ok) {
        setTitle('');
        setDescription('');
        fetchTodos();
      }
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setEditingId(null);
        setEditTitle('');
        setEditDescription('');
        fetchTodos();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTodos();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  };

  const toggleComplete = (todo) => {
    updateTodo(todo.id, {
      title: todo.title,
      description: todo.description,
      completed: !todo.completed,
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Todo App</h1>
        <p>Hantera dina uppgifter enkelt</p>
      </header>

      <main className="app-main">
        <form onSubmit={createTodo} className="todo-form">
          <input
            type="text"
            placeholder="Lägg till ny uppgift..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="todo-input"
          />
          <textarea
            placeholder="Beskrivning (valfritt)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="todo-textarea"
          />
          <button type="submit" className="add-button">
            Lägg till
          </button>
        </form>

        <div className="todo-list">
          {todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              {editingId === todo.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="edit-input"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="edit-textarea"
                  />
                  <div className="edit-actions">
                    <button
                      onClick={() =>
                        updateTodo(todo.id, {
                          title: editTitle,
                          description: editDescription,
                          completed: todo.completed,
                        })
                      }
                      className="save-button"
                    >
                      Spara
                    </button>
                    <button onClick={cancelEditing} className="cancel-button">
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="todo-content">
                    <h3>{todo.title}</h3>
                    {todo.description && <p>{todo.description}</p>}
                    <div className="todo-meta">
                      <span>
                        Skapad: {new Date(todo.created_at).toLocaleDateString('sv-SE')}
                      </span>
                    </div>
                  </div>
                  <div className="todo-actions">
                    <button
                      onClick={() => toggleComplete(todo)}
                      className={`complete-button ${todo.completed ? 'completed' : ''}`}
                    >
                      {todo.completed ? 'Ångra' : 'Klart'}
                    </button>
                    <button
                      onClick={() => startEditing(todo)}
                      className="edit-button"
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="delete-button"
                    >
                      Ta bort
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;