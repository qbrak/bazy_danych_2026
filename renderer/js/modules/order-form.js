// ============= NEW ORDER FORM =============

let itemCounter = 0;

async function initNewOrderForm(apiUrl) {
    // Reset form
    itemCounter = 0;
    document.getElementById('order-items-container').innerHTML = '';
    document.getElementById('new-order-form').reset();
    
    // Fetch customers and books in parallel for responsiveness
    await Promise.all([
        fetchCustomers(apiUrl), 
        fetchBooksForSearch(apiUrl)
    ]);
    
    // Add initial empty row
    addOrderItemRow();
    
    // Focus on customer search input
    document.getElementById('customer-search-input').focus();
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
    
    const searchId = `book-search-${itemCounter}`;
    const resultsId = `book-results-${itemCounter}`;
    
    row.innerHTML = `
        <td>
            <div class="search-container">
                <input 
                    type="text" 
                    id="${searchId}"
                    class="book-search-input" 
                    placeholder="Type to search books..."
                    autocomplete="off"
                />
                <input type="hidden" class="selected-book-isbn" />
                <div id="${resultsId}" class="search-dropdown"></div>
            </div>
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
    
    const bookInput = row.querySelector(`#${searchId}`);
    const bookResultsDiv = row.querySelector(`#${resultsId}`);
    const isbnInput = row.querySelector('.selected-book-isbn');
    const quantityInput = row.querySelector('.quantity-input');
    const unitPriceCell = row.querySelector('.unit-price');
    const rowTotalCell = row.querySelector('.row-total');
    
    // Initialize book search for this row
    bookInput._onBookSelected = (book) => {
        isbnInput.value = book.isbn;
        unitPriceCell.textContent = `${book.price.toFixed(2)} zł`;
        row.dataset.price = book.price;
        
        // Set max quantity based on available stock
        const availableQty = book.available_quantity ?? 999;
        quantityInput.max = availableQty;
        quantityInput.min = availableQty > 0 ? 1 : 0;
        if (availableQty === 0) {
            quantityInput.value = 0;
            quantityInput.disabled = true;
        } else if (parseInt(quantityInput.value) > availableQty) {
            quantityInput.value = availableQty;
        }
        
        // Replace the search input with a formatted display
        const searchContainer = row.querySelector('.search-container');
        const yearText = book.publication_year ? ` (${book.publication_year})` : '';
        const authorText = book.authorDisplay ? `<div style="font-size: 0.85em; color: var(--text-color); opacity: 0.7; margin-top: 2px;">— ${book.authorDisplay}</div>` : '';
        const stockText = availableQty === 0
            ? ` <span style="font-size: 0.85em; color: #e74c3c;">(Out of stock)</span>`
            : ` <span style="font-size: 0.85em; opacity: 0.6;">(${availableQty} in stock)</span>`;
        
        searchContainer.innerHTML = `
            <div class="book-display" style="padding: 8px; background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 4px;">
                <div style="font-weight: 500;">${book.title}${yearText}${stockText}</div>
                ${authorText}
            </div>
            <input type="hidden" class="selected-book-isbn" value="${book.isbn}" />
        `;
        
        updateRowTotal(row);
        updateOrderTotal();
        
        // Add new row and focus on it
        if (!hasEmptyRow()) {
            setTimeout(() => {
                addOrderItemRow(true);
            }, 0);
        }
    };
    
    initBookSearch(bookInput, bookResultsDiv, bookInput._onBookSelected);
    
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
        bookInput.focus();
    }
    
    return row;
}

function updateRowTotal(row) {
    const price = parseFloat(row.dataset.price || 0);
    const quantity = parseInt(row.querySelector('.quantity-input').value || 0);
    const total = price * quantity;
    
    row.querySelector('.row-total').textContent = `${total.toFixed(2)} zł`;
}

function updateOrderTotal() {
    let total = 0;
    document.querySelectorAll('.order-item-row').forEach(row => {
        const isbnInput = row.querySelector('.selected-book-isbn');
        if (isbnInput && isbnInput.value) {
            const price = parseFloat(row.dataset.price || 0);
            const quantity = parseInt(row.querySelector('.quantity-input').value || 0);
            total += price * quantity;
        }
    });
    
    document.getElementById('order-total').textContent = `${total.toFixed(2)} zł`;
}

function hasEmptyRow() {
    const rows = document.querySelectorAll('.order-item-row');
    return Array.from(rows).some(row => {
        const isbnInput = row.querySelector('.selected-book-isbn');
        return !isbnInput || !isbnInput.value;
    });
}

function orderFormHasData() {
    // Check if a customer is selected
    const customerInput = document.getElementById('customer-search-input');
    if (customerInput && customerInput.value.trim()) {
        return true;
    }

    // Check if any books have been added
    const rows = document.querySelectorAll('.order-item-row');
    for (const row of rows) {
        const isbnInput = row.querySelector('.selected-book-isbn');
        if (isbnInput && isbnInput.value) {
            return true;
        }
    }

    return false;
}

function isNewOrderViewVisible() {
    const newOrderSection = document.getElementById('new-order-section');
    return newOrderSection && !newOrderSection.classList.contains('hidden');
}

function confirmDiscardUnsavedOrder() {
    // Returns true if OK to proceed, false if user wants to keep editing
    if (!orderFormHasData()) {
        return true;
    }
    // Inverted confirm: "No" cancels (returns false), "OK" discards (returns true)
    return confirm('You have unsaved changes. Discard current order?');
}

function cancelOrder(switchView) {
    if (!confirmDiscardUnsavedOrder()) {
        return;
    }
    switchView('orders');
    document.querySelector('.nav-item[data-view="orders"]').classList.add('active');
    document.querySelector('.nav-item[data-view="new-order"]').classList.remove('active');
}

function initOrderFormHandlers(apiUrl, switchView) {
    // Cancel button
    document.getElementById('cancel-order-btn').addEventListener('click', () => {
        cancelOrder(switchView);
    });

    // Keyboard shortcuts
    document.getElementById('new-order-form').addEventListener('keydown', (e) => {
        // CTRL+Enter (Windows) / CMD+Enter (Mac) to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('new-order-form').requestSubmit();
        }

        // Escape to cancel order
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelOrder(switchView);
        }
    });

    // Form submission
    document.getElementById('new-order-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shippingAddressId = document.getElementById('shipping-address-select').value;
        const billingAddressId = document.getElementById('billing-address-select').value;
        
        // Collect order items
        const items = [];
        document.querySelectorAll('.order-item-row').forEach(row => {
            const isbnInput = row.querySelector('.selected-book-isbn');
            const isbn = isbnInput ? isbnInput.value : null;
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
            const response = await fetch(`${apiUrl}/create_order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_address_id: shippingAddressId,
                    billing_address_id: billingAddressId,
                    items: items
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create order');
            }

            alert('Order created successfully!');
            switchView('orders');
        } catch (error) {
            console.error('Error creating order:', error);
            alert(`Failed to create order: ${error.message}`);
        }
    });
}
