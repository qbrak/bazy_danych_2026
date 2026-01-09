const API_URL = 'http://127.0.0.1:5000';

const themeToggle = document.getElementById('theme-toggle');
const inventoryBody = document.getElementById('inventory-body');

// Create user card element
const userCard = document.createElement('div');
userCard.id = 'user-card';
userCard.style.display = 'none';
document.body.appendChild(userCard);

// Detect and set initial theme from OS/browser preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

// Theme handling
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
});

// Show user card on hover
async function showUserCard(userId, event) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const user = await response.json();
        console.log('Fetched user:', user);  // Debug: see user structure
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

// Fetch and display orders
async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`);
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
        inventoryBody.appendChild(row);
        
        // Add hover listeners to customer name
        const customerCell = row.querySelector('.customer-name');
        customerCell.addEventListener('mouseenter', (e) => showUserCard(order.user_id, e));
        customerCell.addEventListener('mouseleave', hideUserCard);
    });
}

// Initial load
// Poll until backend is ready
const checkBackend = setInterval(() => {
    fetch(`${API_URL}/orders`)
        .then(res => {
            if (res.ok) {
                clearInterval(checkBackend);
                fetchOrders();
            }
        })
        .catch(() => console.log('Waiting for backend...'));
}, 1000);
