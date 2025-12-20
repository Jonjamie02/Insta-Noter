const loginBtn = document.getElementById('loginBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesDiv = document.getElementById('notes');
const loginDiv = document.getElementById('login');
const notesList = document.getElementById('notesList');
const password = document.getElementById('password');
const toggle = document.getElementById('togglePassword');

toggle.addEventListener('click', () => {
    if (password.type === 'password') {
        password.type = 'text';
        toggle.textContent = 'Hide';
    } else {
        password.type = 'password';
        toggle.textContent = 'Show';
    }
});

loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) {
    loginDiv.style.display = 'none';
    notesDiv.style.display = 'block';
    loadNotes();
  } else {
    alert(data.message);
  }
});

async function loadNotes() {
  const res = await fetch('/notes');
  const notes = await res.json();
  notesList.innerHTML = '';
  notes.forEach(note => {
    const li = document.createElement('li');
    li.textContent = note.text;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = async () => {
      await fetch(`/notes/${note.id}`, { method: 'DELETE' });
      loadNotes();
    };
    li.appendChild(delBtn);
    notesList.appendChild(li);
  });
}

addNoteBtn.addEventListener('click', async () => {
  const text = document.getElementById('newNote').value;
  if (!text) return alert('Note cannot be empty');
  await fetch('/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  document.getElementById('newNote').value = '';
  loadNotes();
});

