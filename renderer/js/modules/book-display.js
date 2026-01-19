// ============= BOOK DISPLAY (BESTSELLERS) =============

// Store books data and Fuse instance for search
let allBooks = [];
let bookFuse = null;
let currentBookApiUrl = null;
let selectedBookIsbn = null;

// Fetch and display bestsellers
async function fetchBestsellers(apiUrl) {
    currentBookApiUrl = apiUrl;
    try {
        const response = await fetch(`${apiUrl}/books/bestsellers`);
        if (!response.ok) throw new Error('Failed to fetch bestsellers');
        const books = await response.json();
        // Convert publication_year to string for Fuse.js search
        allBooks = books.map(book => ({
            ...book,
            publication_year_str: book.publication_year ? String(book.publication_year) : ''
        }));

        // Initialize Fuse.js for fuzzy search
        bookFuse = new Fuse(allBooks, {
            keys: [
                { name: 'isbn', weight: 0.5 },
                { name: 'title', weight: 0.3 },
                { name: 'publication_year_str', weight: 0.2 }
            ],
            threshold: 0.3,
            includeMatches: true,
            ignoreLocation: true
        });

        // Clear search input when switching to books view
        const searchInput = document.getElementById('book-search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        renderBooks(books, apiUrl);
    } catch (error) {
        console.error('Error fetching bestsellers:', error);
        document.getElementById('books-body').innerHTML =
            '<tr><td colspan="3">Error loading books</td></tr>';
    }
}

function renderBooks(books, apiUrl, searchResults = null) {
    const booksBody = document.getElementById('books-body');
    booksBody.innerHTML = '';

    if (books.length === 0) {
        booksBody.innerHTML = '<tr><td colspan="3" class="empty-state">No books found</td></tr>';
        return;
    }

    books.forEach((book, index) => {
        const row = document.createElement('tr');

        // Get match info if available (for highlighting)
        const matches = searchResults ? searchResults[index]?.matches : null;

        row.innerHTML = `
            <td>${highlightBookMatch(book.isbn, matches, ['isbn'])}</td>
            <td>${highlightBookMatch(book.title, matches, ['title'])}</td>
            <td>${book.publication_year ? highlightBookMatch(String(book.publication_year), matches, ['publication_year_str']) : "N/A"}</td>
            <td class="sold-copies">${book.sold_copies.toLocaleString()}</td>
        `;

        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            // Remove selected class from all rows
            booksBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            showBookDetail(book.isbn, apiUrl);
        });

        booksBody.appendChild(row);
    });
}

// Highlight matched text for books
function highlightBookMatch(text, matches, keys) {
    if (!matches || !text) return text;

    // Find matches for the specified keys
    const relevantMatches = matches.filter(m => keys.includes(m.key));
    if (relevantMatches.length === 0) return text;

    // Get all indices to highlight
    const indices = [];
    relevantMatches.forEach(match => {
        match.indices.forEach(([start, end]) => {
            indices.push([start, end]);
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

// Initialize book search
function initBookSearch() {
    const searchInput = document.getElementById('book-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (!query) {
            // Show all books when search is empty
            renderBooks(allBooks, currentBookApiUrl);
            return;
        }

        if (!bookFuse) return;

        // Check if query looks like an ISBN (digits and dashes, at least 5 chars to avoid matching years)
        const isIsbnQuery = /^[\d-]+$/.test(query) && query.replace(/-/g, '').length >= 5;

        if (isIsbnQuery) {
            // For ISBN queries, filter by exact prefix match first
            const normalizedQuery = query.replace(/-/g, '');
            const exactMatches = allBooks.filter(book =>
                book.isbn.replace(/-/g, '').startsWith(normalizedQuery)
            );

            if (exactMatches.length > 0) {
                renderBooks(exactMatches, currentBookApiUrl);
                return;
            }
        }

        // Fall back to fuzzy search
        const results = bookFuse.search(query);
        const filteredBooks = results.map(r => r.item);
        renderBooks(filteredBooks, currentBookApiUrl, results);
    });
}

// Show book detail panel
async function showBookDetail(isbn, apiUrl) {
    selectedBookIsbn = isbn;
    const panel = document.getElementById('book-detail-panel');
    const content = document.getElementById('book-detail-content');

    panel.classList.add('open');
    content.innerHTML = '<p>Loading book details...</p>';

    try {
        // Fetch book details, reviews, and price history in parallel
        const [bookRes, reviewsRes, pricesRes, authorsRes] = await Promise.all([
            fetch(`${apiUrl}/books/${isbn}`),
            fetch(`${apiUrl}/books/${isbn}/reviews`),
            fetch(`${apiUrl}/price/${isbn}`),
            fetch(`${apiUrl}/books/${isbn}/authors`)
        ]);

        const [bookData, reviews, prices, authors] = await Promise.all([
            bookRes.json(),
            reviewsRes.json(),
            pricesRes.json(),
            authorsRes.json()
        ]);

        const book = bookData[0] || {};
        renderBookDetail(isbn, book, reviews, prices, authors);
    } catch (error) {
        console.error('Error fetching book details:', error);
        content.innerHTML = '<p>Error loading book details</p>';
    }
}

function renderBookDetail(isbn, book, reviews, prices, authors) {
    const content = document.getElementById('book-detail-content');

    // Format authors
    const authorNames = authors.map(a => `${a.name} ${a.surname}`).join(', ') || 'Unknown';

    // Calculate average rating from reviews
    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)
        : 'N/A';

    // Current price
    const currentPrice = book.unit_price ? `${parseFloat(book.unit_price).toFixed(2)} zł` : 'N/A';

    content.innerHTML = `
        <div class="book-detail-section">
            <h3>${book.title || 'Unknown Title'}</h3>
            <div class="book-info">
                <p><strong>ISBN:</strong> ${isbn}</p>
                <p><strong>Authors:</strong> ${authorNames}</p>
                <p><strong>Publication Year:</strong> ${book.publication_year || 'N/A'}</p>
                <p><strong>Current Price:</strong> ${currentPrice}</p>
                <p><strong>Rating:</strong> ${avgRating}${avgRating !== 'N/A' ? ' / 5' : ''} (${reviews.length} reviews)</p>
                <p><strong>In Stock:</strong> ${book.quantity || 0}</p>
            </div>
        </div>

        <div class="book-detail-section">
            <h3>Price History</h3>
            <div id="price-chart-container">
                ${prices.length > 0 ? '' : '<p class="empty-state">No price history available</p>'}
            </div>
        </div>

        <div class="book-detail-section">
            <h3>Reviews (${reviews.length})</h3>
            <div class="reviews-list">
                ${reviews.length > 0 ? reviews.map(review => `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="review-rating">${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}</div>
                            <div class="review-author">${review.name} ${review.surname}</div>
                            <div class="review-date">${formatDate(review.review_date)}</div>
                        </div>
                        <div class="review-body">${escapeHtml(review.review_body || '')}</div>
                    </div>
                `).join('') : '<p class="empty-state">No reviews yet</p>'}
            </div>
        </div>
    `;

    // Render price chart if there are prices
    if (prices.length > 0) {
        renderPriceChart(prices);
    }

    // Add click handlers for review cards (CSP blocks inline onclick)
    content.querySelectorAll('.review-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('expanded');
        });
    });
}

function renderPriceChart(prices) {
    const container = document.getElementById('price-chart-container');
    if (!container || prices.length === 0) return;

    // Prepare data points
    const dataPoints = prices.map(p => ({
        date: new Date(p.valid_from),
        price: parseFloat(p.unit_price),
        validUntil: p.valid_until ? new Date(p.valid_until) : new Date()
    }));

    // Sort by date
    dataPoints.sort((a, b) => a.date - b.date);

    // Find min/max for scaling
    const priceValues = dataPoints.map(d => d.price);
    const minPrice = Math.min(...priceValues) * 0.9;
    const maxPrice = Math.max(...priceValues) * 1.1;
    const priceRange = maxPrice - minPrice || 1;

    const minDate = dataPoints[0].date;
    const maxDate = dataPoints[dataPoints.length - 1].validUntil;
    const dateRange = maxDate - minDate || 1;

    // SVG dimensions
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const scaleX = (date) => padding.left + ((date - minDate) / dateRange) * chartWidth;
    const scaleY = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    // Build step line path (price stays constant until next change)
    let pathD = '';
    dataPoints.forEach((point, i) => {
        const x = scaleX(point.date);
        const y = scaleY(point.price);

        if (i === 0) {
            pathD += `M ${x} ${y}`;
        } else {
            // Horizontal line to current date at previous price, then vertical
            pathD += ` L ${x} ${scaleY(dataPoints[i - 1].price)} L ${x} ${y}`;
        }

        // Extend to valid_until
        const endX = scaleX(point.validUntil);
        pathD += ` L ${endX} ${y}`;
    });

    // Y-axis labels
    const yTicks = 5;
    let yLabels = '';
    for (let i = 0; i <= yTicks; i++) {
        const price = minPrice + (priceRange * i / yTicks);
        const y = scaleY(price);
        yLabels += `<text x="${padding.left - 10}" y="${y}" text-anchor="end" dominant-baseline="middle" class="chart-label">${price.toFixed(0)}</text>`;
        yLabels += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid"/>`;
    }

    // X-axis labels (show first and last date)
    const formatChartDate = (d) => d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
    const xLabels = `
        <text x="${padding.left}" y="${height - 10}" text-anchor="start" class="chart-label">${formatChartDate(minDate)}</text>
        <text x="${width - padding.right}" y="${height - 10}" text-anchor="end" class="chart-label">${formatChartDate(maxDate)}</text>
    `;

    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" class="price-chart">
            <style>
                .chart-grid { stroke: var(--border-color); stroke-width: 0.5; opacity: 0.5; }
                .chart-label { font-size: 10px; fill: var(--text-color); opacity: 0.7; }
                .chart-line { stroke: var(--button-bg); stroke-width: 2; fill: none; }
                .chart-dot { fill: var(--button-bg); }
            </style>
            ${yLabels}
            ${xLabels}
            <path d="${pathD}" class="chart-line"/>
            ${dataPoints.map(p => `<circle cx="${scaleX(p.date)}" cy="${scaleY(p.price)}" r="4" class="chart-dot"><title>${p.price.toFixed(2)} zł - ${formatChartDate(p.date)}</title></circle>`).join('')}
        </svg>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeBookDetailPanel() {
    document.getElementById('book-detail-panel').classList.remove('open');
    selectedBookIsbn = null;
    // Remove selected class from all rows
    document.querySelectorAll('#books-body tr').forEach(r => r.classList.remove('selected'));
}
