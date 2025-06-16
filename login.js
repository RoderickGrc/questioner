const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const submitButton = document.getElementById('login-submit-button');
const logoutButton = document.getElementById('login-logout-button');
const errorMessage = document.getElementById('login-error-message');

function updateUI(session) {
  if (session) {
    emailInput.parentElement.classList.add('hidden');
    passwordInput.parentElement.classList.add('hidden');
    submitButton.classList.add('hidden');
    logoutButton.classList.remove('hidden');
  } else {
    emailInput.parentElement.classList.remove('hidden');
    passwordInput.parentElement.classList.remove('hidden');
    submitButton.classList.remove('hidden');
    logoutButton.classList.add('hidden');
  }
  if (errorMessage) errorMessage.textContent = '';
}

supabase.auth.getSession().then(({ data }) => updateUI(data.session));
supabase.auth.onAuthStateChange((_ev, session) => updateUI(session));

submitButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorMessage.textContent = error.message;
  } else {
    window.location.href = '/';
  }
});

logoutButton.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/';
});
