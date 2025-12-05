const API_URL = 'http://127.0.0.1:5000';

const themeToggle = document.getElementById('theme-toggle');
const addItemForm = document.getElementById('add-item-form');
const inventoryBody = document.getElementById('inventory-body');

// Theme handling
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
});

// Fetch and display items
async function fetchItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        if (!response.ok) throw new Error('Failed to fetch items');
        const items = await response.json();
        renderItems(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        // Retry logic could go here, as backend might be starting up
    }
}

function renderItems(items) {
    inventoryBody.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="deleteItem(${item.id})">Delete</button></td>
        `;
        inventoryBody.appendChild(row);
    });
}

// Add item
addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);

    try {
        const response = await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, quantity, price })
        });

        if (response.ok) {
            addItemForm.reset();
            fetchItems();
        }
    } catch (error) {
        console.error('Error adding item:', error);
    }
});

// Delete item (exposed to window for onclick handler)
window.deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`${API_URL}/items/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            fetchItems();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
};

// Initial load
// Poll until backend is ready
const checkBackend = setInterval(() => {
    fetch(`${API_URL}/items`)
        .then(res => {
            if (res.ok) {
                clearInterval(checkBackend);
                fetchItems();
            }
        })
        .catch(() => console.log('Waiting for backend...'));
}, 1000);
