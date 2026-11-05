# HỆ THỐNG QUẢN LÝ AN TOÀN PHÒNG CHÁY CHỮA CHÁY (G1.8 PCCC)

> **Đơn vị đặt hàng đề tài:** GTel OTS (Hợp tác UTH – GTel OTS)  
> **Kiến trúc:** Modular Monolith (Frontend React 18 + Vite, Backend NestJS + Prisma ORM + Cloud PostgreSQL 16 PostGIS)  
> **Quy mô:** Cấp Tỉnh/Thành phố (Dữ liệu demo: 40 cơ sở tọa độ thật tại TP.HCM; thiết kế chịu tải $\ge 1.000$ cơ sở)  
> **Repository:** [https://github.com/HuyDev19/G18-FireSafety-System.git](https://github.com/HuyDev19/G18-FireSafety-System.git)

---

## 1. Giới thiệu Đề tài

Hệ thống Quản lý An toàn Phòng cháy Chữa cháy (PCCC) G1.8 là nền tảng số hóa quản lý công tác an toàn PCCC toàn diện cho các cơ sở thuộc diện quản lý, bao gồm chuỗi nghiệp vụ số hóa khép kín:
- **Bản đồ số PCCC GIS (FR-09):** Trực quan hóa mức độ nguy hiểm cháy nổ theo phân vùng, Marker Clustering gom cụm điểm, lớp Heatmap rủi ro và bộ lọc thông minh (MapLibre GL JS).
- **Quản lý Cơ sở & Thiết bị (FR-02, FR-04):** Quản lý chi tiết cơ sở 7 tabs dữ liệu, hồ sơ điện tử pháp lý, quản lý thiết bị PCCC và tự động đánh dấu cảnh báo sắp hết hạn ($\le 30$ ngày) / đã hết hạn kiểm định.
- **Đánh giá Nguy cơ Rủi ro Tự động (FR-03):** Tự động tính điểm nguy cơ cháy nổ (0–100 điểm) theo 4 nhóm tiêu chí (*Loại hình, Quy mô, Thiết bị, Lịch sử 12 tháng*) và phân 3 mức: **Thấp (`LOW` - Xanh)**, **Trung bình (`MEDIUM` - Vàng)**, **Cao (`HIGH` - Đỏ)**.
- **Kiểm tra Hiện trường & Biên bản Điện tử (FR-06, FR-15):** Checklist kiểm tra hiện trường tự lưu nháp `localStorage` chống mất dữ liệu, tự động sinh Vi phạm khi tiêu chí `FAIL`, phê duyệt biên bản và xuất PDF có mã QR xác thực.
- **Quản lý Vi phạm 2 Bước & Sự cố (FR-07):** Luồng xử lý vi phạm chuẩn BA: Chủ cơ sở nộp ảnh báo khắc phục (`report-fix`) $\rightarrow$ Cán bộ nghiệm thu (`verify-resolve`) và tự động hạ điểm rủi ro.
- **Dashboard & Báo cáo Thống kê (FR-10, FR-11):** Thẻ số liệu KPI, biểu đồ xu hướng ECharts và 7 báo cáo chuẩn xuất file Excel tiếng Việt có dấu (`.xlsx`).
- **Cổng Tra cứu Công khai (FR-16):** Cho phép người dân tra cứu mức độ đáp ứng PCCC của cơ sở tại `/tra-cuu` không cần đăng nhập, có Rate Limit và ẩn tuyệt đối dữ liệu nhạy cảm.

---

## 2. Công nghệ Sử dụng (Tech Stack)

* **Frontend Client:** React 18, Vite, TypeScript (Strict), Tailwind CSS, Shadcn/UI, Lucide-react, Zustand (Auth/Map state), TanStack React Query (Server state), Axios, MapLibre GL JS, Apache ECharts.
* **Backend API:** Node.js 20/22 LTS, NestJS, TypeScript, Prisma ORM, Passport JWT, bcrypt, class-validator, `@nestjs/swagger`, `@nestjs/schedule` (Cronjob 06:00).
* **Cơ sở Dữ liệu & Lưu trữ:**
  * **Database:** Cloud PostgreSQL 16 + PostGIS (kết nối trực tiếp Supabase / Neon dùng chung cho cả 5 roles).
  * **Object Storage:** MinIO / S3 Cloud Storage (bucket `pccc-files` lưu PDF hồ sơ và ảnh minh chứng $\le 10\text{MB}$).
* **CI/CD & Quản lý:** GitHub Actions (`.github/workflows/ci.yml`), Gitflow chuẩn Conventional Commits.

---

## 3. Bảng Phân công 5 Role & Thư mục Code Độc quyền (Anti-Conflict)

Mỗi thành viên phụ trách độc quyền các thư mục riêng nhằm triệt tiêu xung đột mã nguồn:

| Role | Vai trò | Module phụ trách | Thư mục Code Độc quyền |
| :--- | :--- | :--- | :--- |
| **ROLE 1**<br>*(Leader)* | **Team Leader, GIS & Public Portal Architect** | FR-09, FR-16 (FE), Kiến trúc, SRS | `frontend-web/src/features/gis-map/`<br>`frontend-web/src/features/public-lookup/`<br>Quản lý Router `App.tsx`, `stores/`, `services/`, `types/` |
| **ROLE 2** | **Frontend 1 (Core Management UI)** | FR-01, 02, 04, 05, 08, 13 (FE) | `frontend-web/src/layouts/`<br>`frontend-web/src/features/auth/`<br>`frontend-web/src/features/facilities/`<br>`frontend-web/src/features/equipments/`<br>`frontend-web/src/features/schedules/` |
| **ROLE 3** | **Backend 1 (Cloud DB, Auth, Risk & Audit)** | FR-01, 02, 03, 04, 12, 13 (BE) | `backend-api/prisma/schema.prisma`<br>`backend-api/src/common/`<br>`backend-api/src/modules/auth/`, `users/`, `facilities/`, `equipments/`, `audit/` |
| **ROLE 4** | **Backend 2 (Inspection, Files, Public & CI/CD)** | FR-05, 06, 07, 08, 14, 16 (BE) | `.github/workflows/ci.yml`<br>`backend-api/src/modules/schedules/`, `inspections/`, `violations/`, `documents/`, `public/`, `jobs/` |
| **ROLE 5** | **Fullstack 2 (Inspection UI, Dashboard, Report & QA)** | FR-06, 07, 10, 11, 15 + Seed/QA | `backend-api/prisma/seed.ts`<br>`backend-api/src/modules/reports/`<br>`frontend-web/src/features/inspections/`<br>`frontend-web/src/features/dashboard/` |

---

## 4. Bộ Tài liệu Kỹ thuật Dự án (Thư mục `/docs`)

1. [docs/01_TongQuan_DeTai.md](docs/01_TongQuan_DeTai.md): Tổng quan nghiệp vụ, 5 nhóm Actors, 16 Module (FR-01 $\rightarrow$ FR-16), công thức chấm điểm rủi ro 0–100đ.
2. [docs/02_KIEN_TRUC_VA_CONG_NGHE.md](docs/02_KIEN_TRUC_VA_CONG_NGHE.md): Sơ đồ kiến trúc 4 tầng, cấu trúc Monorepo, hướng dẫn kết nối Cloud DB và hàm `riskCalculator.ts`.
3. [docs/03_CSDL_PRISMA_VA_TYPES.md](docs/03_CSDL_PRISMA_VA_TYPES.md): Thiết kế CSDL 14 bảng Prisma, enum, quy tắc xóa mềm (`deletedAt`) và TypeScript interfaces.
4. [docs/04_PHAN_CONG_TASK_VA_GITFLOW.md](docs/04_PHAN_CONG_TASK_VA_GITFLOW.md): Bảng phân công 5 Role, danh mục 27 Task Jira, lộ trình 16 tuần và cơ chế báo cáo UTH.
5. [docs/05_HOP_DONG_API_VA_BAO_MAT.md](docs/05_HOP_DONG_API_VA_BAO_MAT.md): Hợp đồng RESTful API, ma trận RBAC, chống IDOR, bảo vệ dữ liệu công khai và kịch bản Demo 10 phút.
6. [docs/06_SO_DO_HE_THONG.md](docs/06_SO_DO_HE_THONG.md): Bộ 5 sơ đồ Mermaid (Kiến trúc 4 tầng, Use Case RBAC, Sequence Diagram kiểm tra hiện trường, Flowchart tính điểm rủi ro, ERD 14 bảng).

---

## 5. Hướng dẫn Cài đặt & Khởi chạy Nhanh

### 5.1. Yêu cầu Môi trường
- **Node.js:** Phiên bản LTS >= 18 (khuyên dùng v20 hoặc v22).
- **Cloud Database:** PostgreSQL 16 + PostGIS (Supabase hoặc Neon).
  * *Lưu ý:* Cần chạy câu lệnh `CREATE EXTENSION IF NOT EXISTS postgis;` trên SQL Editor của Cloud DB trước khi migrate.

### 5.2. Cấu hình Biến Môi trường
Tạo tệp `.env` cho Backend và Frontend:
- **Backend:** Sao chép `backend-api/.env.example` $\rightarrow$ `backend-api/.env` và điền `DATABASE_URL` Cloud PostgreSQL chung do Role 3 cung cấp:
  ```env
  DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
  JWT_SECRET="g18_pccc_jwt_secret_key_change_me_in_production"
  PORT=3000
  ```
- **Frontend:** Sao chép `frontend-web/.env.example` $\rightarrow$ `frontend-web/.env`:
  ```env
  VITE_API_BASE_URL="http://localhost:3000/api"
  ```

### 5.3. Khởi chạy Backend & Nạp Dữ liệu Mẫu (Cloud DB)
```bash
cd backend-api
npm install

# Sinh Prisma Client
npx prisma generate

# Đồng bộ 14 bảng lên Cloud DB
npx prisma db push

# Nạp 4 tài khoản vai trò & 40 cơ sở mẫu tọa độ thực tại TP.HCM
npm run seed
```

> **Tài khoản mặc định nạp sẵn từ script seed (Mật khẩu: `password123`):**
> * Admin: `admin@pccc.gov.vn` (Toàn quyền quản trị)
> * Lãnh đạo: `lanhdao@pccc.gov.vn` (Duyệt biên bản kiểm tra, phân công lịch, xem báo cáo)
> * Cán bộ: `canbo@pccc.gov.vn` (Kiểm tra checklist hiện trường Quận 1, Quận 3)
> * Chủ cơ sở: `chu_coso@pccc.gov.vn` (Xem hồ sơ cơ sở, gửi ảnh báo khắc phục vi phạm)

### 5.4. Khởi chạy Frontend Web Client
```bash
cd frontend-web
npm install
npm run dev
```
* **Frontend Web:** Mở trình duyệt tại [http://localhost:5173](http://localhost:5173)
* **Trang tra cứu công khai (không cần login):** [http://localhost:5173/tra-cuu](http://localhost:5173/tra-cuu)
* **Backend API Docs (Swagger UI):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 6. Quy trình Gitflow Hàng ngày

Mọi thành viên phát triển tính năng phải tuân thủ nghiêm ngặt 5 bước:

```bash
# 1. Luôn cập nhật code mới nhất từ develop
git checkout develop && git pull origin develop

# 2. Tạo nhánh tính năng theo mã task Jira
git checkout -b feature/G18-xx-ten-tinh-nang

# 3. Code xong trong thư mục độc quyền của Role mình, kiểm tra build không lỗi:
# Tại frontend-web: npm run build
# Tại backend-api: npm run build

# 4. Commit theo chuẩn Conventional Commits
git add .
git commit -m "feat(G18-xx): mo ta ngan gon noi dung da lam"

# 5. Kéo code develop và đẩy nhánh lên GitHub
git pull origin develop
git push -u origin feature/G18-xx-ten-tinh-nang
```
Sau đó tạo **Pull Request (PR)** vào nhánh `develop` để Team Leader review và merge.
