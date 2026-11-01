# 04. PHÂN CÔNG 5 THÀNH VIÊN, QUẢN TRỊ TASK JIRA & QUY TRÌNH GITFLOW

## 1. Bảng Phân công 5 Role (100% Thành viên Đều Code & Có Module Bảo Vệ Riêng)

| Mã Role | Vai trò | Module phụ trách (FR) | Thư mục Code Độc quyền (Chống Conflict) | Công việc & Sản phẩm Bàn giao |
| :--- | :--- | :--- | :--- | :--- |
| **ROLE 1**<br>*(Leader)* | **Team Leader, GIS & Public Portal Architect** | FR-09, FR-16 (FE), Kiến trúc, SRS | - Khung gốc `frontend-web/`, `App.tsx`, `stores/`, `services/`, `types/`, `utils/`<br>- `src/features/gis-map/`<br>- `src/features/public-lookup/` | 1. Dựng khung repo, Router, Axios, Types chống Conflict.<br>2. Code **Bản đồ số PCCC (FR-09)** (Marker màu mức nguy hiểm, Clustering, Heatmap, Chọn tọa độ).<br>3. Code **Cổng Tra cứu Công khai (`/tra-cuu` - FR-16)**.<br>4. Quản lý Jira, viết SRS & Review Pull Request. |
| **ROLE 2** | **Frontend 1 (Core Management UI)** | FR-01, 02, 04, 05, 08, 13 (FE) | - `frontend-web/src/layouts/`<br>- `src/features/auth/`<br>- `src/features/facilities/`<br>- `src/features/equipments/`<br>- `src/features/schedules/` | 1. Giao diện Login, Guard ẩn/hiện menu & Quản trị User (FR-01).<br>2. Bảng danh sách, Import Excel & **Chi tiết cơ sở 7 Tabs** (FR-02, 08, 13).<br>3. Giao diện Quản lý Thiết bị PCCC (FR-04) & Lịch kiểm tra bảng/tháng (FR-05). |
| **ROLE 3** | **Backend 1 (Core DB, Auth, Risk & Audit)** | FR-01, 02, 03, 04, 12, 13 (BE) | - `backend-api/prisma/schema.prisma`<br>- `src/main.ts`, `src/common/`<br>- `src/modules/auth/`, `users/`, `facilities/`, `equipments/`, `audit/` | 1. Thiết kế ERD, quản lý Migration 14 bảng Prisma.<br>2. Xây dựng Auth JWT + Refresh Token + RBAC Guard (FR-01) & Audit Log (FR-12).<br>3. API Cơ sở, Import Excel, Thiết bị & **Hàm tính điểm rủi ro 0-100đ có Unit Test (FR-03)**. |
| **ROLE 4** | **Backend 2 (Inspection, Files, Public & CI/CD)** | FR-05, 06, 07, 08, 14, 16 (BE) | - `backend-api/docker-compose.yml`, `.github/workflows/`<br>- `src/modules/schedules/`, `inspections/`, `violations/`, `documents/`, `public/`, `src/jobs/` | 1. Thiết lập Docker Compose (PostgreSQL/PostGIS + MinIO) & GitHub Actions CI/CD.<br>2. API Lịch kiểm tra (FR-05), Checklist kiểm tra tự sinh Vi phạm & Lãnh đạo duyệt (FR-06, 07).<br>3. Upload Hồ sơ MinIO (FR-08), Cronjob cảnh báo 06:00 sáng (FR-14) & API Công khai (FR-16). |
| **ROLE 5** | **Fullstack 2 (Inspection UI, Dashboard, Report & QA)** | FR-06, 07, 10, 11, 15 + Seed/QA | - **BE:** `prisma/seed.ts`, `src/modules/reports/`<br>- **FE:** `src/features/inspections/`, `src/features/dashboard/` | 1. Viết `seed.ts` nạp danh mục, checklist & 40 cơ sở tọa độ thật.<br>2. Giao diện đánh giá Checklist (Mobile/PC), duyệt biên bản, Timeline Vi phạm/Sự cố & **In PDF có QR (FR-06, 07, 15)**.<br>3. API & UI **Dashboard ECharts + 7 Báo cáo xuất Excel/PDF (FR-10, 11)**; Kiểm thử QA. |

---

## 2. Ranh giới Chủ sở hữu File Dùng Chung (Shared File Owners)

| Đường dẫn File Dùng Chung | Owner Duy Nhất | Quy tắc Phối hợp Bắt buộc |
| :--- | :---: | :--- |
| `frontend-web/src/App.tsx` | **Role 1 (Leader)** | Đã khai báo sẵn toàn bộ Route. Role 2/Role 5 không tự sửa, nếu cần thêm route mới phải nhắn Role 1. |
| `frontend-web/src/services/apiClient.ts` | **Role 1 (Leader)** | Mọi service ở Frontend bắt buộc import `apiClient` này để gọi API. |
| `frontend-web/src/types/pccc.types.ts` | **Role 1 điều phối** | Thay đổi kiểu dữ liệu phải thống nhất với cả nhóm và cập nhật tài liệu. |
| `backend-api/prisma/schema.prisma` | **Role 3 (BE Lead)** | Role 4 và Role 5 chỉ đọc, tuyệt đối không tự chạy migration sửa bảng khi chưa qua Role 3. |
| `backend-api/docker-compose.yml` | **Role 4 (BE 2)** | Thay đổi cổng hoặc cấu hình container phải thông báo cho toàn nhóm. |

---

## 3. Danh sách 18 Task Khởi động Trên Jira (Bám sát FR-01 -> FR-16)

| Mã Jira | Giao cho | Tiêu đề Task & Tiêu chí hoàn thành (Acceptance Criteria) |
| :--- | :---: | :--- |
| **`G18-01`** | **Role 1** | **[LEAD-INFRA] Khởi tạo Repo, Khung Frontend & Cấu trúc Chống Conflict** (`App.tsx`, `apiClient.ts`, `pccc.types.ts`). |
| **`G18-02`** | **Role 4** | **[DEVOPS-DOCKER] Thiết lập Docker Compose (PostgreSQL/PostGIS + MinIO) & GitHub Actions CI (`ci.yml`)**. |
| **`G18-03`** | **Role 3** | **[BE-DB] Thiết kế ERD & Khởi tạo 14 Bảng Database bằng Prisma Migration**. |
| **`G18-04`** | **Role 5** | **[DATA-SEED] Xây dựng Script Seeding Idempotent (`seed.ts`) nạp Danh mục, Checklist & 40 Cơ sở Mẫu**. |
| **`G18-05`** | **Role 3** | **[BE-AUTH] Xây dựng Module Xác thực JWT, Khóa tạm 15p, RBAC 4 Vai trò & Audit Log (FR-01, FR-12)**. |
| **`G18-06`** | **Role 2** | **[FE-AUTH] Xây dựng Giao diện Đăng nhập, Route Guard & Quản trị Người dùng (FR-01)**. |
| **`G18-07`** | **Role 3** | **[BE-FACILITY] Xây dựng API Quản lý Cơ sở & Engine Tính Điểm Nguy Hiểm 0-100đ có Unit Test (FR-02, FR-03)**. |
| **`G18-08`** | **Role 2** | **[FE-FACILITY] Xây dựng Bảng Cơ sở, Chi tiết Cơ sở 7 Tabs & Luồng Nhập Excel (FR-02, FR-13)**. |
| **`G18-09`** | **Role 3 & 2** | **[FULL-EQUIP] Xây dựng API & Giao diện Quản lý Thiết bị PCCC, Cảnh báo Hết hạn <= 30 ngày (FR-04)**. |
| **`G18-10`** | **Role 4 & 2** | **[FULL-SCHED] Xây dựng API & Giao diện Lịch Kiểm tra Định kỳ/Đột xuất/Tái kiểm tra (FR-05)**. |
| **`G18-11`** | **Role 4** | **[BE-INSPECT] Xây dựng API Thực hiện Kiểm tra Checklist, Tự sinh Vi phạm, Tính lại Rủi ro & Duyệt (FR-06, FR-07)**. |
| **`G18-12`** | **Role 5** | **[FE-INSPECT] Xây dựng Giao diện Đánh giá Checklist (Mobile/PC), Timeline Vi phạm/Sự cố & In PDF có QR (FR-06, 07, 15)**. |
| **`G18-13`** | **Role 4 & 2** | **[FULL-DOCS] Xây dựng API Upload MinIO (<=10MB) & Giao diện Hồ sơ Điện tử Pháp lý (FR-08)**. |
| **`G18-14`** | **Role 1** | **[LEAD-GIS] Xây dựng Bản đồ số PCCC: Marker Clustering, Heatmap, Bộ lọc & Chọn tọa độ (FR-09)**. |
| **`G18-15`** | **Role 5** | **[FULL-REPORT] Xây dựng Dashboard Tổng quan ECharts & 7 Báo cáo Thống kê Xuất Excel/PDF (FR-10, FR-11)**. |
| **`G18-16`** | **Role 4** | **[BE-CRON] Xây dựng Cronjob Cảnh báo Tự động 06:00 sáng & Hệ thống Thông báo (FR-14)**. |
| **`G18-17`** | **Role 4 & 1** | **[FULL-PUBLIC] Xây dựng API (Rate Limit, Ẩn SĐT) & Cổng Tra cứu Công khai `/tra-cuu` cho Người dân (FR-16)**. |
| **`G18-18`** | **Cả nhóm** | **[QA-FINAL] Kiểm thử Tự động (Unit/Integration/E2E), Đóng băng Code Tuần 7 & Bảo vệ Tuần 8**. |

---

## 4. Lộ trình 8 Tuần & Quy trình Gitflow Hàng ngày

### 4.1. Cột mốc 8 Tuần
* **Tuần 1–2 (M0):** Khảo sát, chốt SRS, ERD, Figma, dựng khung Monolith, Docker Compose, Seed danh mục, CI xanh.
* **Tuần 3–4 (M1):** Hoàn thành Auth + RBAC + Audit Log, CRUD Cơ sở, Hàm chấm điểm rủi ro 0-100đ, Lịch kiểm tra (BE).
* **Tuần 5–6 (M2 & M3 - Đạt MVP):** Hoàn thành Thiết bị, Thực hiện kiểm tra Checklist -> Tự sinh vi phạm -> Duyệt, Hồ sơ điện tử, Bản đồ GIS, Báo cáo, Dashboard & Tra cứu công khai.
* **Tuần 7–8 (M4 & M5):** Nhập Excel, In PDF, Cronjob, đóng băng tính năng cuối tuần 7 (`v0.9.0`), tuần 8 kiểm thử tổng thể, làm slide và bảo vệ (`v1.0.0`).

### 4.2. Quy trình 5 Bước Lệnh Git & Definition of Done (DoD)
```bash
git checkout develop && git pull origin develop
git checkout -b feature/G18-xx-ten-ngan-gon
# Sau khi code xong trong đúng thư mục của Role mình:
git status && npm run build
git add . && git commit -m "feat(G18-xx): mo ta ngan gon"
git pull origin develop
git push -u origin feature/G18-xx-ten-ngan-gon
```
* **Tiêu chuẩn Hoàn thành (DoD):** (1) Đạt Acceptance Criteria; (2) Có validate DTO và kiểm tra phân quyền dữ liệu ở Backend Service; (3) UI xử lý đủ trạng thái Loading/Empty/Error; (4) `npm run build` và CI báo xanh; (5) Được Leader review và Squash Merge vào `develop`.



