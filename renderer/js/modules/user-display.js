// ============= USER DISPLAY & DETAIL =============

// Store users data and Fuse instance for search
let allUsers = [];
let userFuse = null;
let currentApiUrl = null;

// Fetch and display users
async function fetchUsers(apiUrl) {
    currentApiUrl = apiUrl;
    try {
        const response = await fetch(`${apiUrl}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        allUsers = users;

        // Initialize Fuse.js for fuzzy search
        userFuse = new Fuse(users, {
            keys: [
                { name: 'name', weight: 0.3 },
                { name: 'surname', weight: 0.3 },
                { name: 'email', weight: 0.2 },
                { name: 'phone', weight: 0.2 }
            ],
            threshold: 0.4,
            includeMatches: true
        });

        // Clear search input when switching to users view
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        renderUsers(users, apiUrl);
    } catch (error) {
        console.error('Error fetching users:', error);
        document.getElementById('users-body').innerHTML =
            '<tr><td colspan="5">Error loading users</td></tr>';
    }
}

function renderUsers(users, apiUrl, searchResults = null) {
    const usersBody = document.getElementById('users-body');
    usersBody.innerHTML = '';

    if (users.length === 0) {
        usersBody.innerHTML = '<tr><td colspan="5" class="empty-state">No users found</td></tr>';
        return;
    }

    users.forEach((user, index) => {
        const row = document.createElement('tr');

        // Get match info if available (for highlighting)
        const matches = searchResults ? searchResults[index]?.matches : null;

        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${highlightMatch(user.name + ' ' + user.surname, matches, ['name', 'surname'])}</td>
            <td>${highlightMatch(user.email, matches, ['email'])}</td>
            <td>${highlightMatch(user.phone || 'N/A', matches, ['phone'])}</td>
            <td>${user.email_verified ? '✓' : '✗'}</td>
        `;

        // Click to open detail panel
        row.addEventListener('click', () => openUserDetail(user.user_id, apiUrl));
        row.style.cursor = 'pointer';

        usersBody.appendChild(row);
    });
}

// Highlight matched text
function highlightMatch(text, matches, keys) {
    if (!matches || !text) return text;

    // Find matches for the specified keys
    const relevantMatches = matches.filter(m => keys.includes(m.key));
    if (relevantMatches.length === 0) return text;

    // Get all indices to highlight
    const indices = [];
    relevantMatches.forEach(match => {
        match.indices.forEach(([start, end]) => {
            // Adjust indices for combined name+surname field
            if (match.key === 'surname' && keys.includes('name')) {
                // Surname appears after name + space
                const nameLen = text.indexOf(' ') + 1;
                indices.push([start + nameLen, end + nameLen]);
            } else {
                indices.push([start, end]);
            }
        });
    });

    if (indices.length === 0) return text;

    // Sort indices and merge overlapping
    indices.sort((a, b) => a[0] - b[0]);

    let result = '';
    let lastEnd = 0;

    indices.forEach(([start, end]) => {
        if (start > lastEnd) {
            result += text.slice(lastEnd, start);
        }
        if (start >= lastEnd) {
            result += `<mark>${text.slice(start, end + 1)}</mark>`;
            lastEnd = end + 1;
        }
    });

    result += text.slice(lastEnd);
    return result;
}

// Initialize user search
function initUserSearch() {
    const searchInput = document.getElementById('user-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (!query) {
            // Show all users when search is empty
            renderUsers(allUsers, currentApiUrl);
            return;
        }

        if (!userFuse) return;

        // Perform fuzzy search
        const results = userFuse.search(query);
        const filteredUsers = results.map(r => r.item);
        renderUsers(filteredUsers, currentApiUrl, results);
    });
}

// User detail panel functions
async function openUserDetail(userId, apiUrl) {
    const detailPanel = document.getElementById('user-detail-panel');
    detailPanel.classList.add('open');

    const detailContent = document.getElementById('user-detail-content');
    detailContent.innerHTML = '<p>Loading user details...</p>';

    try {
        // Fetch user, addresses, and reviews in parallel
        const [userRes, addressesRes, reviewsRes] = await Promise.all([
            fetch(`${apiUrl}/users/${userId}`),
            fetch(`${apiUrl}/users/${userId}/addresses`),
            fetch(`${apiUrl}/users/${userId}/reviews`)
        ]);

        if (!userRes.ok) throw new Error('Failed to fetch user details');

        const user = await userRes.json();
        const addresses = addressesRes.ok ? await addressesRes.json() : [];
        const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

        renderUserDetail(user, addresses, reviews);
    } catch (error) {
        console.error('Error fetching user details:', error);
        detailContent.innerHTML = '<p>Error loading user details</p>';
    }
}

function renderUserDetail(user, addresses, reviews) {
    const detailContent = document.getElementById('user-detail-content');

    // Format address helper
    const formatAddress = (addr) => {
        const isPrimary = addr.is_primary;
        return `
            <div class="address-card ${isPrimary ? 'primary' : ''}">
                ${isPrimary ? '<span class="primary-badge" title="Primary address">★</span>' : ''}
                <div class="address-line">${addr.street} ${addr.building_nr || ''}${addr.apartment_nr ? '/' + addr.apartment_nr : ''}</div>
                <div class="address-line">${addr.postal_code} ${addr.city}</div>
                <div class="address-line">${addr.country}</div>
            </div>
        `;
    };

    // Build addresses HTML
    let addressesHTML = '<p class="empty-state">No addresses on file</p>';
    if (addresses.length > 0) {
        addressesHTML = `
            <div class="addresses-grid">
                ${addresses.map(addr => formatAddress(addr)).join('')}
            </div>
        `;
    }

    // Format authors helper
    const formatAuthors = (authors) => {
        if (!authors || authors.length === 0) return '';
        return authors.map(a => `${a.name} ${a.surname}`).join(', ');
    };

    // Build reviews HTML
    let reviewsHTML = '<p class="empty-state">No reviews written</p>';
    if (reviews.length > 0) {
        reviewsHTML = `
            <div class="reviews-list">
                ${reviews.map(review => {
                    const authorsText = formatAuthors(review.authors);
                    const hasBody = review.review_body && review.review_body.trim();
                    return `
                    <div class="review-card ${hasBody ? 'expandable' : ''}">
                        <div class="review-header">
                            <div class="review-book-info">
                                <span class="review-book">${review.title || review.isbn}</span>
                                ${authorsText ? `<span class="review-authors">by ${authorsText}</span>` : ''}
                            </div>
                            <span class="review-stars">${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}</span>
                        </div>
                        <div class="review-date">${review.review_date ? new Date(review.review_date).toLocaleDateString() : ''}</div>
                        ${hasBody ? `<p class="review-body">${review.review_body}</p>` : ''}
                    </div>
                `}).join('')}
            </div>
        `;
    }

    detailContent.innerHTML = `
        <div class="detail-section">
            <h3>${user.name} ${user.surname}</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <strong>Email:</strong>
                    <span>${user.email}</span>
                </div>
                <div class="detail-item">
                    <strong>Phone:</strong>
                    <span>${user.phone || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <strong>Email Verified:</strong>
                    <span>${user.email_verified ? 'Yes' : 'No'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Addresses</h3>
            ${addressesHTML}
        </div>

        <div class="detail-section">
            <h3>Reviews (${reviews.length})</h3>
            ${reviewsHTML}
        </div>
    `;

    // Add click handlers for expandable reviews (can't use inline onclick due to CSP)
    detailContent.querySelectorAll('.review-card.expandable').forEach(card => {
        card.addEventListener('click', () => card.classList.toggle('expanded'));
    });
}

function closeUserDetailPanel() {
    const detailPanel = document.getElementById('user-detail-panel');
    detailPanel.classList.remove('open');
    detailPanel.style.height = '';  // Clear inline height from resizing
}
