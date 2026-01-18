// ============= USER DISPLAY & DETAIL =============

// Fetch and display users
async function fetchUsers(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        renderUsers(users, apiUrl);
    } catch (error) {
        console.error('Error fetching users:', error);
        document.getElementById('users-body').innerHTML =
            '<tr><td colspan="5">Error loading users</td></tr>';
    }
}

function renderUsers(users, apiUrl) {
    const usersBody = document.getElementById('users-body');
    usersBody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.name} ${user.surname}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${user.email_verified ? '✓' : '✗'}</td>
        `;

        // Click to open detail panel
        row.addEventListener('click', () => openUserDetail(user.user_id, apiUrl));
        row.style.cursor = 'pointer';

        usersBody.appendChild(row);
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
        return `
            <div class="address-card">
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
