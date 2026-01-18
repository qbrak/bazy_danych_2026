// ============= USER DISPLAY & DETAIL =============

// Store users data and Fuse instance for search
let allUsers = [];
let userFuse = null;
let currentApiUrl = null;

// Store current user details for edit mode
let currentUserDetail = null;
let currentUserAddresses = null;
let currentUserReviews = null;
let isEditMode = false;

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

        // Store for edit mode
        currentUserDetail = user;
        currentUserAddresses = addresses;
        currentUserReviews = reviews;
        isEditMode = false;

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
            <div class="address-card ${isPrimary ? 'primary' : ''}" data-address-id="${addr.address_id}">
                <button class="primary-toggle ${isPrimary ? 'is-primary' : ''}" data-address-id="${addr.address_id}" title="${isPrimary ? 'Primary address' : 'Set as primary'}">★</button>
                <div class="address-line">${addr.street} ${addr.building_nr || ''}${addr.apartment_nr ? '/' + addr.apartment_nr : ''}</div>
                <div class="address-line">${addr.postal_code} ${addr.city}</div>
                <div class="address-line">${addr.country}</div>
            </div>
        `;
    };

    // Build addresses HTML with add button
    let addressesHTML = `
        <div class="addresses-grid">
            ${addresses.map(addr => formatAddress(addr)).join('')}
            <button class="address-card add-address-card" id="add-address-btn" title="Add new address">
                <div class="add-address-icon">+</div>
                <div class="add-address-text">Add Address</div>
            </button>
        </div>
    `;

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

    // Build user info section - different for edit mode vs view mode
    let userInfoHTML;
    if (isEditMode) {
        userInfoHTML = `
            <div class="detail-section">
                <div class="detail-section-header">
                    <h3>Edit User</h3>
                    <div class="edit-actions">
                        <button class="primary-btn" id="save-user-btn">Save</button>
                        <button class="secondary-btn" id="cancel-edit-btn">Cancel</button>
                    </div>
                </div>
                <div class="edit-form">
                    <div class="edit-row">
                        <div class="edit-field">
                            <label for="edit-user-name">First Name:</label>
                            <input type="text" id="edit-user-name" value="${user.name}" />
                        </div>
                        <div class="edit-field">
                            <label for="edit-user-surname">Last Name:</label>
                            <input type="text" id="edit-user-surname" value="${user.surname}" />
                        </div>
                    </div>
                    <div class="edit-field">
                        <label for="edit-user-email">Email:</label>
                        <input type="email" id="edit-user-email" value="${user.email}" />
                    </div>
                    <div class="edit-field">
                        <label for="edit-user-phone">Phone:</label>
                        <input type="tel" id="edit-user-phone" value="${user.phone || ''}" placeholder="+48 xxx xxx xxx" />
                    </div>
                    <div class="edit-field checkbox-field">
                        <label>
                            <input type="checkbox" id="edit-user-verified" ${user.email_verified ? 'checked' : ''} />
                            Email Verified
                        </label>
                    </div>
                </div>
            </div>
        `;
    } else {
        userInfoHTML = `
            <div class="detail-section">
                <div class="detail-section-header">
                    <h3>${user.name} ${user.surname}</h3>
                    <button class="secondary-btn" id="edit-user-btn">Edit</button>
                </div>
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
        `;
    }

    detailContent.innerHTML = `
        ${userInfoHTML}

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

    // Add edit/save/cancel handlers
    if (isEditMode) {
        document.getElementById('save-user-btn').addEventListener('click', saveUserChanges);
        document.getElementById('cancel-edit-btn').addEventListener('click', cancelEditMode);
    } else {
        document.getElementById('edit-user-btn').addEventListener('click', enterEditMode);
    }

    // Add address handlers
    document.getElementById('add-address-btn').addEventListener('click', showAddAddressForm);

    // Add primary toggle handlers
    detailContent.querySelectorAll('.primary-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const addressId = parseInt(btn.dataset.addressId);
            setAddressAsPrimary(addressId);
        });
    });
}

// Track if we're showing the add address form
let isAddingAddress = false;

function showAddAddressForm() {
    isAddingAddress = true;
    const detailContent = document.getElementById('user-detail-content');

    // Find the addresses section and replace with form
    const addressSection = detailContent.querySelectorAll('.detail-section')[1];
    addressSection.innerHTML = `
        <h3>Add New Address</h3>
        <div class="edit-form">
            <div class="edit-row">
                <div class="edit-field" style="flex: 2;">
                    <label for="new-addr-street">Street:</label>
                    <input type="text" id="new-addr-street" placeholder="ul. Przykładowa" />
                </div>
                <div class="edit-field" style="flex: 1;">
                    <label for="new-addr-building">Building:</label>
                    <input type="text" id="new-addr-building" placeholder="12" />
                </div>
                <div class="edit-field" style="flex: 1;">
                    <label for="new-addr-apartment">Apt:</label>
                    <input type="text" id="new-addr-apartment" placeholder="3" />
                </div>
            </div>
            <div class="edit-row">
                <div class="edit-field" style="flex: 1;">
                    <label for="new-addr-postal">Postal Code:</label>
                    <input type="text" id="new-addr-postal" placeholder="00-000" />
                </div>
                <div class="edit-field" style="flex: 2;">
                    <label for="new-addr-city">City:</label>
                    <input type="text" id="new-addr-city" placeholder="Wrocław" />
                </div>
            </div>
            <div class="edit-field">
                <label for="new-addr-country">Country:</label>
                <input type="text" id="new-addr-country" value="Polska" />
            </div>
            <div class="edit-field checkbox-field">
                <label>
                    <input type="checkbox" id="new-addr-primary" />
                    Set as primary address
                </label>
            </div>
            <div class="edit-actions" style="margin-top: 10px;">
                <button class="primary-btn" id="save-new-address-btn">Save Address</button>
                <button class="secondary-btn" id="cancel-new-address-btn">Cancel</button>
            </div>
        </div>
    `;

    document.getElementById('save-new-address-btn').addEventListener('click', saveNewAddress);
    document.getElementById('cancel-new-address-btn').addEventListener('click', cancelAddAddress);

    // Focus on street input
    document.getElementById('new-addr-street').focus();
}

function cancelAddAddress() {
    isAddingAddress = false;
    renderUserDetail(currentUserDetail, currentUserAddresses, currentUserReviews);
}

async function saveNewAddress() {
    const street = document.getElementById('new-addr-street').value.trim();
    const building_nr = document.getElementById('new-addr-building').value.trim() || null;
    const apartment_nr = document.getElementById('new-addr-apartment').value.trim() || null;
    const postal_code = document.getElementById('new-addr-postal').value.trim();
    const city = document.getElementById('new-addr-city').value.trim();
    const country = document.getElementById('new-addr-country').value.trim() || 'Polska';
    const is_primary = document.getElementById('new-addr-primary').checked;

    if (!street || !postal_code || !city) {
        alert('Street, postal code, and city are required.');
        return;
    }

    try {
        const response = await fetch(`${currentApiUrl}/users/${currentUserDetail.user_id}/addresses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ street, building_nr, apartment_nr, postal_code, city, country, is_primary })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create address');
        }

        // Refresh addresses
        const addressesRes = await fetch(`${currentApiUrl}/users/${currentUserDetail.user_id}/addresses`);
        currentUserAddresses = addressesRes.ok ? await addressesRes.json() : [];

        isAddingAddress = false;
        renderUserDetail(currentUserDetail, currentUserAddresses, currentUserReviews);
    } catch (error) {
        console.error('Error creating address:', error);
        alert(`Failed to create address: ${error.message}`);
    }
}

async function setAddressAsPrimary(addressId) {
    try {
        const response = await fetch(`${currentApiUrl}/addresses/${addressId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_primary: true })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update address');
        }

        // Refresh addresses
        const addressesRes = await fetch(`${currentApiUrl}/users/${currentUserDetail.user_id}/addresses`);
        currentUserAddresses = addressesRes.ok ? await addressesRes.json() : [];

        renderUserDetail(currentUserDetail, currentUserAddresses, currentUserReviews);
    } catch (error) {
        console.error('Error setting primary address:', error);
        alert(`Failed to set primary address: ${error.message}`);
    }
}

function enterEditMode() {
    isEditMode = true;
    renderUserDetail(currentUserDetail, currentUserAddresses, currentUserReviews);
}

function cancelEditMode() {
    isEditMode = false;
    renderUserDetail(currentUserDetail, currentUserAddresses, currentUserReviews);
}

async function saveUserChanges() {
    const name = document.getElementById('edit-user-name').value.trim();
    const surname = document.getElementById('edit-user-surname').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const phone = document.getElementById('edit-user-phone').value.trim() || null;
    const email_verified = document.getElementById('edit-user-verified').checked;

    if (!name || !surname || !email) {
        alert('Name, surname, and email are required.');
        return;
    }

    try {
        const response = await fetch(`${currentApiUrl}/users/${currentUserDetail.user_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email, phone, email_verified })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update user');
        }

        const updatedUser = await response.json();

        // Update stored user and exit edit mode
        currentUserDetail = updatedUser;
        isEditMode = false;
        renderUserDetail(currentUserDetail, currentUserAddresses, currentUserReviews);

        // Refresh the users list to reflect changes
        fetchUsers(currentApiUrl);
    } catch (error) {
        console.error('Error updating user:', error);
        alert(`Failed to update user: ${error.message}`);
    }
}

function closeUserDetailPanel() {
    const detailPanel = document.getElementById('user-detail-panel');
    detailPanel.classList.remove('open');
    detailPanel.style.height = '';  // Clear inline height from resizing
}
