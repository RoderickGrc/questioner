const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginButton = document.getElementById('login-button');
const listEl = document.getElementById('collections-list');

supabase.auth.getSession().then(({ data }) => updateLoginUI(data.session?.user));
supabase.auth.onAuthStateChange((_ev, session) => updateLoginUI(session?.user));

loginButton.addEventListener('click', async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await supabase.auth.signOut();
    updateLoginUI(null);
  } else {
    window.location.href = '/login.html';
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
    a.href = `/collections/${c.id}`;
    a.textContent = c.nombre;
    li.appendChild(a);
    listEl.appendChild(li);
  });
}

loadCollections();
