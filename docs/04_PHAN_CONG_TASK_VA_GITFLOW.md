# 04. PHÂN CÔNG 5 THÀNH VIÊN, LỘ TRÌNH 16 TUẦN & QUY TRÌNH GITFLOW

## 1. Bảng Phân công 5 Role (100% Thành viên Đều Code & Có Module Bảo Vệ Riêng)

| Mã Role | Vai trò | Module phụ trách (FR) | Thư mục Code Độc quyền (Chống Conflict) | Công việc & Sản phẩm Bàn giao |
| :--- | :--- | :--- | :--- | :--- |
| **ROLE 1**<br>*(Leader)* | **Team Leader, GIS & Public Portal Architect** | FR-09, FR-16 (FE), Kiến trúc, SRS | - Khung gốc `frontend-web/`, `App.tsx`, `stores/`, `services/`, `types/`, `utils/`<br>- `src/features/gis-map/`<br>- `src/features/public-lookup/` | 1. Dựng khung repo, Router, Axios, Types chống Conflict.<br>2. Code **Bản đồ số PCCC (FR-09)** (Marker màu mức nguy hiểm, Clustering, Heatmap, Chọn tọa độ).<br>3. Code **Cổng Tra cứu Công khai (`/tra-cuu` - FR-16)**.<br>4. Quản lý Jira, điều phối báo cáo tuần/tháng theo quy định UTH – Gtel OTS. |
| **ROLE 2** | **Frontend 1 (Core Management UI)** | FR-01, 02, 04, 05, 08, 13 (FE) | - `frontend-web/src/layouts/`<br>- `src/features/auth/`<br>- `src/features/facilities/`<br>- `src/features/equipments/`<br>- `src/features/schedules/` | 1. Giao diện Login, Đổi mật khẩu, Guard ẩn/hiện menu & Quản trị User (FR-01).<br>2. Bảng danh sách cơ sở, Import Excel & **Chi tiết cơ sở 7 Tabs** (FR-02, 08, 13).<br>3. Giao diện Quản lý Thiết bị PCCC (FR-04) & Lịch kiểm tra bảng/tháng (FR-05). |
| **ROLE 3** | **Backend 1 (Cloud DB, Auth, Risk & Audit)** | FR-01, 02, 03, 04, 12, 13 (BE) | - `backend-api/prisma/schema.prisma`<br>- `src/main.ts`, `src/common/`<br>- `src/modules/auth/`, `users/`, `facilities/`, `equipments/`, `audit/` | 1. Thiết lập Cloud PostgreSQL + PostGIS (Supabase/Neon), quản lý Migration 14 bảng Prisma.<br>2. Xây dựng Auth JWT + Refresh Token + RBAC Guard (FR-01) & Audit Log (FR-12).<br>3. API Cơ sở, Import Excel, Thiết bị & **Hàm tính điểm rủi ro 0-100đ có Unit Test (FR-03)**. |
| **ROLE 4** | **Backend 2 (Inspection, Files, Public & CI/CD)** | FR-05, 06, 07, 08, 14, 16 (BE) | - `.github/workflows/`<br>- `src/modules/schedules/`, `inspections/`, `violations/`, `documents/`, `public/`, `src/jobs/` | 1. Cấu hình MinIO Cloud Storage & GitHub Actions CI/CD (`ci.yml`).<br>2. API Lịch kiểm tra (FR-05), Checklist kiểm tra tự sinh Vi phạm & Lãnh đạo duyệt (FR-06, 07).<br>3. Upload Hồ sơ MinIO (FR-08), Cronjob cảnh báo 06:00 sáng (FR-14) & API Công khai (FR-16). |
| **ROLE 5** | **Fullstack 2 (Inspection UI, Dashboard, Report & QA)** | FR-06, 07, 10, 11, 15 + Seed/QA | - **BE:** `prisma/seed.ts`, `src/modules/reports/`<br>- **FE:** `src/features/inspections/`, `src/features/dashboard/` | 1. Viết `seed.ts` nạp danh mục, checklist & 40 cơ sở tọa độ thật lên Cloud DB.<br>2. Giao diện đánh giá Checklist (Mobile/PC, lưu nháp `localStorage`), duyệt biên bản, Timeline Vi phạm/Sự cố & **In PDF có QR (FR-06, 07, 15)**.<br>3. API & UI **Dashboard ECharts + 7 Báo cáo xuất Excel/PDF (FR-10, 11)**; Kiểm thử QA. |

---

## 2. Ranh giới Chủ sở hữu File Dùng Chung (Shared File Owners)

| Đường dẫn File Dùng Chung | Owner Duy Nhất | Quy tắc Phối hợp Bắt buộc |
| :--- | :---: | :--- |
| `frontend-web/src/App.tsx` | **Role 1 (Leader)** | Đã khai báo sẵn toàn bộ Route. Role 2/Role 5 không tự sửa, nếu cần thêm route mới phải nhắn Role 1. |
| `frontend-web/src/services/apiClient.ts` | **Role 1 (Leader)** | Mọi service ở Frontend bắt buộc import `apiClient` này để gọi API. |
| `frontend-web/src/types/pccc.types.ts` | **Role 1 điều phối** | Thay đổi kiểu dữ liệu phải thống nhất với cả nhóm và cập nhật tài liệu. |
| `backend-api/prisma/schema.prisma` | **Role 3 (BE Lead)** | Quản lý kết nối Cloud DB (`DATABASE_URL`). Role 4 và Role 5 chỉ đọc, tuyệt đối không tự chạy migration sửa bảng khi chưa qua Role 3. |
| `backend-api/.env.example` | **Role 3 điều phối** | Mẫu cấu hình `DATABASE_URL` Cloud DB (Supabase/Neon) & JWT chung cho cả nhóm. |

---

## 3. Lộ trình 16 Tuần Triển khai (02/11/2026 – 07/03/2027) & Mốc Báo cáo UTH

Căn cứ quy định phối hợp UTH – Gtel OTS, dự án kéo dài 16 tuần thực tế (đã trừ 2 tuần dự phòng nghỉ Tết Nguyên đán ở Tuần 14-15 từ 01/02 đến 14/02/2027)[cite: 13, 15]:

* **Giai đoạn 1: Khởi tạo & Hạ tầng (M0) — Tuần 1 đến Tuần 4 (02/11/2026 – 29/11/2026)[cite: 14]:**
  * *Công việc:* Dựng khung Monorepo, cấu hình Cloud Database chung (Supabase/Neon), chạy Migration 14 bảng Prisma, Auth JWT + RBAC, Script Seed 40 cơ sở mẫu, Cấu hình CI/CD.
  * *Mốc nộp:* **Báo cáo tháng 1** (Cuối Tuần 4: 29/11/2026)[cite: 13, 14].
* **Giai đoạn 2: Phát triển Core & Nghiệp vụ chính (M1) — Tuần 5 đến Tuần 8 (30/11/2026 – 27/12/2026)[cite: 14, 15]:**
  * *Công việc:* Bản đồ số PCCC (GIS), CRUD Cơ sở & Chi tiết 7 Tabs, Engine tính điểm rủi ro 0-100đ, Quản lý thiết bị PCCC, Lịch kiểm tra, Checklist kiểm tra tự sinh vi phạm và In PDF có QR.
  * *Mốc nộp:* **Báo cáo tháng 2** (Cuối Tuần 8: 27/12/2026)[cite: 13, 15].
* **Giai đoạn 3: Hoàn thành MVP, Đánh giá Giữa kỳ & Mở rộng (M2-M3) — Tuần 9 đến Tuần 12 (28/12/2026 – 24/01/2027)[cite: 14, 15]:**
  * *Tuần 9 (28/12 - 03/01):* Tổ chức **Đánh giá chéo giữa kỳ** (Nộp *Mẫu 4 – Phiếu đánh giá chéo giữa kỳ* và báo cáo phân tích/thiết kế)[cite: 15, 16, 22].
  * *Công việc:* Cổng tra cứu công khai (`/tra-cuu`), Cronjob cảnh báo tự động 06:00 sáng, Dashboard ECharts & 7 Báo cáo thống kê xuất Excel.
  * *Mốc nộp:* **Báo cáo tháng 3** (Cuối Tuần 12: 24/01/2027)[cite: 13, 15].
* **Tuần 13 & Dự phòng Tết Nguyên đán — Tuần 13, 14, 15 (25/01/2027 – 14/02/2027)[cite: 13, 15]:**
  * *Nội dung:* Tiếp tục hoàn thiện tính năng; 2 tuần dự phòng nghỉ Tết (Tuần 14-15 từ 01/02 đến 14/02/2027, không tính vào 16 tuần triển khai chính thức)[cite: 13, 15]. Thành viên duy trì Daily Report (`Mẫu 1`) nếu có công việc phát sinh[cite: 13, 15].
* **Giai đoạn 4: Tinh chỉnh, Đánh giá Chéo cuối kỳ & Bàn giao (M4-M5) — Tuần 16 đến Tuần 18 (15/02/2027 – 07/03/2027)[cite: 15]:**
  * *Công việc:* Fix bug, tối ưu hệ thống, kiểm thử toàn diện.
  * *Tuần 17:* Trình bày, Demo sản phẩm và thực hiện **Đánh giá chéo cuối kỳ**[cite: 15, 17].
  * *Tuần 18:* Nghiệm thu, bàn giao sản phẩm, mã nguồn, báo cáo tổng kết và bảng đóng góp cá nhân theo Rubric UTH[cite: 15, 17, 18].
  * *Mốc nộp:* **Báo cáo tháng 4** (Cuối Tuần 16: 21/02/2027)[cite: 13, 15] và hồ sơ bàn giao cuối kỳ (07/03/2027)[cite: 15].

---

## 4. Cơ chế Báo cáo Định kỳ Theo Quy chế UTH – Gtel OTS

1. **Daily Report (Mẫu 1):** Thành viên cập nhật cho Team Leader vào mỗi ngày làm việc (ghi nhận công việc, minh chứng, khó khăn, kế hoạch ngày tiếp theo)[cite: 13, 19].
2. **Weekly Report (Mẫu 2):** Team Leader tổng hợp và gửi đồng thời cho Mentor Gtel OTS và Giảng viên UTH (Coordinator) trong vòng **01 ngày làm việc sau buổi báo cáo định kỳ**[cite: 13, 15]. Tiêu đề email chuẩn hóa:
   `[HKDN UTH-Gtel OTS] - [Mã nhóm] - Weekly Report – Tuần X`[cite: 13]
3. **Monthly Report (Mẫu 3):** Leader nộp vào cuối tuần 4, 8, 12 và 16 (tương ứng các ngày 29/11/2026, 27/12/2026, 24/01/2027 và 21/02/2027)[cite: 13, 15].
4. **Quy trình Gitflow hàng ngày:**
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b feature/G18-xx-ten-ngan-gon
   # Code trong thư mục độc quyền của Role mình
   npm run build
   git add . && git commit -m "feat(G18-xx): mo ta ngan gon"
   git push -u origin feature/G18-xx-ten-ngan-gon
   ```
   *Tiêu chuẩn hoàn thành (DoD):* Đạt Acceptance Criteria, build không lỗi, được Leader review và Squash Merge vào `develop`.