// ============= MAIN APPLICATION =============

// API Configuration
const API_URL = 'http://127.0.0.1:5000';
window.API_URL = API_URL; // Make available globally for modules

// ============= NAVIGATION =============

const menuToggle = document.getElementById('menu-toggle');
const navSidebar = document.getElementById('nav-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarClose = document.getElementById('sidebar-close');

// Track current view for context-aware button
let currentView = 'orders';

// New/Action button handling (context-aware)
document.getElementById('new-btn').addEventListener('click', async () => {
    if (currentView === 'users') {
        if (await switchView('new-user')) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        }
    } else {
        if (await switchView('new-order')) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        }
    }
});

// Sidebar toggle handling (mobile)
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navSidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
});

// Close sidebar
function closeSidebar() {
    navSidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
}

sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navSidebar.classList.contains('open')) {
        closeSidebar();
    }
});

// Navigation handling - exclude theme and snow menu items
document.querySelectorAll('.nav-item:not(.disabled):not(#theme-menu-item):not(#snow-menu-item)').forEach(item => {
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

        // Close sidebar (mobile)
        closeSidebar();
    });
});

async function switchView(view) {
    // Guard: if leaving new-order or new-user view with unsaved data, confirm first
    console.log('Requested view switch: ' + view)
    if (isNewOrderViewVisible() && !await confirmDiscardUnsavedOrder()) {
        return false;
    }
    if (isNewUserViewVisible() && !await confirmDiscardUnsavedUser()) {
        return false;
    }

    // Hide all sections
    document.getElementById('inventory-list-section').classList.add('hidden');
    document.getElementById('order-detail-panel').classList.remove('open');
    document.getElementById('users-list-section').classList.add('hidden');
    document.getElementById('user-detail-panel').classList.remove('open');
    document.getElementById('new-order-section').classList.add('hidden');
    const newUserSection = document.getElementById('new-user-section');
    if (newUserSection) newUserSection.classList.add('hidden');

    // Update header title
    const headerTitle = document.querySelector('header h1');
    const newBtn = document.getElementById('new-btn');

    // Show selected view
    if (view === 'orders') {
        document.getElementById('inventory-list-section').classList.remove('hidden');
        headerTitle.textContent = 'Orders';
        newBtn.textContent = 'New Order';
        currentView = 'orders';
        fetchOrders(API_URL);
    } else if (view === 'users') {
        document.getElementById('users-list-section').classList.remove('hidden');
        headerTitle.textContent = 'Users';
        newBtn.textContent = 'New User';
        currentView = 'users';
        fetchUsers(API_URL);
    } else if (view === 'new-order') {
        document.getElementById('new-order-section').classList.remove('hidden');
        headerTitle.textContent = 'New Order';
        newBtn.textContent = 'New Order';
        initNewOrderForm(API_URL);
    } else if (view === 'new-user') {
        const newUserSection = document.getElementById('new-user-section');
        if (newUserSection) {
            newUserSection.classList.remove('hidden');
            headerTitle.textContent = 'New User';
            newBtn.textContent = 'New User';
            initNewUserForm(API_URL);
        }
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

// Initialize resizable detail panels
initAllPanelResizers();

// Initialize order form handlers
initSameAsShippingCheckbox();
initOrderFormHandlers(API_URL, switchView);

// Initialize new user form handlers
initNewUserFormHandlers(API_URL, switchView);

// Initialize user search
initUserSearch();

// Close detail panel buttons
document.getElementById('close-detail').addEventListener('click', closeDetailPanel);
document.getElementById('close-user-detail').addEventListener('click', closeUserDetailPanel);

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
    // Cmd+N (Mac) or Ctrl+N (Windows/Linux) - Context-aware new (Order or User)
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        const targetView = currentView === 'users' ? 'new-user' : 'new-order';
        if (await switchView(targetView)) {
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
