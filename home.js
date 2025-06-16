const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginButton = document.getElementById('login-button');
const listEl = document.getElementById('collections-list');
const loginModalOverlay = document.getElementById('login-modal-overlay');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginSubmitButton = document.getElementById('login-submit-button');
const loginErrorMessage = document.getElementById('login-error-message');
const closeLoginModalX = document.getElementById('close-login-modal-x');

supabase.auth.getSession().then(({ data }) => updateLoginUI(data.session?.user));
supabase.auth.onAuthStateChange((_ev, session) => updateLoginUI(session?.user));

loginButton.addEventListener('click', async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await supabase.auth.signOut();
    updateLoginUI(null);
  } else {
    openLoginModal();
  }
});

function updateLoginUI(user) {
  loginButton.textContent = user ? 'Cerrar sesión' : 'Iniciar sesión';
}

async function loadCollections() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/colecciones?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  const data = await res.json();
  listEl.innerHTML = '';
  data.forEach(c => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/quiz.html?collection=${c.id}`;
    a.textContent = c.nombre;
    li.appendChild(a);
    listEl.appendChild(li);
  });
}

loadCollections();

function openLoginModal() {
  if (loginModalOverlay) loginModalOverlay.classList.remove('hidden');
  if (loginErrorMessage) loginErrorMessage.textContent = '';
}

function closeLoginModal() {
  if (loginModalOverlay) loginModalOverlay.classList.add('hidden');
}

loginSubmitButton.addEventListener('click', async () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginErrorMessage.textContent = error.message;
  } else {
    closeLoginModal();
  }
});

loginModalOverlay.addEventListener('click', e => {
  if (e.target === loginModalOverlay) closeLoginModal();
});

closeLoginModalX.addEventListener('click', closeLoginModal);
