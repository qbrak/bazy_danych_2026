const API_URL = 'http://127.0.0.1:5000';

// ============= SNOW EFFECT =============
class SnowEffect {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.running = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.lastTime = 0;
    
    // Resize handler
    this.resizeObserver = new ResizeObserver(() => {
      this.canvas.width = window.innerWidth * window.devicePixelRatio;
      this.canvas.height = window.innerHeight * window.devicePixelRatio;
      if (this.running) this.render();
    });
    this.resizeObserver.observe(document.body);
    
    // Create 2000 snowflakes
    for (let i = 0; i < 2000; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: Math.random() - 0.5,
        vy: (1 + Math.random() * 10) / 10,
        freqx: 1 + Math.random() * 5,
        freqy: 1 + Math.random() * 5,
        size: 0.1 + Math.random() * 1.4,
        phasex: Math.random() * 2 * Math.PI,
        phasey: Math.random() * 2 * Math.PI
      });
    }
  }
  
  start() {
    this.targetOpacity = 1;
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.animate();
    }
  }
  
  stop() {
    this.targetOpacity = 0;
  }
  
  toggle() {
    if (this.targetOpacity === 0) {
      this.start();
    } else {
      this.stop();
    }
  }
  
  destroy() {
    this.resizeObserver.disconnect();
    this.running = false;
  }
  
  animate() {
    requestAnimationFrame(() => {
      this.render();
      if (this.running) this.animate();
    });
  }
  
  render() {
    const shouldRender = Math.abs(this.opacity) > 1e-6 || this.targetOpacity !== 0;
    if (!shouldRender) return;
    
    this.opacity += (this.targetOpacity - this.opacity) * 0.05;
    
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 16;
    
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = 'white';
    
    for (const p of this.particles) {
      const x = p.x * width;
      const y = p.y * height;
      const vx = 2 * p.vx / p.size / width;
      const vy = 2 * p.vy / p.size / height;
      
      const drawX = x + (width / 200) * Math.sin(p.freqx * now * vy + p.phasex);
      const drawY = y + (height / 200) * Math.sin(p.freqy * now * vx + p.phasey);
      
      ctx.beginPath();
      ctx.arc(drawX, drawY, p.size * window.devicePixelRatio, 0, 2 * Math.PI);
      ctx.fill();
      
      p.x += vx * deltaTime;
      p.y += vy * deltaTime;
      
      p.x = p.x % 1;
      p.y = p.y % 1;
      if (p.x < 0) p.x += 1;
      if (p.y < 0) p.y += 1;
    }
    
    this.lastTime = now;
  }
}

// Initialize snow effect
const snowCanvas = document.getElementById('snow-canvas');
const snow = new SnowEffect(snowCanvas);

document.getElementById('snow-btn').addEventListener('click', () => {
  snow.toggle();
});

// ============= THEME & NAVIGATION =============

const themeMenuItem = document.getElementById('theme-menu-item');
const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');
const inventoryBody = document.getElementById('inventory-body');

// Create user card element
const userCard = document.createElement('div');
userCard.id = 'user-card';
userCard.style.display = 'none';
document.body.appendChild(userCard);

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

// New Order button handling
document.getElementById('new-order-btn').addEventListener('click', () => {
    switchView('new-order');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
});

// Menu toggle handling
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('open');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove('open');
    }
});

// Navigation handling - exclude theme menu item
document.querySelectorAll('.nav-item:not(.disabled):not(#theme-menu-item)').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.target.dataset.view;
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');
        
        // Close menu
        navMenu.classList.remove('open');
        
        // Handle view switching
        switchView(view);
    });
});

function switchView(view) {
    // Hide all sections
    document.getElementById('inventory-list-section').classList.add('hidden');
    document.getElementById('order-detail-panel').classList.remove('open');
    document.getElementById('new-order-section').classList.add('hidden');
    
    // Update header title
    const headerTitle = document.querySelector('header h1');
    
    // Show selected view
    if (view === 'orders') {
        document.getElementById('inventory-list-section').classList.remove('hidden');
        headerTitle.textContent = 'Orders';
        fetchOrders();
    } else if (view === 'new-order') {
        document.getElementById('new-order-section').classList.remove('hidden');
        headerTitle.textContent = 'New Order';
        initNewOrderForm();
    }
}

// =============================================================================
// USER CARD
// =============================================================================

// Show user card on hover
async function showUserCard(userId, event) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const user = await response.json();
        // console.log('Fetched user:', user);  // Debug: see user structure
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
async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}/user_order_summary`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        renderOrders(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

function renderOrders(orders) {
    inventoryBody.innerHTML = '';
    orders.forEach(order => {
        // console.log('Order object:', order);  // Debug: see order structure
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
        row.addEventListener('click', () => openOrderDetail(order.order_id));
        row.style.cursor = 'pointer';
        
        inventoryBody.appendChild(row);
        
        // Add hover listeners to customer name
        const customerCell = row.querySelector('.customer-name');
        customerCell.addEventListener('mouseenter', (e) => showUserCard(order.user_id, e));
        customerCell.addEventListener('mouseleave', hideUserCard);
    });
}

// Order detail panel functions
async function openOrderDetail(orderId) {
    const detailPanel = document.getElementById('order-detail-panel');
    detailPanel.classList.add('open');
    
    const detailContent = document.getElementById('detail-content');
    detailContent.innerHTML = '<p>Loading order details...</p>';
    
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`);
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
    console.log('Order detail object:', order);  // Debug: see order detail structure
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

// =============================================================================
// NEW ORDER FORM
// =============================================================================

let itemCounter = 0;
let availableBooks = [];
let customers = [];

async function initNewOrderForm() {
    // Reset form
    itemCounter = 0;
    document.getElementById('order-items-container').innerHTML = '';
    document.getElementById('new-order-form').reset();
    
    // Fetch customers and books
    await Promise.all([fetchCustomers(), fetchBooks()]);
    
    // Add initial empty row
    addOrderItemRow();
}

async function fetchCustomers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch customers');
        customers = await response.json();
        
        const customerSelect = document.getElementById('customer-select');
        customerSelect.innerHTML = '<option value="">Select a customer...</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.user_id;
            option.textContent = `${customer.name} ${customer.surname} (${customer.email})`;
            customerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
    }
}

async function fetchBooks() {
    try {
        // Fetch inventory which has current prices
        const response = await fetch(`${API_URL}/inventory`);
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

// Load customer addresses when customer is selected
document.getElementById('customer-select').addEventListener('change', async (e) => {
    const userId = e.target.value;
    if (!userId) {
        document.getElementById('shipping-address-select').innerHTML = '<option value="">Select shipping address...</option>';
        document.getElementById('billing-address-select').innerHTML = '<option value="">Select billing address...</option>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users/${userId}/addresses`);
        if (!response.ok) throw new Error('Failed to fetch addresses');
        const addresses = await response.json();
        
        const shippingSelect = document.getElementById('shipping-address-select');
        const billingSelect = document.getElementById('billing-address-select');
        
        shippingSelect.innerHTML = '<option value="">Select shipping address...</option>';
        billingSelect.innerHTML = '<option value="">Select billing address...</option>';
        
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
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
    }
});

// Same as shipping checkbox
document.getElementById('same-as-shipping').addEventListener('change', (e) => {
    const billingSelect = document.getElementById('billing-address-select');
    if (e.target.checked) {
        billingSelect.value = document.getElementById('shipping-address-select').value;
        billingSelect.disabled = true;
    } else {
        billingSelect.disabled = false;
    }
});

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

// Add item button - removed, now auto-adds
// document.getElementById('add-item-btn').addEventListener('click', addOrderItem);

// Cancel button
document.getElementById('cancel-order-btn').addEventListener('click', () => {
    switchView('orders');
    document.querySelector('.nav-item[data-view="orders"]').classList.add('active');
    document.querySelector('.nav-item[data-view="new-order"]').classList.remove('active');
});

// Form submission
document.getElementById('new-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerId = document.getElementById('customer-select').value;
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
        const response = await fetch(`${API_URL}/orders`, {
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

// =============================================================================
// INITIALIZATION
// =============================================================================

// Close detail panel button
document.getElementById('close-detail').addEventListener('click', closeDetailPanel);

// Initial load
// Poll until backend is ready
const checkBackend = setInterval(() => {
    fetch(`${API_URL}/user_order_summary`)
        .then(res => {
            if (res.ok) {
                clearInterval(checkBackend);
                fetchOrders();
            }
        })
        .catch(() => console.log('Waiting for backend...'));
}, 1000);
