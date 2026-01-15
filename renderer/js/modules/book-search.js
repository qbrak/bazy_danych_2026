// ============= BOOK SEARCH WITH FUZZY MATCHING =============

let booksCache = [];
let booksFuse = null;
let highlightedBookIndex = -1;

async function fetchBooksForSearch(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/books`);
        if (!response.ok) throw new Error('Failed to fetch books');
        const books = await response.json();
        
        // Transform books data for search
        // Each book has: isbn, title, publication_year, unit_price, authors: [{author_id, name, surname}]
        booksCache = books.map(book => {
            // Create searchable author string
            const authorString = book.authors
                .map(author => `${author.name} ${author.surname}`)
                .join(' ');
            
            // Create display author string
            const authorDisplay = book.authors
                .map(author => `${author.name} ${author.surname}`)
                .join(', ');
            
            return {
                isbn: book.isbn,
                title: book.title,
                publication_year: book.publication_year,
                authors: book.authors,
                authorString: authorString,
                authorDisplay: authorDisplay || 'Unknown Author',
                price: parseFloat(book.unit_price || 0)
            };
        });
        
        // Initialize Fuse.js for fuzzy search
        booksFuse = new Fuse(booksCache, {
            keys: [
                { name: 'title', weight: 0.57 },
                { name: 'authorString', weight: 0.38 },
                { name: 'isbn', weight: 0.05 }
            ],
            threshold: 0.4,
            includeMatches: true,
            minMatchCharLength: 2
        });
        
        console.log(`Loaded ${booksCache.length} books for search`);
    } catch (error) {
        console.error('Error fetching books:', error);
    }
}

function initBookSearch(inputElement, resultsElement, onBookSelected) {
    let selectedBookIsbn = null;
    
    inputElement.addEventListener('input', (e) => {
        // Don't allow search if input is disabled
        if (inputElement.disabled) {
            return;
        }
        
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length === 0) {
            resultsElement.style.display = 'none';
            highlightedBookIndex = -1;
            selectedBookIsbn = null;
            return;
        }
        
        if (searchTerm.length < 2) {
            resultsElement.innerHTML = '<div class="search-result-item">Type at least 2 characters...</div>';
            resultsElement.style.display = 'block';
            return;
        }
        
        // Search using Fuse.js
        const results = booksFuse.search(searchTerm);
        displayBookResults(results, resultsElement);
    });
    
    inputElement.addEventListener('keydown', (e) => {
        const resultItems = resultsElement.querySelectorAll('.search-result-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (resultItems.length > 0) {
                highlightedBookIndex = Math.min(highlightedBookIndex + 1, resultItems.length - 1);
                updateBookHighlight(resultsElement);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (resultItems.length > 0) {
                highlightedBookIndex = Math.max(highlightedBookIndex - 1, 0);
                updateBookHighlight(resultsElement);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedBookIndex >= 0 && resultItems.length > 0) {
                const selectedItem = resultItems[highlightedBookIndex];
                const isbn = selectedItem.dataset.isbn;
                const book = booksCache.find(b => b.isbn === isbn);
                if (book) {
                    selectBook(book, inputElement, resultsElement, onBookSelected);
                }
            }
        } else if (e.key === 'Escape') {
            resultsElement.style.display = 'none';
            highlightedBookIndex = -1;
        }
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!inputElement.contains(e.target) && !resultsElement.contains(e.target)) {
            resultsElement.style.display = 'none';
            highlightedBookIndex = -1;
        }
    });
}

function displayBookResults(results, resultsElement) {
    if (results.length === 0) {
        resultsElement.innerHTML = '<div class="search-result-item">No books found</div>';
        resultsElement.style.display = 'block';
        highlightedBookIndex = -1;
        adjustDropdownHeight(resultsElement);
        return;
    }
    
    // Limit to top 10 results
    const topResults = results.slice(0, 10);
    
    resultsElement.innerHTML = topResults.map((result, index) => {
        const book = result.item;
        const matches = result.matches || [];
        
        // Highlight matches in title and author
        let displayTitle = book.title;
        let displayAuthor = book.authorDisplay;
        
        matches.forEach(match => {
            if (match.key === 'title') {
                displayTitle = highlightBookMatches(book.title, match.indices);
            } else if (match.key === 'authorString') {
                displayAuthor = highlightBookMatches(book.authorDisplay, match.indices);
            }
        });
        
        return `
            <div class="search-result-item" data-isbn="${book.isbn}" data-index="${index}">
                <div class="search-result-main">
                    <strong>${displayTitle}</strong>
                    <span class="search-result-year">(${book.publication_year ? `${book.publication_year}` : 'N/A'})</span>
                </div>
                <div class="search-result-author">${displayAuthor}</div>
                <div class="search-result-price">${book.price.toFixed(2)} zł</div>
            </div>
        `;
    }).join('');
    
    resultsElement.style.display = 'block';
    adjustDropdownHeight(resultsElement);
    
    // Auto-highlight first result
    highlightedBookIndex = 0;
    updateBookHighlight(resultsElement);
    
    // Add click handlers
    const items = resultsElement.querySelectorAll('.search-result-item');
    const inputElement = resultsElement.parentElement.querySelector('input[type="text"]');
    const onBookSelected = inputElement?._onBookSelected;
    
    items.forEach(item => {
        item.addEventListener('click', () => {
            const isbn = item.dataset.isbn;
            const book = booksCache.find(b => b.isbn === isbn);
            if (book && inputElement && onBookSelected) {
                selectBook(book, inputElement, resultsElement, onBookSelected);
            }
        });
        
        item.addEventListener('mouseenter', () => {
            highlightedBookIndex = parseInt(item.dataset.index);
            updateBookHighlight(resultsElement);
        });
    });
}

function adjustDropdownHeight(dropdown) {
    const rect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.top;
    const maxHeight = Math.min(300, spaceBelow - 20);
    dropdown.style.maxHeight = `${maxHeight}px`;
}

function highlightBookMatches(text, indices) {
    if (!indices || indices.length === 0) return text;
    
    let result = '';
    let lastIndex = 0;
    
    indices.forEach(([start, end]) => {
        result += text.substring(lastIndex, start);
        result += '<mark>' + text.substring(start, end + 1) + '</mark>';
        lastIndex = end + 1;
    });
    
    result += text.substring(lastIndex);
    return result;
}

function updateBookHighlight(resultsElement) {
    const items = resultsElement.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
        if (index === highlightedBookIndex) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

function selectBook(book, inputElement, resultsElement, onBookSelected) {
    // console.log('=== selectBook called ===');
    // console.log('Book object:', book);
    // console.log('Book price:', book.price);
    // console.log('Book ISBN:', book.isbn);
    // console.log('onBookSelected callback exists:', !!onBookSelected);
    
    inputElement.value = book.publication_year ? `${book.title} (${book.publication_year})` : book.title;
    resultsElement.style.display = 'none';
    highlightedBookIndex = -1;
    
    if (onBookSelected) {
        // console.log('Calling onBookSelected callback...');
        onBookSelected(book);
    } else {
        console.log('WARNING: onBookSelected callback is missing!');
    }
}

// Export functions
window.fetchBooksForSearch = fetchBooksForSearch;
window.initBookSearch = initBookSearch;
