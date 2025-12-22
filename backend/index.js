const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const Note = require('instagram-notes');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Store Instagram clients for logged-in users
const instagramClients = new Map();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get Instagram session ID
    console.log('Attempting to login to Instagram...');
    const sessionId = await Note.getSessionId(username, password);
    
    // Create Instagram client
    const client = new Note(sessionId);
    
    // Generate JWT token for our app
    const token = jwt.sign({ username, sessionId }, JWT_SECRET, { expiresIn: '24h' });
    
    // Store the client
    instagramClients.set(username, client);
    
    console.log('Login successful!');
    res.json({ success: true, token });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid Instagram credentials or login failed' 
    });
  }
});

// Get all notes from Instagram
app.get('/notes', authenticateToken, async (req, res) => {
  try {
    const client = instagramClients.get(req.user.username);
    
    if (!client) {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }

    const notes = await client.getNotes();
    res.json(notes);
  } catch (err) {
    console.error('Failed to get notes:', err);
    res.status(500).json({ success: false, message: 'Failed to load notes from Instagram' });
  }
});

// Create note on Instagram
app.post('/notes', authenticateToken, async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Note text is required' });
  }

  if (text.length > 60) {
    return res.status(400).json({ success: false, message: 'Note must be 60 characters or less' });
  }

  try {
    const client = instagramClients.get(req.user.username);
    
    if (!client) {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }

    const result = await client.createNote(text.trim());
    console.log('Note created on Instagram:', result);
    res.json({ success: true, note: result });
  } catch (err) {
    console.error('Failed to create note:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create note on Instagram: ' + err.message 
    });
  }
});

// Delete specific note by ID on Instagram
app.delete('/notes/:id', authenticateToken, async (req, res) => {
  const noteId = req.params.id;

  try {
    const client = instagramClients.get(req.user.username);
    
    if (!client) {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }

    await client.deleteNote(noteId);
    console.log('Note deleted from Instagram:', noteId);
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    console.error('Failed to delete note:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete note from Instagram: ' + err.message 
    });
  }
});

// Delete user's own note on Instagram
app.delete('/notes/delete-my-note', authenticateToken, async (req, res) => {
  try {
    const client = instagramClients.get(req.user.username);
    
    if (!client) {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }

    // Get all notes to find the user's note
    const notes = await client.getNotes();
    
    // Find the user's own note (you'll need to identify which one is yours)
    // The instagram-notes API returns notes with user info
    const myNote = notes.find(note => note.user?.username === req.user.username);
    
    if (!myNote) {
      return res.status(404).json({ 
        success: false, 
        message: 'You have no note to delete on Instagram' 
      });
    }

    await client.deleteNote(myNote.id);
    console.log('Your note deleted from Instagram');
    res.json({ success: true, message: 'Your note has been deleted from Instagram' });
  } catch (err) {
    console.error('Failed to delete your note:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete your note from Instagram: ' + err.message 
    });
  }
});

// Update last seen time
app.post('/notes/last-seen', authenticateToken, async (req, res) => {
  try {
    const client = instagramClients.get(req.user.username);
    
    if (!client) {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }

    await client.lastSeenUpdateNote();
    res.json({ success: true, message: 'Last seen updated' });
  } catch (err) {
    console.error('Failed to update last seen:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update last seen: ' + err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
