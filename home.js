const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('collections-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    fetch(`${SUPABASE_URL}/rest/v1/colecciones?select=*`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    })
    .then(r => r.json())
    .then(data => {
        data.forEach(c => {
            const card = document.createElement('a');
            card.href = `/collections/${c.id}`;
            card.className = 'collection-card';
            card.innerHTML = `
                <p class="collection-materia">${c.materia}</p>
                <h3>${c.nombre}</h3>
                <p>${c.descripcion}</p>
            `;
            track.appendChild(card);
        });
    })
    .catch(e => console.error('Error al cargar colecciones', e));

    prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
    });
});
