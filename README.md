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
