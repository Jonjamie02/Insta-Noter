const loginBtn = document.getElementById('loginBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesDiv = document.getElementById('notes');
const loginDiv = document.getElementById('login');
const notesList = document.getElementById('notesList');
const password = document.getElementById('password');
const toggle = document.getElementById('togglePassword');
const newNoteInput = document.getElementById('newNote');
const charCounter = document.getElementById('charCounter');
const emptyState = document.getElementById('emptyState');
const noteSpinner = document.getElementById('noteSpinner');

// Session management
let authToken = null;
let currentUsername = null;

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', () => {
  authToken = localStorage.getItem('authToken');
  currentUsername = localStorage.getItem('currentUsername');
  if (authToken) {
    verifySession();
  }
});

async function verifySession() {
  try {
    const res = await fetch('/notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (res.ok) {
      loginDiv.style.display = 'none';
      notesDiv.style.display = 'block';
      loadNotes();
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

function logout() {
  authToken = null;
  currentUsername = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUsername');
  loginDiv.style.display = 'flex';
  notesDiv.style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// Character counter
newNoteInput.addEventListener('input', () => {
  const length = newNoteInput.value.length;
  charCounter.textContent = `${length}/60`;
  
  charCounter.classList.remove('warning', 'danger');
  if (length >= 55) {
    charCounter.classList.add('danger');
  } else if (length >= 45) {
    charCounter.classList.add('warning');
  }
});

// Toggle password visibility
toggle.addEventListener('click', () => {
  if (password.type === 'password') {
    password.type = 'text';
    toggle.textContent = 'Hide';
  } else {
    password.type = 'password';
    toggle.textContent = 'Show';
  }
});

// Login
loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const passwordValue = document.getElementById('password').value;
  const spinner = document.getElementById('spinner');

  if (!username || !passwordValue) {
    alert('Please enter both username and password');
    return;
  }

  spinner.style.display = 'block';
  loginBtn.disabled = true;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordValue })
    });
    
    const data = await res.json();

    if (data.success && data.token) {
      authToken = data.token;
      currentUsername = username;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUsername', username);
      
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      
      loginDiv.style.display = 'none';
      notesDiv.style.display = 'block';
      loadNotes();
    } else {
      alert(data.message || 'Login failed. Please check your Instagram credentials.');
    }
  } catch (err) {
    alert('Login failed: ' + err.message);
  } finally {
    spinner.style.display = 'none';
    loginBtn.disabled = false;
  }
});

// Handle session expiration
function handleSessionError(message) {
  alert(message || 'Your session has expired. Please login again.');
  logout();
}

// Load notes from Instagram
async function loadNotes() {
  if (!authToken) {
    handleSessionError('Not logged in');
    return;
  }

  try {
    const res = await fetch('/notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        const data = await res.json();
        handleSessionError(data.message);
        return;
      }
      throw new Error('Failed to load notes');
    }
    
    const notesData = await res.json();
    
    // Handle different response formats from Instagram API
    let notes = [];
    
    if (Array.isArray(notesData)) {
      notes = notesData;
    } else if (notesData.items && Array.isArray(notesData.items)) {
      notes = notesData.items;
    } else if (notesData.notes && Array.isArray(notesData.notes)) {
      notes = notesData.notes;
    }
    
    console.log('Notes received:', notes);
        
      const myNotes = notes.filter(note => {
      const noteUser = note.user?.username || note.username || '';
      return noteUser === currentUsername;
    });
    
    console.log('My notes:', myNotes);
    
    notesList.innerHTML = '';
    
    if (!myNotes || myNotes.length === 0) {
      emptyState.style.display = 'block';
      notesList.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      notesList.style.display = 'block';
      
      myNotes.forEach(note => {
        const li = document.createElement('li');
        
        // Handle different note formats
        const noteText = note.text || note.note || note.content || 'No text';
        const noteId = note.id || note.note_id;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = noteText;
        textSpan.style.flex = '1';
        textSpan.style.fontWeight = 'bold';
        
        li.appendChild(textSpan);
        
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.onclick = async () => {
          if (confirm('Are you sure you want to delete this note from Instagram?')) {
            await deleteNote(noteId);
          }
        };
        li.appendChild(delBtn);
        
        notesList.appendChild(li);
      });
    }
  } catch (err) {
    console.error('Failed to load notes:', err);
    alert('Failed to load notes: ' + err.message);
  }
}

// Delete specific note
async function deleteNote(noteId) {
  if (!authToken) {
    handleSessionError('Not logged in');
    return;
  }

  noteSpinner.style.display = 'block';
  try {
    const res = await fetch(`/notes/${noteId}`, { 
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        const data = await res.json();
        handleSessionError(data.message);
        return;
      }
      throw new Error('Failed to delete note');
    }
    
    const data = await res.json();
    
    if (data.success) {
      alert('Note deleted from Instagram!');
      loadNotes();
    } else {
      alert('Failed to delete note: ' + (data.message || data.error));
    }
  } catch (err) {
    alert('Error deleting note: ' + err.message);
  } finally {
    noteSpinner.style.display = 'none';
  }
}

// Add note
addNoteBtn.addEventListener('click', async () => {
  if (!authToken) {
    handleSessionError('Not logged in');
    return;
  }

  const text = newNoteInput.value.trim();
  
  if (!text) {
    alert('Note cannot be empty');
    return;
  }
  
  if (text.length > 60) {
    alert('Note must be 60 characters or less');
    return;
  }

  noteSpinner.style.display = 'block';
  addNoteBtn.disabled = true;

  try {
    const res = await fetch('/notes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ text })
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        const data = await res.json();
        handleSessionError(data.message);
        return;
      }
      throw new Error('Failed to create note');
    }
    
    const data = await res.json();
    
    if (data.success) {
      newNoteInput.value = '';
      charCounter.textContent = '0/60';
      charCounter.classList.remove('warning', 'danger');
      alert('Note posted to Instagram!');
      
      // Wait a bit for Instagram to process, then reload
      setTimeout(() => loadNotes(), 1000);
    } else {
      alert('Failed to create note: ' + (data.message || data.error));
    }
  } catch (err) {
    alert('Error creating note: ' + err.message);
  } finally {
    noteSpinner.style.display = 'none';
    addNoteBtn.disabled = false;
  }
});

// Allow Enter key to login
const usernameInput = document.getElementById('username');
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

password.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

// Allow Enter key to add note
newNoteInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addNoteBtn.click();
  }
});
