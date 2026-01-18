// ============= BOOK DISPLAY (BESTSELLERS) =============

// Store books data and Fuse instance for search
let allBooks = [];
let bookFuse = null;
let currentBookApiUrl = null;

// Fetch and display bestsellers
async function fetchBestsellers(apiUrl) {
    currentBookApiUrl = apiUrl;
    try {
        const response = await fetch(`${apiUrl}/books/bestsellers`);
        if (!response.ok) throw new Error('Failed to fetch bestsellers');
        const books = await response.json();
        allBooks = books;

        // Initialize Fuse.js for fuzzy search
        bookFuse = new Fuse(books, {
            keys: [
                { name: 'isbn', weight: 0.5 },
                { name: 'title', weight: 0.3 },
                { name: 'publication_year', weight: 0.2 }
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
            <td>${book.publication_year ? highlightBookMatch(book.publication_year, matches, ['publication_year']) : "N/A"}</td>
            <td class="sold-copies">${book.sold_copies.toLocaleString()}</td>
        `;

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

        // Check if query looks like an ISBN (digits and dashes)
        const isIsbnQuery = /^[\d-]+$/.test(query);

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
