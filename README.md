# HỆ THỐNG QUẢN LÝ AN TOÀN PHÒNG CHÁY CHỮA CHÁY (G1.8 PCCC)

> **Đơn vị đặt hàng đề tài:** GTEL OTS  
> **Kiến trúc:** Modular Monolith (Frontend React 18 + Vite, Backend NestJS + Prisma ORM + PostgreSQL 16 PostGIS)  
> **Repository:** [https://github.com/HuyDev19/G18-FireSafety-System.git](https://github.com/HuyDev19/G18-FireSafety-System.git)

---

## 1. Giới thiệu Đề tài

Hệ thống Quản lý An toàn Phòng cháy Chữa cháy (PCCC) G1.8 là nền tảng số hóa quản lý công tác an toàn PCCC toàn diện cho các cơ sở thuộc diện quản lý, bao gồm:
- **Bản đồ số PCCC GIS:** Trực quan hóa mức độ nguy hiểm cháy nổ theo phân vùng, Heatmap, Marker Clustering và bộ lọc thông minh.
- **Quản lý Hồ sơ & Cơ sở:** Quản lý cơ sở 7 tabs dữ liệu, hồ sơ điện tử pháp lý, danh mục thiết bị và hạn kiểm định.
- **Tính điểm nguy cơ rủi ro tự động (0–100đ):** Đánh giá nguy cơ cháy nổ định kỳ dựa trên loại hình, quy mô, vi phạm và sự cố.
- **Quy trình Kiểm tra & Biên bản điện tử:** Số hóa checklist kiểm tra hiện trường, tự động sinh vi phạm, duyệt biên bản và xuất PDF có mã QR xác thực.
- **Cổng Tra cứu Công khai:** Cho phép người dân tra cứu mức độ tuân thủ PCCC của các cơ sở mà không cần đăng nhập.

---

## 2. Bảng Phân công 5 Role Thành viên

Mỗi thành viên phụ trách độc quyền các thư mục module riêng nhằm chống xung đột (conflict) code:

| Role | Vai trò | Module phụ trách | Thư mục code độc quyền |
| :--- | :--- | :--- | :--- |
| **ROLE 1**<br>*(Leader)* | **Team Leader, GIS & Public Portal Architect** | FR-09, FR-16 (FE), Kiến trúc, SRS | `frontend-web/src/features/gis-map/`<br>`frontend-web/src/features/public-lookup/`<br>Quản lý Router, Types & Axios dùng chung |
| **ROLE 2** | **Frontend 1 (Core Management UI)** | FR-01, 02, 04, 05, 08, 13 (FE) | `frontend-web/src/layouts/`<br>`frontend-web/src/features/auth/`<br>`frontend-web/src/features/facilities/`<br>`frontend-web/src/features/equipments/`<br>`frontend-web/src/features/schedules/` |
| **ROLE 3** | **Backend 1 (Core DB, Auth, Risk & Audit)** | FR-01, 02, 03, 04, 12, 13 (BE) | `backend-api/prisma/schema.prisma`<br>`backend-api/src/common/`<br>`backend-api/src/modules/auth/`, `users/`, `facilities/`, `equipments/`, `audit/` |
| **ROLE 4** | **Backend 2 (Inspection, Files, Public & CI/CD)** | FR-05, 06, 07, 08, 14, 16 (BE) | `backend-api/docker-compose.yml`<br>`.github/workflows/`<br>`backend-api/src/modules/schedules/`, `inspections/`, `violations/`, `documents/`, `public/`, `jobs/` |
| **ROLE 5** | **Fullstack 2 (Inspection UI, Dashboard, Report & QA)** | FR-06, 07, 10, 11, 15 + Seed/QA | `backend-api/prisma/seed.ts`<br>`backend-api/src/modules/reports/`<br>`frontend-web/src/features/inspections/`<br>`frontend-web/src/features/dashboard/` |

---

## 3. Tài liệu Kỹ thuật Dự án (Thư mục `/docs`)

Nhóm phát triển tuân thủ tuyệt đối bộ 6 tài liệu chuẩn sau:

1. [docs/01_TongQuan_DeTai.md](docs/01_TongQuan_DeTai.md): Tổng quan bài toán, đối tượng sử dụng, danh sách 16 yêu cầu chức năng (FR-01 → FR-16).
2. [docs/02_KIEN_TRUC_VA_CONG_NGHE.md](docs/02_KIEN_TRUC_VA_CONG_NGHE.md): Sơ đồ kiến trúc 4 tầng, cấu trúc thư mục 5 Role, Docker Compose & hàm tính rủi ro 0-100đ.
3. [docs/03_CSDL_PRISMA_VA_TYPES.md](docs/03_CSDL_PRISMA_VA_TYPES.md): Thiết kế CSDL 14 bảng Prisma, Enum và TypeScript Interfaces dùng chung.
4. [docs/04_PHAN_CONG_TASK_VA_GITFLOW.md](docs/04_PHAN_CONG_TASK_VA_GITFLOW.md): Bảng phân công 5 Role, 18 Task Jira và quy trình Gitflow chuẩn.
5. [docs/05_HOP_DONG_API_VA_BAO_MAT.md](docs/05_HOP_DONG_API_VA_BAO_MAT.md): Chuẩn phản hồi API, RBAC Guard, Rate Limiting và xóa mềm.
6. [docs/06_SO_DO_HE_THONG.md](docs/06_SO_DO_HE_THONG.md): Sơ đồ quan hệ CSDL (ERD), Data Flow Diagrams (DFD) và Luồng nghiệp vụ PCCC.

---

## 4. Hướng dẫn Khởi chạy Dự án

### Yêu cầu cài đặt
- **Node.js:** phiên bản >= 18 (Khuyên dùng v20 hoặc v22)
- **Docker Desktop** (hoặc PostgreSQL 16 + PostGIS)

### Bước 1: Cài đặt biến môi trường
Tạo file `.env` ở thư mục gốc hoặc trong từng module từ các file mẫu:
- Backend: copy `backend-api/.env.example` -> `backend-api/.env`
- Frontend: copy `frontend-web/.env.example` -> `frontend-web/.env`

### Bước 2: Khởi chạy Hạ tầng Database & MinIO
```bash
cd backend-api
docker compose up -d
```

### Bước 3: Cài đặt và Chạy Frontend
```bash
cd frontend-web
npm install
npm run dev
```
Ứng dụng Web sẽ chạy tại: `http://localhost:5173`

---

## 5. Quy trình Gitflow Hàng ngày

Mọi thành viên phát triển tính năng phải tuân thủ nghiêm ngặt 5 bước:
```bash
# 1. Luôn cập nhật code mới nhất từ develop
git checkout develop && git pull origin develop

# 2. Tạo nhánh tính năng theo mã task Jira
git checkout -b feature/G18-xx-ten-tinh-nang

# 3. Code xong, kiểm tra build không có lỗi TypeScript
npm run build

# 4. Commit theo chuẩn Conventional Commits
git add .
git commit -m "feat(G18-xx): mo ta ngan gon noi dung da lam"

# 5. Kéo code develop và đẩy nhánh lên GitHub
git pull origin develop
git push -u origin feature/G18-xx-ten-tinh-nang
```
Sau đó tạo **Pull Request (PR)** vào nhánh `develop` để Leader review và merge.
