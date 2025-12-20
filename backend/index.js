const path = require('path');
const express = require('express');
const cors = require('cors');
const InstagramNotes = require('instagram-notes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
let notesClient = null;

// --- Initialize session if SESSION_ID exists ---
if (process.env.SESSION_ID) {
  try {
    notesClient = new InstagramNotes(process.env.SESSION_ID);
    console.log('Initialized InstagramNotes with saved SESSION_ID');
  } catch (err) {
    console.log('Failed to initialize InstagramNotes with saved SESSION_ID:', err.message);
  }
}

// --- Serve frontend ---
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// --- API routes ---

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const sessionId = await InstagramNotes.getSessionId(username, password);
    notesClient = new InstagramNotes(sessionId);

    // For local testing, you can log the sessionId. For Railway, save it in Project -> Variables
    console.log('Login successful. SESSION_ID:', sessionId);

    res.json({ success: true, message: 'Logged in successfully!', sessionId });
  } catch (err) {
    console.error('Login failed:', err.message);
    res.status(400).json({ success: false, message: 'Login failed. Check credentials.', error: err.message });
  }
});

// Get notes
app.get('/notes', async (req, res) => {
  if (!notesClient) return res.status(400).json({ success: false, message: 'Not logged in' });

  try {
    const notes = await notesClient.getNotes();
    res.json(notes || []);
  } catch (err) {
    console.error('Error fetching notes:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create note
app.post('/notes', async (req, res) => {
  if (!notesClient) return res.status(400).json({ success: false, message: 'Not logged in' });

  const { text } = req.body;
  if (!text || text.length < 1 || text.length > 60) {
    return res.status(400).json({ success: false, message: 'Note must be between 1-60 characters' });
  }

  try {
    await notesClient.createNote(text);
    res.json({ success: true, message: 'Note created successfully!' });
  } catch (err) {
    console.error('Error creating note:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete note
app.delete('/notes/:id', async (req, res) => {
  if (!notesClient) return res.status(400).json({ success: false, message: 'Not logged in' });

  const { id } = req.params;
  try {
    await notesClient.deleteNote(id);
    res.json({ success: true, message: 'Note deleted successfully!' });
  } catch (err) {
    console.error('Error deleting note:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

