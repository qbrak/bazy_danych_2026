// ============= NEW ORDER FORM =============

let itemCounter = 0;
let availableBooks = [];

async function initNewOrderForm(apiUrl) {
    // Reset form
    itemCounter = 0;
    document.getElementById('order-items-container').innerHTML = '';
    document.getElementById('new-order-form').reset();
    
    // Fetch customers and books
    await Promise.all([fetchCustomers(apiUrl), fetchBooks(apiUrl)]);
    
    // Add initial empty row
    addOrderItemRow();
    
    // Focus on customer search input
    document.getElementById('customer-search-input').focus();
}

async function fetchBooks(apiUrl) {
    try {
        // Fetch inventory which has current prices
        const response = await fetch(`${apiUrl}/inventory`);
        if (!response.ok) throw new Error('Failed to fetch inventory');
        const inventory = await response.json();
        
        // Transform to include price information
        availableBooks = inventory.map(item => ({
            isbn: item.isbn,
            title: item.title || 'Unknown Title',
            publication_year: item.publication_year,
            inventory_id: item.inventory_id,
            price: parseFloat(item.unit_cost || 0)
        }));
    } catch (error) {
        console.error('Error fetching books:', error);
    }
}

function initSameAsShippingCheckbox() {
    const sameAsShippingCheckbox = document.getElementById('same-as-shipping');
    const billingAddressGroup = document.getElementById('billing-address-group');
    
    sameAsShippingCheckbox.addEventListener('change', (e) => {
        const billingSelect = document.getElementById('billing-address-select');
        if (e.target.checked) {
            billingSelect.value = document.getElementById('shipping-address-select').value;
            billingSelect.disabled = true;
            billingAddressGroup.style.display = 'none';
        } else {
            billingSelect.disabled = false;
            billingAddressGroup.style.display = 'block';
        }
    });
    
    // Also sync when shipping address changes
    document.getElementById('shipping-address-select').addEventListener('change', (e) => {
        if (sameAsShippingCheckbox.checked) {
            document.getElementById('billing-address-select').value = e.target.value;
        }
    });
    
    // Initialize - hide billing address on load since checkbox is checked by default
    if (sameAsShippingCheckbox.checked) {
        billingAddressGroup.style.display = 'none';
    }
}

function addOrderItemRow(autoFocus = false) {
    itemCounter++;
    const container = document.getElementById('order-items-container');
    const row = document.createElement('tr');
    row.className = 'order-item-row';
    row.dataset.itemId = itemCounter;
    
    row.innerHTML = `
        <td>
            <select class="book-select">
                <option value="">Select a book...</option>
                ${availableBooks.map(book => `
                    <option value="${book.isbn}" data-price="${book.price}">${book.title} (${book.publication_year})</option>
                `).join('')}
            </select>
        </td>
        <td>
            <input type="number" class="quantity-input" min="1" value="1">
        </td>
        <td class="unit-price">0.00 zł</td>
        <td class="row-total">0.00 zł</td>
        <td class="delete-cell">
            <button type="button" class="delete-row-btn" title="Delete row">×</button>
        </td>
    `;
    
    container.appendChild(row);
    
    const bookSelect = row.querySelector('.book-select');
    const quantityInput = row.querySelector('.quantity-input');
    const unitPriceCell = row.querySelector('.unit-price');
    const rowTotalCell = row.querySelector('.row-total');
    
    // Update price and total when book is selected
    bookSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        const price = parseFloat(selectedOption.dataset.price || 0);
        unitPriceCell.textContent = `${price.toFixed(2)} zł`;
        updateRowTotal(row);
        updateOrderTotal();
        
        if (e.target.value && !hasEmptyRow()) {
            addOrderItemRow();
        }
    });
    
    // Update total when quantity changes
    quantityInput.addEventListener('input', () => {
        updateRowTotal(row);
        updateOrderTotal();
    });
    
    // Add delete button handler
    const deleteBtn = row.querySelector('.delete-row-btn');
    deleteBtn.addEventListener('click', () => {
        const rows = container.querySelectorAll('.order-item-row');
        if (rows.length > 1) {
            row.remove();
            updateOrderTotal();
            // Ensure we always have at least one empty row
            if (!hasEmptyRow()) {
                addOrderItemRow();
            }
        }
    });
    
    if (autoFocus) {
        bookSelect.focus();
    }
}

function updateRowTotal(row) {
    const bookSelect = row.querySelector('.book-select');
    const selectedOption = bookSelect.selectedOptions[0];
    const price = parseFloat(selectedOption?.dataset?.price || 0);
    const quantity = parseInt(row.querySelector('.quantity-input').value || 0);
    const total = price * quantity;
    
    row.querySelector('.row-total').textContent = `${total.toFixed(2)} zł`;
}

function updateOrderTotal() {
    let total = 0;
    document.querySelectorAll('.order-item-row').forEach(row => {
        const bookSelect = row.querySelector('.book-select');
        if (bookSelect.value) {
            const selectedOption = bookSelect.selectedOptions[0];
            const price = parseFloat(selectedOption?.dataset?.price || 0);
            const quantity = parseInt(row.querySelector('.quantity-input').value || 0);
            total += price * quantity;
        }
    });
    
    document.getElementById('order-total').textContent = `${total.toFixed(2)} zł`;
}

function hasEmptyRow() {
    const rows = document.querySelectorAll('.order-item-row');
    return Array.from(rows).some(row => {
        const bookSelect = row.querySelector('.book-select');
        return !bookSelect.value;
    });
}

function initOrderFormHandlers(apiUrl, switchView) {
    // Cancel button
    document.getElementById('cancel-order-btn').addEventListener('click', () => {
        switchView('orders');
        document.querySelector('.nav-item[data-view="orders"]').classList.add('active');
        document.querySelector('.nav-item[data-view="new-order"]').classList.remove('active');
    });
    
    // Form submission
    document.getElementById('new-order-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerId = document.getElementById('selected-customer-id').value;
        const shippingAddressId = document.getElementById('shipping-address-select').value;
        const billingAddressId = document.getElementById('billing-address-select').value;
        
        // Collect order items
        const items = [];
        document.querySelectorAll('.order-item-row').forEach(row => {
            const isbn = row.querySelector('.book-select').value;
            const quantity = parseInt(row.querySelector('.quantity-input').value);
            if (isbn && quantity > 0) {
                items.push({ isbn, quantity });
            }
        });
        
        if (items.length === 0) {
            alert('Please add at least one item to the order');
            return;
        }
        
        // Create order
        try {
            const response = await fetch(`${apiUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: customerId,
                    shipping_address_id: shippingAddressId,
                    billing_address_id: billingAddressId,
                    items: items
                })
            });
            
            if (!response.ok) throw new Error('Failed to create order');
            
            alert('Order created successfully!');
            switchView('orders');
            document.querySelector('.nav-item[data-view="orders"]').classList.add('active');
            document.querySelector('.nav-item[data-view="new-order"]').classList.remove('active');
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Failed to create order. Please try again.');
        }
    });
}
