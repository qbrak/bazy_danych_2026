// ============= MAIN APPLICATION =============

// API Configuration
const API_URL = 'http://127.0.0.1:5000';
window.API_URL = API_URL; // Make available globally for modules

// ============= NAVIGATION =============

const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');

// New Order button handling
document.getElementById('new-order-btn').addEventListener('click', async () => {
    if (await switchView('new-order')) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    }
});

// Menu toggle handling
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('open');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove('open');
    }
});

// Navigation handling - exclude theme menu item
document.querySelectorAll('.nav-item:not(.disabled):not(#theme-menu-item)').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();
        const view = e.target.dataset.view;

        // Handle view switching (returns false if cancelled)
        if (!await switchView(view)) {
            return;
        }

        // Update active state
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');

        // Close menu
        navMenu.classList.remove('open');
    });
});

async function switchView(view) {
    // Guard: if leaving new-order view with unsaved data, confirm first
    console.log('Requested view switch: ' + view)
    if (isNewOrderViewVisible() && !await confirmDiscardUnsavedOrder()) {
        return false;
    }

    // Hide all sections
    document.getElementById('inventory-list-section').classList.add('hidden');
    document.getElementById('order-detail-panel').classList.remove('open');
    document.getElementById('new-order-section').classList.add('hidden');

    // Update header title
    const headerTitle = document.querySelector('header h1');

    // Show selected view
    if (view === 'orders') {
        document.getElementById('inventory-list-section').classList.remove('hidden');
        headerTitle.textContent = 'Orders';
        fetchOrders(API_URL);
    } else if (view === 'new-order') {
        document.getElementById('new-order-section').classList.remove('hidden');
        headerTitle.textContent = 'New Order';
        initNewOrderForm(API_URL);
    }

    return true;
}

// ============= INITIALIZATION =============

// Initialize theme
initTheme();

// Initialize keyboard shortcut hints (platform-aware)
initShortcutHints();

// Initialize snow effect
initSnowEffect();

// Initialize order form handlers
initSameAsShippingCheckbox();
initOrderFormHandlers(API_URL, switchView);

// Close detail panel button
document.getElementById('close-detail').addEventListener('click', closeDetailPanel);

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
    // Cmd+N (Mac) or Ctrl+N (Windows/Linux) - New Order
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (await switchView('new-order')) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        }
    }
});

// Initial load - Poll until backend is ready
const checkBackend = setInterval(() => {
    fetch(`${API_URL}/user_order_summary`)
        .then(res => {
            if (res.ok) {
                clearInterval(checkBackend);
                fetchOrders(API_URL);
            }
        })
        .catch(() => console.log('Waiting for backend...'));
}, 1000);
