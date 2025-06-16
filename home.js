const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';

let sidebar = null;
let openSidebarButton = null;
let closeSidebarButton = null;
let collectionTitleSpan = null;

window.addEventListener('DOMContentLoaded', () => {
    sidebar = document.getElementById('sidebar');
    openSidebarButton = document.getElementById('open-sidebar');
    closeSidebarButton = document.getElementById('close-sidebar');
    collectionTitleSpan = document.getElementById('collection-title');

    openSidebarButton.addEventListener('click', openSidebar);
    closeSidebarButton.addEventListener('click', closeSidebar);
    document.addEventListener('click', handleDocumentClick);

    loadCollections();
});

function openSidebar() {
    sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
}

function handleDocumentClick(event) {
    if (!sidebar.classList.contains('open')) return;
    if (window.innerWidth > 768) return;
    if (sidebar.contains(event.target) || openSidebarButton.contains(event.target)) return;
    closeSidebar();
}

async function loadCollections() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/colecciones?select=*`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await res.json();
        renderCollections(data);
        if (data.length > 0) {
            collectionTitleSpan.textContent = data[0].nombre;
        }
    } catch (e) {
        console.error('Error al cargar colecciones:', e);
    }
}

function renderCollections(cols) {
    const container = document.getElementById('collections-carousel');
    container.innerHTML = '';
    cols.forEach(col => {
        const card = document.createElement('a');
        card.href = `/collections/${col.id}`;
        card.className = 'collection-card';
        card.innerHTML = `
            <strong class="collection-materia">${col.materia}</strong>
            <h3>${col.nombre}</h3>
            <p>${col.descripcion}</p>
        `;
        container.appendChild(card);
    });
}
