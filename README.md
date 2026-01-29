# 📦 Hướng Dẫn Setup Project Courier Xpress

Hướng dẫn chi tiết để giải nén và chạy project Courier Xpress trên máy mới.


## 🖥️ Yêu Cầu Hệ Thống

### Backend (Laravel)
- **PHP** >= 8.2
- **Composer** (PHP package manager)
- **MySQL** >= 5.7 hoặc **MariaDB** >= 10.3
- **Node.js** >= 18.x và **NPM** (cho frontend assets)

### Frontend (React/TypeScript)
- **Node.js** >= 18.x
- **NPM** >= 9.x hoặc **Yarn** >= 1.22

### Công Cụ Khác
- **phpMyAdmin** (quản lý database)

---

## 📂 Giải Nén Project

### Bước 1: Giải nén file ZIP

1. Giải nén file `courier-xpress.zip` vào thư mục bạn muốn (ví dụ: `C:\Projects\` hoặc `~/Projects/`)
2. Sau khi giải nén, bạn sẽ có cấu trúc thư mục như sau:

```
courier-xpress/
├── backend/          # Laravel Backend
├── frontend/         # React Frontend
├── SETUP_GUIDE.md    # File này
└── ...
```

### Bước 2: Kiểm tra cấu trúc

Đảm bảo bạn có đầy đủ các thư mục:
- `backend/` - chứa code Laravel
- `frontend/` - chứa code React

---

## 🔧 Setup Backend (Laravel)

### Bước 1: Cài đặt Dependencies

Mở terminal/command prompt và di chuyển vào thư mục `backend`:

```bash
cd backend
composer install
```

**Lưu ý:** Nếu chưa có Composer, tải tại: https://getcomposer.org/

### Bước 2: Cấu hình Environment

1. **Copy file `.env.example` thành `.env`:**

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Windows (CMD)
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

2. **Tạo Application Key:**

```bash
php artisan key:generate
```

3. **Tạo JWT Secret:**

```bash
php artisan jwt:secret
```

### Bước 3: Cấu hình Database

1. **Tạo database trong MySQL:**

Mở MySQL (phpMyAdmin) và chạy:

```sql
CREATE DATABASE courier_xpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Cập nhật file `.env` trong thư mục `backend`:**

Mở file `.env` và cập nhật thông tin database:

```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=courier_xpress
DB_USERNAME=root
DB_PASSWORD=
DB_COLLATION=utf8mb4_unicode_ci
```

**Lưu ý:** DB_PASSWORD để trống không điền mật khẩu

### Bước 4: Chạy Migrations và Seeders

1. **Chạy migrations để tạo bảng:**

```bash
php artisan migrate
```

2. **Chạy seeders để tạo dữ liệu mẫu:**

**Seed dữ liệu đầy đủ (khuyến nghị, ~2-5 phút)**
```bash
php artisan db:seed --class=ComprehensiveDatabaseSeeder
```

Seeder sẽ tạo:
- ✅ 2000+ shipments với đa dạng trạng thái
- ✅ Dữ liệu trải dài 90 ngày
- ✅ Payment intents, warehouse scans, transit manifests
- ✅ Admin tasks, notifications, bills
- ✅ Tài khoản mặc định

### Bước 5: Tạo Storage Link

```bash
php artisan storage:link
```

Lệnh này tạo symbolic link để lưu trữ file uploads.

### Bước 6: Kiểm tra Backend

Chạy server Laravel:

```bash
php artisan serve
```

Server sẽ chạy tại: **http://localhost:8000**

Mở trình duyệt và truy cập: `http://localhost:8000` - bạn sẽ thấy trang welcome của Laravel.

**✅ Backend đã sẵn sàng!**

---

## 🎨 Setup Frontend (React/TypeScript)

### Bước 1: Cài đặt Dependencies

Mở terminal/command prompt mới và di chuyển vào thư mục `frontend`:

```bash
cd frontend
npm install
npm install html2canvas 
```

**Lưu ý:** Nếu chưa có Node.js, tải tại: https://nodejs.org/ (chọn LTS version)

### Bước 2: Cấu hình API Endpoint

Kiểm tra file `frontend/src/services/api.ts` hoặc file config tương tự để đảm bảo API endpoint trỏ đúng:

```typescript
// Thường là:
const API_BASE_URL = 'http://localhost:8000/api';
```

Nếu backend chạy trên port khác, cập nhật lại.

### Bước 3: Kiểm tra Frontend

Chạy development server:

```bash
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

Mở trình duyệt và truy cập: `http://localhost:5173` - bạn sẽ thấy giao diện ứng dụng.

**✅ Frontend đã sẵn sàng!**

---

### URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api

---

## 👤 Tài Khoản Mặc Định

Sau khi chạy seeders, các tài khoản sau sẽ được tạo:

### Admin
- **Email:** `admin@courierxpress.com`
- **Password:** `admin123456`
- **Quyền:** Full access, quản lý toàn bộ hệ thống

### Agent
- **Email:** `agent@courierxpress.com`
- **Password:** `agent123456`
- **Quyền:** Quản lý branch, xem shipments của branch
- **Branch ID:** Được gán tự động khi chạy seeder (`DatabaseSeeder` sẽ lấy `Branch::first()` và set vào `users.branch_id`).

### Customer
- **Email:** `customer@example.com`
- **Password:** `customer123`
- **Quyền:** Tạo và theo dõi shipments của mình

---

## 🔍 Troubleshooting

### Lỗi: "Composer not found"

**Giải pháp:**
1. Tải Composer tại: https://getcomposer.org/
2. Cài đặt và đảm bảo `composer` có trong PATH
3. Kiểm tra: `composer --version`

### Lỗi: "PHP version not supported"

**Giải pháp:**
1. Kiểm tra PHP version: `php -v`
2. Cần PHP >= 8.2
3. Tải PHP mới tại: https://www.php.net/downloads.php

### Lỗi: "Database connection failed"

**Giải pháp:**
1. Kiểm tra MySQL đang chạy:
   ```bash
   # Windows
   net start MySQL80
   
   # Linux/Mac
   sudo systemctl start mysql
   ```

2. Kiểm tra thông tin database trong `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

3. Test kết nối:
   ```bash
   php artisan tinker
   DB::connection()->getPdo();
   ```

### Lỗi: "Migration failed"

**Giải pháp:**
1. Xóa database và tạo lại:
   ```sql
   DROP DATABASE courier_xpress;
   CREATE DATABASE courier_xpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Chạy lại migrations:
   ```bash
   php artisan migrate:fresh
   ```

### Lỗi: "Port 8000 already in use"

**Giải pháp:**
1. Tìm process đang dùng port 8000:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```

2. Kill process hoặc chạy Laravel trên port khác:
   ```bash
   php artisan serve --port=8001
   ```

3. Cập nhật frontend config để trỏ đến port mới.

### Lỗi: "Port 5173 already in use"

**Giải pháp:**
1. Tìm process đang dùng port 5173
2. Kill process hoặc chạy Vite trên port khác:
   ```bash
   npm run dev -- --port 5174
   ```

### Lỗi: "JWT secret not found"

**Giải pháp:**
```bash
php artisan jwt:secret
```

### Lỗi: "Storage link failed"

**Giải pháp:**
```bash
# Xóa link cũ (nếu có)
rm public/storage  # Linux/Mac
del public\storage  # Windows

# Tạo lại
php artisan storage:link
```

### Lỗi: "CORS error" khi frontend gọi API

**Giải pháp:**
1. Kiểm tra file `backend/config/cors.php`
2. Đảm bảo `allowed_origins` có chứa `http://localhost:5173`
3. Clear cache:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

### Lỗi: "npm install failed"

**Giải pháp:**
1. Xóa `node_modules` và `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json  # Linux/Mac
   rmdir /s node_modules package-lock.json  # Windows
   ```

2. Cài lại:
   ```bash
   npm install
   ```

3. Nếu vẫn lỗi, thử:
   ```bash
   npm install --legacy-peer-deps
   ```

### Lỗi: "Seeder failed"

**Giải pháp:**
1. Kiểm tra database đã có dữ liệu cơ bản chưa (provinces, branches, vehicles)
2. Chạy seeders theo thứ tự:
   ```bash
   php artisan migrate:fresh
   php artisan db:seed
   ```

3. Nếu lỗi foreign key constraint, đảm bảo chạy:
   ```bash
   php artisan migrate:fresh --seed
   ```



**Chúc bạn setup thành công! 🎉**
