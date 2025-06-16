// home.js
document.addEventListener('DOMContentLoaded', () => {
    loadCollections();
});

const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';

async function loadCollections() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/colecciones?select=*`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await res.json();
        renderCarousel(data);
    } catch (err) {
        console.error('Error al cargar colecciones', err);
    }
}

function renderCarousel(collections) {
    const container = document.getElementById('collections-carousel');
    container.innerHTML = '';
    collections.forEach(col => {
        const card = document.createElement('a');
        card.className = 'collection-card';
        card.href = `/collections/${col.id}`;

        const materia = document.createElement('div');
        materia.className = 'collection-materia';
        materia.textContent = col.materia;

        const nombre = document.createElement('div');
        nombre.className = 'collection-nombre';
        nombre.textContent = col.nombre;

        const desc = document.createElement('div');
        desc.className = 'collection-descripcion';
        desc.textContent = col.descripcion;

        card.appendChild(materia);
        card.appendChild(nombre);
        card.appendChild(desc);

        container.appendChild(card);
    });
}
