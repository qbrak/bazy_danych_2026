// ============= CUSTOMER SEARCH (FUZZY MATCHING) =============

let customers = [];
let customerSearcher = null;
let highlightedCustomerIndex = -1;

async function fetchCustomers(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/users`);
        if (!response.ok) throw new Error('Failed to fetch customers');
        customers = await response.json();
        
        // Initialize Fuse.js for fuzzy search
        customerSearcher = new Fuse(customers, {
            keys: [
                { name: 'name', weight: 0.4 },
                { name: 'surname', weight: 0.4 },
                { name: 'email', weight: 0.2 }
            ],
            threshold: 0.4,           // 0 = exact match, 1 = match anything
            distance: 100,            // How far to search for pattern
            includeScore: true,
            includeMatches: true,     // For highlighting
            minMatchCharLength: 2
        });
        
        // Initialize search input listener
        initCustomerSearch();

        console.log(`Loaded ${customers.length} customers for search`);

    } catch (error) {
        console.error('Error fetching customers:', error);
    }
}

function initCustomerSearch() {
    const searchInput = document.getElementById('customer-search-input');
    const resultsDropdown = document.getElementById('customer-search-results');
    
    if (!searchInput) return;
    
    // Search on input
    searchInput.addEventListener('input', (e) => {
        searchCustomers(e.target.value);
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const results = resultsDropdown.querySelectorAll('.search-result');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                highlightedCustomerIndex = Math.min(highlightedCustomerIndex + 1, results.length - 1);
                updateCustomerHighlight(results);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                highlightedCustomerIndex = Math.max(highlightedCustomerIndex - 1, 0);
                updateCustomerHighlight(results);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (highlightedCustomerIndex >= 0 && results[highlightedCustomerIndex]) {
                    selectCustomer(parseInt(results[highlightedCustomerIndex].dataset.userId));
                }
                break;
                
            case 'Escape':
                hideCustomerResults();
                break;
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            hideCustomerResults();
        }
    });
}

function searchCustomers(query) {
    const resultsDropdown = document.getElementById('customer-search-results');
    
    if (!query || query.length < 2) {
        hideCustomerResults();
        return;
    }
    
    const results = customerSearcher.search(query, { limit: 10 });
    displayCustomerResults(results);
}

function displayCustomerResults(results) {
    const resultsDropdown = document.getElementById('customer-search-results');
    highlightedCustomerIndex = -1;
    
    if (results.length === 0) {
        resultsDropdown.innerHTML = '<div class="search-result" style="cursor: default;">No customers found</div>';
    } else {
        resultsDropdown.innerHTML = results.map(({ item, matches }) => {
            const nameText = `${item.name} ${item.surname}`;
            const highlightedName = highlightMatches(nameText, matches, ['name', 'surname']);
            const highlightedEmail = highlightMatches(item.email, matches, ['email']);
            const phone = item.phone || 'No phone';
            
            return `
                <div class="search-result" data-user-id="${item.user_id}">
                    <div class="search-result-primary">${highlightedName}</div>
                    <div class="search-result-secondary">${highlightedEmail} • ${phone}</div>
                </div>
            `;
        }).join('');
        
        // Add click listeners to results
        resultsDropdown.querySelectorAll('.search-result').forEach(result => {
            if (result.dataset.userId) {
                result.addEventListener('click', () => {
                    selectCustomer(parseInt(result.dataset.userId));
                });
            }
        });
        
        // Auto-highlight first result
        highlightedCustomerIndex = 0;
        const allResults = resultsDropdown.querySelectorAll('.search-result');
        updateCustomerHighlight(allResults);
    }
    
    resultsDropdown.classList.add('visible');
    adjustCustomerDropdownHeight(resultsDropdown);
}

function adjustCustomerDropdownHeight(dropdown) {
    const rect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.top;
    const maxHeight = Math.min(300, spaceBelow - 20);
    dropdown.style.maxHeight = `${maxHeight}px`;
}

function highlightMatches(text, matches, keys) {
    if (!matches || !text) return text;
    
    // Find matches for specified keys
    const relevantMatches = matches.filter(m => keys.includes(m.key));
    if (relevantMatches.length === 0) return text;
    
    // Collect all character indices to highlight
    let highlightIndices = new Set();
    relevantMatches.forEach(match => {
        match.indices.forEach(([start, end]) => {
            for (let i = start; i <= end; i++) {
                highlightIndices.add(i);
            }
        });
    });
    
    // Build highlighted string
    let result = '';
    let inMark = false;
    for (let i = 0; i < text.length; i++) {
        const shouldHighlight = highlightIndices.has(i);
        
        if (shouldHighlight && !inMark) {
            result += '<mark>';
            inMark = true;
        } else if (!shouldHighlight && inMark) {
            result += '</mark>';
            inMark = false;
        }
        
        result += text[i];
    }
    
    if (inMark) result += '</mark>';
    return result;
}

function updateCustomerHighlight(results) {
    results.forEach((r, i) => {
        r.classList.toggle('active', i === highlightedCustomerIndex);
        if (i === highlightedCustomerIndex) {
            r.scrollIntoView({ block: 'nearest' });
        }
    });
}

function selectCustomer(userId) {
    const customer = customers.find(c => c.user_id === userId);
    if (!customer) return;
    
    // Update UI
    document.getElementById('customer-search-input').value = `${customer.name} ${customer.surname} (${customer.email}, ${customer.phone || 'No phone'})`;
    document.getElementById('selected-customer-id').value = userId;
    hideCustomerResults();
    
    // Load addresses for selected customer
    loadCustomerAddresses(userId);
}

function hideCustomerResults() {
    const resultsDropdown = document.getElementById('customer-search-results');
    resultsDropdown.classList.remove('visible');
    highlightedCustomerIndex = -1;
}

// This function needs to be exported for use in order-form.js
async function loadCustomerAddresses(userId) {
    const apiUrl = window.API_URL;
    
    if (!userId) {
        document.getElementById('shipping-address-select').innerHTML = '<option value="">Select shipping address...</option>';
        document.getElementById('billing-address-select').innerHTML = '<option value="">Select billing address...</option>';
        return;
    }
    
    try {
        const response = await fetch(`${apiUrl}/users/${userId}/addresses`);
        if (!response.ok) throw new Error('Failed to fetch addresses');
        const addresses = await response.json();
        
        const shippingSelect = document.getElementById('shipping-address-select');
        const billingSelect = document.getElementById('billing-address-select');
        
        shippingSelect.innerHTML = '<option value="">Select shipping address...</option>';
        billingSelect.innerHTML = '<option value="">Select billing address...</option>';
        
        primary_addr = null;

        addresses.forEach(addr => {
            const optionText = `${addr.street} ${addr.building_nr || ''}${addr.apartment_nr ? '/' + addr.apartment_nr : ''}, ${addr.city}`;
            
            const shippingOption = document.createElement('option');
            shippingOption.value = addr.address_id;
            shippingOption.textContent = optionText;
            shippingSelect.appendChild(shippingOption);
            
            const billingOption = document.createElement('option');
            billingOption.value = addr.address_id;
            billingOption.textContent = optionText;
            billingSelect.appendChild(billingOption);

            if (addr.is_primary) {
                primary_addr = addr.address_id;
            }
        });

        // Auto-select primary address if available
        if (primary_addr) {
            shippingSelect.value = primary_addr;
            billingSelect.value = primary_addr;
        }
    } catch (error) {
        console.error('Error fetching addresses:', error);
    }
}
