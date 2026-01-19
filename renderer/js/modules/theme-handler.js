// ============= THEME & NAVIGATION =============

// Platform detection for keyboard shortcuts
const isMac = navigator.userAgentData?.platform === 'macOS'
    || /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl+';

function initShortcutHints() {
    // New Order/User button tooltip
    const newBtn = document.getElementById('new-btn');
    if (newBtn) {
        newBtn.dataset.tooltip = `${modKey}N`;
    }

    // Form action buttons - Order form
    const submitOrderBtn = document.getElementById('submit-order-btn');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');

    if (submitOrderBtn) {
        submitOrderBtn.dataset.tooltip = `${modKey}Enter`;
    }
    if (cancelOrderBtn) {
        cancelOrderBtn.dataset.tooltip = 'Esc';
    }

    // Form action buttons - User form
    const submitUserBtn = document.getElementById('submit-user-btn');
    const cancelUserBtn = document.getElementById('cancel-user-btn');

    if (submitUserBtn) {
        submitUserBtn.dataset.tooltip = `${modKey}Enter`;
    }
    if (cancelUserBtn) {
        cancelUserBtn.dataset.tooltip = 'Esc';
    }

    const hintSpan = document.querySelector('.shortcut-hint');
    if (hintSpan) {
        hintSpan.textContent = `${modKey}Enter to submit · Esc to cancel`;
    }
}

function initTheme() {
    const themeMenuItem = document.getElementById('theme-menu-item');
    const navMenu = document.getElementById('nav-menu');
    
    // Detect and set initial theme from OS/browser preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    themeMenuItem.innerHTML = prefersDark ? '<span>Light Mode</span><span class="theme-icon-right">☀</span>' : '<span>Dark Mode</span><span class="theme-icon-right">☾</span>';
    
    // Theme handling
    themeMenuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        themeMenuItem.innerHTML = newTheme === 'dark' ? '<span>Light Mode</span><span class="theme-icon-right">☀</span>' : '<span>Dark Mode</span><span class="theme-icon-right">☾</span>';
        navMenu.classList.remove('open');
    });
}
