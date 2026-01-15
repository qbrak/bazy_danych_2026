// ============= ORDER DISPLAY & DETAIL =============

// Create user card element
const userCard = document.createElement('div');
userCard.id = 'user-card';
userCard.style.display = 'none';
document.body.appendChild(userCard);

// Show user card on hover
async function showUserCard(userId, event, apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const user = await response.json();
        
        userCard.innerHTML = `
            <div class="user-card-content">
                <h3>${user.name} ${user.surname}</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                <p><strong>Email Verified:</strong> ${user.email_verified ? 'Yes' : 'No'}</p>
            </div>
        `;

        userCard.style.display = 'block';
        userCard.style.left = event.pageX + 10 + 'px';
        userCard.style.top = event.pageY + 10 + 'px';
    } catch (error) {
        console.error('Error fetching user:', error);
        userCard.innerHTML = '<div class="user-card-content"><p>Error loading user details</p></div>';
        userCard.style.display = 'block';
        userCard.style.left = event.pageX + 10 + 'px';
        userCard.style.top = event.pageY + 10 + 'px';
    }
}

function hideUserCard() {
    userCard.style.display = 'none';
}

// Hide user card when clicking anywhere outside
document.addEventListener('click', hideUserCard);

// Fetch and display orders
async function fetchOrders(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/user_order_summary`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        renderOrders(orders, apiUrl);
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

function renderOrders(orders, apiUrl) {
    const inventoryBody = document.getElementById('inventory-body');
    inventoryBody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.order_id}</td>
            <td class="customer-name" data-user-id="${order.user_id}">${order.name} ${order.surname}</td>
            <td>${new Date(order.order_time).toLocaleString()}</td>
            <td>${order.status_name}</td>
            <td>${order.payment_time ? new Date(order.payment_time).toLocaleString() : 'Pending'}</td>
            <td>${order.shipment_time ? new Date(order.shipment_time).toLocaleString() : 'Not shipped'}</td>
        `;
        
        // Click to open detail panel
        row.addEventListener('click', () => openOrderDetail(order.order_id, apiUrl));
        row.style.cursor = 'pointer';
        
        inventoryBody.appendChild(row);
        
        // Add hover listeners to customer name
        const customerCell = row.querySelector('.customer-name');
        customerCell.addEventListener('mouseenter', (e) => showUserCard(order.user_id, e, apiUrl));
        customerCell.addEventListener('mouseleave', hideUserCard);
    });
}

// Order detail panel functions
async function openOrderDetail(orderId, apiUrl) {
    const detailPanel = document.getElementById('order-detail-panel');
    detailPanel.classList.add('open');
    
    const detailContent = document.getElementById('detail-content');
    detailContent.innerHTML = '<p>Loading order details...</p>';
    
    try {
        const response = await fetch(`${apiUrl}/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order details');
        const order = await response.json();
        renderOrderDetail(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        detailContent.innerHTML = '<p>Error loading order details</p>';
    }
}

function renderOrderDetail(order) {
    const detailContent = document.getElementById('detail-content');
    
    // Build order items HTML if available
    let itemsHTML = '';
    if (order.items && order.items.length > 0) {
        itemsHTML = `
            <h3>Order Items</h3>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Book</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>${item.title || 'N/A'}</td>
                            <td>${item.quantity}</td>
                            <td>${parseFloat(item.unit_price || 0).toFixed(2)} zł</td>
                            <td>${parseFloat((item.quantity * item.unit_price) || 0).toFixed(2)} zł</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    // Check if billing address is same as shipping
    const sameAddress = order.shipping_address && order.billing_address && 
                        order.shipping_address.address_id === order.billing_address.address_id;
    
    // Format address helper
    const formatAddress = (addr) => {
        if (!addr) return 'N/A';
        return `
            ${addr.street} 
            ${addr.building_nr ? addr.building_nr : ''}${addr.apartment_nr ? '/' + addr.apartment_nr : ''}<br>
            ${addr.postal_code} ${addr.city}<br>
            ${addr.country}
        `;
    };
    
    detailContent.innerHTML = `
        <div class="detail-section">
            <h3>Order #${order.order_id} • ${order.name} ${order.surname} • ${order.status_name}</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <strong>Order Time:</strong> 
                    <span>${new Date(order.order_time).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <strong>Payment Time:</strong> 
                    <span>${order.payment_time ? new Date(order.payment_time).toLocaleString() : 'Pending'}</span>
                </div>
                <div class="detail-item">
                    <strong>Shipment Time:</strong> 
                    <span>${order.shipment_time ? new Date(order.shipment_time).toLocaleString() : 'Not shipped'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <strong>Phone:</strong> 
                    <span>${order.phone || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <strong>Email:</strong> 
                    <span>${order.email || 'N/A'}</span>
                </div>
            </div>
            <div class="address-grid">
                <div class="address-box">
                    <h4>Shipping Address</h4>
                    <div class="address-content">
                        ${formatAddress(order.shipping_address)}
                    </div>
                </div>
                <div class="address-box">
                    <h4>Billing Address</h4>
                    <div class="address-content">
                        ${sameAddress ? '<em>SAME AS SHIPPING</em>' : formatAddress(order.billing_address)}
                    </div>
                </div>
            </div>
        </div>
        
        ${itemsHTML}
    `;
}

function closeDetailPanel() {
    const detailPanel = document.getElementById('order-detail-panel');
    detailPanel.classList.remove('open');
}
