// ============= NEW USER FORM =============

function initNewUserForm(apiUrl) {
    // Reset form
    document.getElementById('new-user-form').reset();

    // Set default country
    document.getElementById('address-country').value = 'Polska';

    // Focus on first name input
    document.getElementById('user-name').focus();
}

function userFormHasData() {
    const name = document.getElementById('user-name').value.trim();
    const surname = document.getElementById('user-surname').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const password = document.getElementById('user-password').value;
    const street = document.getElementById('address-street').value.trim();

    return name || surname || email || phone || password || street;
}

function isNewUserViewVisible() {
    const newUserSection = document.getElementById('new-user-section');
    return newUserSection && !newUserSection.classList.contains('hidden');
}

// Simple hash function for password (SHA-256)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function initNewUserFormHandlers(apiUrl, switchView) {
    // Cancel button
    document.getElementById('cancel-user-btn').addEventListener('click', () => {
        switchView('users');
    });

    // CTRL+Enter / CMD+Enter to submit
    document.getElementById('new-user-form').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('new-user-form').requestSubmit();
        }
    });

    // Escape to cancel - listen on document level
    document.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape' && isNewUserViewVisible()) {
            e.preventDefault();
            await switchView('users');
        }
    });

    // Form submission
    document.getElementById('new-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('user-name').value.trim();
        const surname = document.getElementById('user-surname').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const phone = document.getElementById('user-phone').value.trim() || null;
        const password = document.getElementById('user-password').value;

        // Hash the password
        const passhash = await hashPassword(password);

        // Build user data
        const userData = {
            name,
            surname,
            email,
            passhash,
            phone,
            email_verified: false
        };

        // Check if address data is provided
        const street = document.getElementById('address-street').value.trim();
        const building = document.getElementById('address-building').value.trim();
        const apartment = document.getElementById('address-apartment').value.trim();
        const postal = document.getElementById('address-postal').value.trim();
        const city = document.getElementById('address-city').value.trim();
        const country = document.getElementById('address-country').value.trim();

        if (street && city && postal) {
            userData.address = {
                street,
                building_nr: building || null,
                apartment_nr: apartment || null,
                postal_code: postal,
                city,
                country: country || 'Polska'
            };
        }

        try {
            const response = await fetch(`${apiUrl}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create user');
            }

            // Reset form before switching
            document.getElementById('new-user-form').reset();

            alert('User created successfully!');
            switchView('users');
        } catch (error) {
            console.error('Error creating user:', error);
            alert(`Failed to create user: ${error.message}`);
        }
    });
}
