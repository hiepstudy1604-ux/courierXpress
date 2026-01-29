# 📦 Courier Xpress Setup Guide

A detailed guide to unpack and run the Courier Xpress project on your machine.

## 🖥️ System Requirements

### Backend (Laravel)

- **PHP** >= 8.2
- **Composer** (PHP package manager)
- **MySQL** >= 5.7 or **MariaDB** >= 10.3
- **Node.js** >= 18.x and **NPM** (for frontend assets)

### Frontend (React/TypeScript)

- **Node.js** >= 18.x
- **NPM** >= 9.x or **Yarn** >= 1.22

### Other Tools

- **phpMyAdmin** (database management)

---

## 📂 Unpack the Project

### Step 1: Extract the ZIP file

1. Extract the `courier-xpress.zip` file to your desired directory (e.g., `C:\Projects\` or `~/Projects/`)
2. After extraction, you will have the following directory structure:

```
courier-xpress/
├── backend/          # Laravel Backend
├── frontend/         # React Frontend
├── SETUP_GUIDE.md    # Setup guide
└── ...
```

### Step 2: Verify the structure

Make sure you have the following directories:

- `backend/` - contains Laravel code
- `frontend/` - contains React code

---

## 🔧 Setup Backend (Laravel)

### Step 1: Install Dependencies

Open terminal/command prompt and navigate to the `backend` directory:

```bash
cd backend
composer install
```

**Note:** If you don't have Composer, download it at: https://getcomposer.org/

### Step 2: Configure Environment

1. **Copy `.env.example` to `.env`:**

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Windows (CMD)
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

2. **Generate Application Key:**

```bash
php artisan key:generate
```

3. **Generate JWT Secret:**

```bash
php artisan jwt:secret
```

### Step 3: Configure Database

1. **Create database in MySQL:**

Open MySQL (phpMyAdmin) and run:

```sql
CREATE DATABASE courier_xpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Update `.env` file in the `backend` directory:**

Open the `.env` file and update the database information:

```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=courier_xpress
DB_USERNAME=root
DB_PASSWORD=
DB_COLLATION=utf8mb4_unicode_ci
```

**Note:** Leave DB_PASSWORD empty if no password is set

### Step 4: Run Migrations and Seeders

1. **Run migrations to create tables:**

```bash
php artisan migrate
```

2. **Run seeders to create sample data:**

**Seed full data (recommended, ~2-5 minutes)**

```bash
php artisan db:seed --class=ComprehensiveDatabaseSeeder
```

The seeder will create:

- ✅ 2000+ shipments with various statuses
- ✅ Data spanning 90 days
- ✅ Payment intents, warehouse scans, transit manifests
- ✅ Admin tasks, notifications, bills
- ✅ Default accounts

### Step 5: Create Storage Link

```bash
php artisan storage:link
```

This command creates a symbolic link for file uploads.

### Step 6: Verify Backend

Run the Laravel server:

```bash
php artisan serve
```

The server will run at: **http://localhost:8000**

Open your browser and visit: `http://localhost:8000` - you should see the Laravel welcome page.

**✅ Backend is ready!**

---

## 🎨 Setup Frontend (React/TypeScript)

### Step 1: Install Dependencies

Open a new terminal/command prompt and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm install html2canvas
```

**Note:** If you don't have Node.js, download it at: https://nodejs.org/ (choose LTS version)

### Step 2: Configure API Endpoint

Check the `frontend/src/services/api.ts` or similar config file to ensure the API endpoint is pointing correctly:

```typescript
// Usually:
const API_BASE_URL = "http://localhost:8000/api";
```

If the backend runs on a different port, update it.

### Step 3: Verify Frontend

Run the development server:

```bash
npm run dev
```

The frontend will run at: **http://localhost:5173**

Open your browser and visit: `http://localhost:5173` - you should see the application interface.

**✅ Frontend is ready!**

---

### URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api

---

## 👤 Default Accounts

After running seeders, the following accounts will be created:

### Admin

- **Email:** `admin@courierxpress.com`
- **Password:** `admin123456`
- **Permissions:** Full access, manage the entire system

### Agent

- **Email:** `agent@courierxpress.com`
- **Password:** `agent123456`
- **Permissions:** Manage branch, view branch shipments
- **Branch ID:** Automatically assigned when running seeder (the first branch will be assigned)

### Customer

- **Email:** `customer@example.com`
- **Password:** `customer123`
- **Permissions:** Create and track their own shipments

---

## 🔍 Troubleshooting

### Error: "Composer not found"

**Solution:**

1. Download Composer at: https://getcomposer.org/
2. Install and ensure `composer` is in your PATH
3. Check: `composer --version`

### Error: "PHP version not supported"

**Solution:**

1. Check PHP version: `php -v`
2. Need PHP >= 8.2
3. Download new PHP at: https://www.php.net/downloads.php

### Error: "Database connection failed"

**Solution:**

1. Check if MySQL is running:

    ```bash
    # Windows
    net start MySQL80

    # Linux/Mac
    sudo systemctl start mysql
    ```

2. Verify database information in `.env`:
    - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

3. Test connection:
    ```bash
    php artisan tinker
    DB::connection()->getPdo();
    ```

### Error: "Migration failed"

**Solution:**

1. Delete and recreate the database:

    ```sql
    DROP DATABASE courier_xpress;
    CREATE DATABASE courier_xpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

2. Run migrations again:
    ```bash
    php artisan migrate:fresh
    ```

### Error: "Port 8000 already in use"

**Solution:**

1. Find the process using port 8000:

    ```bash
    # Windows
    netstat -ano | findstr :8000

    # Linux/Mac
    lsof -i :8000
    ```

2. Kill the process or run Laravel on a different port:

    ```bash
    php artisan serve --port=8001
    ```

3. Update frontend config to point to the new port.

### Error: "Port 5173 already in use"

**Solution:**

1. Find the process using port 5173
2. Kill the process or run Vite on a different port:
    ```bash
    npm run dev -- --port 5174
    ```

### Error: "JWT secret not found"

**Solution:**

```bash
php artisan jwt:secret
```

### Error: "Storage link failed"

**Solution:**

```bash
# Delete old link (if exists)
rm public/storage  # Linux/Mac
del public\storage  # Windows

# Create again
php artisan storage:link
```

### Error: "CORS error" when frontend calls API

**Solution:**

1. Check `backend/config/cors.php`
2. Ensure `allowed_origins` contains `http://localhost:5173`
3. Clear cache:
    ```bash
    php artisan config:clear
    php artisan cache:clear
    ```

### Error: "npm install failed"

**Solution:**

1. Delete `node_modules` and `package-lock.json`:

    ```bash
    rm -rf node_modules package-lock.json  # Linux/Mac
    rmdir /s node_modules package-lock.json  # Windows
    ```

2. Install again:

    ```bash
    npm install
    ```

3. If still fails, try:
    ```bash
    npm install --legacy-peer-deps
    ```

### Error: "Seeder failed"

**Solution:**

1. Check if the database has basic data (provinces, branches, vehicles)
2. Run seeders in order:

    ```bash
    php artisan migrate:fresh
    php artisan db:seed
    ```

3. If foreign key constraint error, ensure:
    ```bash
    php artisan migrate:fresh --seed
    ```

**Good luck with your setup! 🎉**
