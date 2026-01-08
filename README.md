# Inventory App (Electron + Python + PostgreSQL)

This is a simple inventory management application using Electron for the frontend and Python (Flask + PostgreSQL) for the backend.

## Prerequisites

- Node.js and npm
- Python 3
- Docker and Docker Compose (optional, for running PostgreSQL)
- PostgreSQL (if not using Docker)

## Setup

1.  **Install Node.js dependencies:**

    ```bash
    npm install
    ```

2.  **Install Python dependencies:**

    It is recommended to use a virtual environment.

    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate or venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    cd ..
    ```

3.  **Database Setup:**

    You have two options for the database:

    **Option A: Use Docker (Recommended)**

    This will spin up a PostgreSQL container with the default credentials.

    ```bash
    docker-compose up -d
    ```

    **Option B: Use your own PostgreSQL**

    If you have a local PostgreSQL instance, create a database and user.
    Then, create a `.env` file in the root directory (you can copy `.env.example`) and update the credentials:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` with your details:
    ```
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=inventory_db
    DB_USER=inventory_user
    DB_PASSWORD=secure_password
    ```

    Note that the default `DB_PORT` for `.env` and `.env.example` is set to 5433 instead of 5432 to not conflict with local servers that could be running.

4.  **Initialize Database Schema and Example Data:**

    After the database is running, load the schema and example data using the database loader:

    ```bash
    cd db
    python db_loader.py
    cd ..
    ```

    This will:
    - Create all tables (users, addresses, books, orders, etc.)
    - Load example data (authors, books, users)
    - Set up triggers and constraints

    You can also use the loader programmatically in Python:

    ```python
    from db.db_loader import setup_database, get_db_connection

    # Full setup with a new connection
    setup_database()

    # Or with an existing connection
    conn = get_db_connection()
    setup_database(conn, close_conn=False)
    ```

## Running the App

To start the application (both Electron and the Python backend):

```bash
npm start
```

The Python backend will be automatically spawned by the Electron app. It will attempt to connect to the database defined in your `.env` file (or default to the Docker settings).

## Features

-   **List Inventory**: View all items in the store.
-   **Add Item**: Add new items with name, quantity, and price.
-   **Delete Item**: Remove items from the inventory.
-   **Dark/Light Mode**: Toggle between themes.
-   **Data Persistence**: Data is saved in a PostgreSQL database.

## Running Tests Locally

1.  **Start a test database:**

    You need a PostgreSQL instance running. The easiest way is to use Docker:

    ```bash
    docker run -d --name test-postgres \
      -e POSTGRES_USER=testuser \
      -e POSTGRES_PASSWORD=testpass \
      -e POSTGRES_DB=testdb \
      -p 5433:5432 \
      postgres:16
    ```

    NOTE: using 5433 locally, to not conflict with other local databases
    already running.

2.  **Run the tests:**

    ```bash
    # Run all Python tests
    pytest backend/tests/ -v

    # Run only database tests
    pytest backend/tests/test_database.py -v

    # Run a specific test
    pytest backend/tests/test_database.py::TestOrderAddressValidation -v
    ```

3.  **Cleanup (optional):**

    ```bash
    docker stop test-postgres && docker rm test-postgres
    ```

### What the Tests Cover

- **Database Connection**: Basic connectivity and query execution
- **Schema Validation**: Verifies tables and example data are loaded correctly
- **Order Address Validation**: Tests the trigger that prevents orders with addresses belonging to different users
- **Database Constraints**: Tests for unique emails, ISBN length, review stars range
