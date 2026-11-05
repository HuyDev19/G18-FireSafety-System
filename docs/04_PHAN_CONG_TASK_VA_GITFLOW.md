# 04. PHÂN CÔNG 5 THÀNH VIÊN, LỘ TRÌNH 16 TUẦN & QUY TRÌNH GITFLOW

## 1. Bảng Phân công 5 Role (100% Thành viên Đều Code & Có Module Bảo Vệ Riêng)

| Mã Role | Vai trò | Module phụ trách (FR) | Thư mục Code Độc quyền (Chống Conflict) | Công việc & Sản phẩm Bàn giao |
| :--- | :--- | :--- | :--- | :--- |
| **ROLE 1**<br>*(Leader)* | **Team Leader, GIS & Public Portal Architect** | FR-09, FR-16 (FE), Kiến trúc, SRS | - Khung gốc `frontend-web/`, `App.tsx`, `stores/`, `services/`, `types/`, `utils/`<br>- `src/features/gis-map/`<br>- `src/features/public-lookup/` | 1. Dựng khung repo, Router, Axios, Types chống Conflict.<br>2. Code **Bản đồ số PCCC (FR-09)** (Marker màu mức nguy hiểm, Clustering, Heatmap, Chọn tọa độ).<br>3. Code **Cổng Tra cứu Công khai (`/tra-cuu` - FR-16)**.<br>4. Quản lý Jira, điều phối báo cáo tuần/tháng theo quy định UTH – GTel OTS. |
| **ROLE 2** | **Frontend 1 (Core Management UI)** | FR-01, 02, 04, 05, 08, 13 (FE) | - `frontend-web/src/layouts/`<br>- `src/features/auth/`<br>- `src/features/facilities/`<br>- `src/features/equipments/`<br>- `src/features/schedules/` | 1. Giao diện Login, Đổi mật khẩu, Guard ẩn/hiện menu & Quản trị User (FR-01).<br>2. Bảng danh sách cơ sở, Import Excel & **Chi tiết cơ sở 7 Tabs** (FR-02, 08, 13).<br>3. Giao diện Quản lý Thiết bị PCCC (FR-04) & Lịch kiểm tra bảng/tháng (FR-05). |
| **ROLE 3** | **Backend 1 (Cloud DB, Auth, Risk & Audit)** | FR-01, 02, 03, 04, 12, 13 (BE) | - `backend-api/prisma/schema.prisma`<br>- `src/main.ts`, `src/common/`<br>- `src/modules/auth/`, `users/`, `facilities/`, `equipments/`, `audit/` | 1. Thiết lập Cloud PostgreSQL + PostGIS (Supabase/Neon), quản lý Migration 14 bảng Prisma.<br>2. Xây dựng Auth JWT + Refresh Token + RBAC Guard (FR-01) & Audit Log (FR-12).<br>3. API Cơ sở, Import Excel, Thiết bị & **Hàm tính điểm rủi ro 0-100đ có Unit Test (FR-03)**. |
| **ROLE 4** | **Backend 2 (Inspection, Files, Public & CI/CD)** | FR-05, 06, 07, 08, 14, 16 (BE) | - `.github/workflows/`<br>- `src/modules/schedules/`, `inspections/`, `violations/`, `documents/`, `public/`, `src/jobs/` | 1. Cấu hình MinIO / S3 Cloud Storage & GitHub Actions CI/CD (`ci.yml`).<br>2. API Lịch kiểm tra (FR-05), Checklist kiểm tra tự sinh Vi phạm & Lãnh đạo duyệt (FR-06, 07).<br>3. Upload Hồ sơ MinIO (FR-08), Cronjob cảnh báo 06:00 sáng (FR-14) & API Công khai (FR-16). |
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

## 3. Bảng Lịch trình 16 Tuần & Danh mục 27 Task Jira Phân bổ 5 Role (Khớp `G18_Lich_Trinh_16_Tuan.csv`)

Căn cứ kế hoạch phối hợp UTH – GTel OTS (kéo dài 16 tuần thực tế, đã trừ 2 tuần nghỉ Tết Nguyên đán ở Tuần 14-15 từ 01/02 đến 14/02/2027), toàn bộ 27 nhiệm vụ Jira được chuẩn hóa và phân chia độc quyền cho từng Role như sau:

| Giai đoạn | Tuần | Mã Task | Role phụ trách | Module (FR) | Thư mục Code Độc quyền | Nội dung Công việc & Tiêu chuẩn Bàn giao (DoD) |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Giai đoạn 1 (M0): Khởi tạo & Hạ tầng**<br>*(Tuần 1 – Tuần 4)*<br>`02/11 – 29/11/2026` | **Tuần 1** | **`G18-01A`** | **Role 1** | Khung Kiến trúc | `frontend-web/src/` (`App.tsx`, `apiClient.ts`, `types/`, `stores/`) | Khởi tạo repository Monorepo, cấu trúc thư mục 5 roles, Router `App.tsx`, Axios client có interceptor gắn JWT, TypeScript interfaces `pccc.types.ts` và hàm tính rủi ro `riskCalculator.ts`. |
| ^ | ^ | **`G18-02A`** | **Role 4 & Role 3** | Hạ tầng Cloud | - Role 4: `.github/workflows/`<br>- Role 3: `backend-api/prisma/` | Thiết lập Cloud PostgreSQL + PostGIS (kích hoạt extension `postgis` trên Supabase/Neon), kiểm tra kết nối SSL `DATABASE_URL`, và cấu hình MinIO / S3 bucket `pccc-files`. |
| ^ | ^ | **`G18-03A`** | **Role 3** | CSDL Prisma | `backend-api/prisma/schema.prisma` | Khai báo schema Prisma chuẩn 14 bảng dữ liệu, cấu hình đầy đủ quan hệ khóa ngoại, index tìm kiếm không gian, và cơ chế xóa mềm (`deletedAt`). |
| ^ | ^ | **`G18-04A`** | **Role 5** | Seeding Engine | `backend-api/prisma/seed.ts` | Xây dựng khung script seeding idempotent (`seed.ts`), nạp sẵn 9 loại hình cơ sở (`FacilityType`) và 16 tiêu chí checklist kiểm tra (`InspectionCriteria`). |
| ^ | **Tuần 2** | **`G18-05A`** | **Role 3** | FR-01 (BE) | `backend-api/src/modules/auth/` | Xây dựng Module NestJS Auth: Phân tách 2 luồng Login (Cán bộ PCCC / Doanh nghiệp), tích hợp xác thực 2 bước MFA (TOTP 2FA), cấp JWT Access + Refresh Token, cơ chế khóa tạm 15 phút sau 5 lần sai liên tiếp và Rate Limit chống Brute-force. |
| ^ | ^ | **`G18-06A`** | **Role 2** | FR-01 (FE) | `frontend-web/src/features/auth/` | Xây dựng 2 giao diện đăng nhập phân tách: Cổng Cán bộ (`/admin-portal/login` có modal nhập mã OTP 2FA) & Cổng Doanh nghiệp (`/doanh-nghiep/login`), lưu JWT vào Zustand store `useAuthStore.ts`, xử lý auto-logout khi 401 và RBAC Guard. |
| ^ | ^ | **`G18-12A`** | **Role 5** | FR-01 (Data) | `backend-api/prisma/seed.ts` | Hoàn thiện logic `seed.ts` nạp sẵn 4 tài khoản đại diện 4 vai trò (`admin@pccc.gov.vn`, `lanhdao@pccc.gov.vn`, `canbo@pccc.gov.vn`, `chu_coso@pccc.gov.vn` có thiết lập MFA mẫu) lên Cloud DB. |
| ^ | **Tuần 3** | **`G18-05B`** | **Role 3** | FR-01, FR-12 (BE) | `backend-api/src/modules/` (`audit/`, `users/`) | Xây dựng Module Audit Log (ghi nhận IP, thao tác before/after, sự kiện an ninh brute-force) và API Cấp phát tài khoản Chủ cơ sở (Identity Provisioning gắn `ownerUserId`, cấm tự đăng ký), phân công địa bàn (`areaCode`). |
| ^ | ^ | **`G18-06B`** | **Role 2** | FR-01 (FE) | `frontend-web/src/features/auth/` | Xây dựng màn hình Quản trị người dùng `UserManagementPage` cho Admin (chức năng Cấp tài khoản Chủ cơ sở theo cơ sở, khóa/mở khóa tài khoản, reset mật khẩu) và modal đổi mật khẩu cá nhân (bắt buộc đổi lần đầu). |
| ^ | **Tuần 4** | **`G18-02B`** | **Role 4** | CI/CD | `.github/workflows/ci.yml` | Cấu hình GitHub Actions CI tự động kiểm tra Lint, TypeScript compile (`tsc`), và Build cả Frontend + Backend mỗi khi có Pull Request vào nhánh `develop`. |
| ^ | ^ | **`G18-04B`** | **Role 5** | FR-02, 03 (Data) | `backend-api/prisma/seed.ts` | Chạy seed thành công 40 cơ sở mẫu có tọa độ GPS thật tại 8 quận/huyện TP.HCM (phân bổ đủ 3 mức rủi ro LOW/MEDIUM/HIGH, gắn thiết bị và vi phạm mẫu) lên Cloud DB.<br>*(🚩 **Mốc nộp Báo cáo Tháng 1 - 29/11/2026**)* |
| **Giai đoạn 2 (M1): Phát triển Core & Nghiệp vụ**<br>*(Tuần 5 – Tuần 8)*<br>`30/11 – 27/12/2026` | **Tuần 5** | **`G18-07A`** | **Role 3** | FR-02, FR-03 (BE) | `backend-api/src/modules/facilities/` | Viết API CRUD Cơ sở PCCC (hỗ trợ phân trang, lọc theo quận/huyện, loại hình, mức rủi ro, xóa mềm) và tích hợp Engine tính điểm rủi ro tự động `calculateRiskScoreAndLevel` (0–100đ). |
| ^ | ^ | **`G18-08A`** | **Role 2** | FR-02 (FE) | `frontend-web/src/features/facilities/` | Xây dựng bảng danh sách cơ sở phân trang, tìm kiếm đa tiêu chí, và màn hình Chi tiết cơ sở **7 Tabs dữ liệu** (*Thông tin chung · Thiết bị · Kiểm tra · Vi phạm · Sự cố · Hồ sơ · Bản đồ*). |
| ^ | **Tuần 6** | **`G18-09A`** | **Role 3 & Role 2** | FR-04 (BE + FE) | - BE: `src/modules/equipments/`<br>- FE: `src/features/equipments/` | - **Role 3:** Viết API quản lý thiết bị PCCC theo cơ sở, API đối chiếu thiết bị bắt buộc theo loại hình, hỗ trợ lọc `?expiringWithinDays=30`.<br>- **Role 2:** UI Quản lý thiết bị, tự động đánh dấu badge Sắp hết hạn (<= 30 ngày) và Đã hết hạn kiểm định. |
| ^ | ^ | **`G18-08B`** | **Role 2 & Role 3** | FR-13 (FE + BE) | - FE: `src/features/facilities/`<br>- BE: `src/modules/facilities/` | Xây dựng tính năng Nhập cơ sở từ Excel: Tải file mẫu `.xlsx`, upload file, Role 3 validate từng dòng và báo lỗi chi tiết, Role 2 hiển thị bảng preview trước khi bấm xác nhận lưu hàng loạt. |
| ^ | **Tuần 7** | **`G18-10A`** | **Role 4 & Role 2** | FR-05 (BE + FE) | - BE: `src/modules/schedules/`<br>- FE: `src/features/schedules/` | - **Role 4:** Viết API Lập lịch kiểm tra (Định kỳ, Đột xuất, Tái kiểm), tự động gợi ý chu kỳ theo mức rủi ro (3/6/12 tháng) và tự đánh dấu quá hạn (`OVERDUE`).<br>- **Role 2:** UI Lịch kiểm tra dạng bảng và dạng calendar tháng/tuần. |
| ^ | ^ | **`G18-11A`** | **Role 4** | FR-06, FR-07 (BE) | `backend-api/src/modules/inspections/` | Viết API nộp kết quả Checklist: Lưu `InspectionItem`, **tự động sinh bản ghi `Violation` (status = OPEN)** cho tiêu chí `FAIL`, gọi hàm tính lại điểm rủi ro, và API Lãnh đạo phê duyệt (`approve`). |
| ^ | **Tuần 8** | **`G18-12B`** | **Role 5** | FR-06, FR-15 (FE) | `frontend-web/src/features/inspections/` | Xây dựng giao diện đánh giá Checklist trên Mobile/PC, cơ chế **tự lưu nháp vào `localStorage` chống mất dữ liệu hiện trường**, màn hình duyệt biên bản, và tính năng **In Biên bản kiểm tra PDF có QR Code**.<br>*(🚩 **Mốc nộp Báo cáo Tháng 2 - 27/12/2026**)* |
| **Giai đoạn 3 (M2-M3): Hoàn thành MVP & Mở rộng**<br>*(Tuần 9 – Tuần 12)*<br>`28/12/2026 – 24/01/2027` | **Tuần 9** | **`G18-MID`** | **Cả nhóm** | Mốc Đánh giá UTH | Báo cáo & Slide | **Mốc Đánh giá Chéo Giữa kỳ UTH – GTel OTS:** Hoàn thiện báo cáo phân tích & thiết kế, nộp *Mẫu 4 – Phiếu đánh giá chéo giữa kỳ* và demo các module MVP đã hoàn thành. |
| ^ | ^ | **`G18-13A`** | **Role 4 & Role 2** | FR-08 (BE + FE) | - BE: `src/modules/documents/`<br>- FE: `src/features/facilities/` | - **Role 4:** Viết API Upload file PDF/JPG/PNG <= 10MB lên MinIO S3 bucket `pccc-files`, quản lý số văn bản, hạn hiệu lực và version.<br>- **Role 2:** UI Tab Hồ sơ điện tử trong Chi tiết cơ sở, hỗ trợ xem trước (preview) tài liệu PDF. |
| ^ | ^ | **`G18-11B`** | **Role 4 & Role 5** | FR-07 (BE + FE) | - BE: `src/modules/violations/`<br>- FE: `src/features/inspections/` | Xây dựng luồng **Xử lý Vi phạm 2 bước**: Chủ cơ sở gửi ảnh báo khắc phục `report-fix` -> Cán bộ/Lãnh đạo nghiệm thu `verify-resolve` (tự trừ điểm rủi ro); Role 5 dựng Timeline Vi phạm & Sự cố. |
| ^ | **Tuần 10** | **`G18-14A`** | **Role 1** | FR-09 (FE) | `frontend-web/src/features/gis-map/` | Xây dựng **Bản đồ số PCCC (GIS)** sử dụng MapLibre GL JS: Hiển thị marker theo màu mức nguy hiểm (Xanh/Vàng/Đỏ), gom cụm điểm (**Marker Clustering**), bộ lọc cơ sở vi phạm/quá hạn, và lớp **Heatmap rủi ro**. |
| ^ | **Tuần 11** | **`G18-16A`** | **Role 4** | FR-14 (BE) | `backend-api/src/jobs/` | Xây dựng Cronjob chạy tự động lúc **06:00 sáng hàng ngày**: Quét lịch sắp đến hạn (7 ngày), thiết bị/hồ sơ hết hạn (30 ngày), vi phạm quá hạn để tạo bản ghi thông báo trong bảng `Notification`. |
| ^ | **Tuần 12** | **`G18-15A`** | **Role 5** | FR-10, FR-11 (Fullstack) | - BE: `src/modules/reports/`<br>- FE: `src/features/dashboard/` | Xây dựng API và giao diện **Dashboard số liệu KPI (ECharts)** kèm phân hệ **7 Báo cáo thống kê** chuẩn hóa, hỗ trợ xuất file Excel tiếng Việt có dấu (`.xlsx`).<br>*(🚩 **Mốc nộp Báo cáo Tháng 3 - 24/01/2027**)* |
| **Giai đoạn 4 (M4-M5): Tinh chỉnh & Bàn giao**<br>*(Tuần 13 – Tuần 18)*<br>`25/01 – 07/03/2027` | **Tuần 13 – 15** | **`G18-TET`** | **Cả nhóm** | Kiểm thử & Nghỉ Tết | Toàn hệ thống | Tích hợp hệ thống liên thông dữ liệu A-Z, kiểm thử luồng nghiệp vụ end-to-end.<br>*(Dự phòng 2 tuần nghỉ Tết Nguyên đán từ 01/02 đến 14/02/2027; thành viên gửi Daily Report nếu có task phát sinh)*. |
| ^ | **Tuần 16** | **`G18-17A`** | **Role 1 & Role 4** | FR-16 (FE + BE) | - BE: `src/modules/public/`<br>- FE: `src/features/public-lookup/` | Xây dựng **Cổng Tra cứu Công khai cho Người dân (`/tra-cuu`)**: Role 4 viết API có Rate Limit theo IP và ẩn tuyệt đối dữ liệu nhạy cảm (SĐT/Email/hồ sơ mật); Role 1 viết UI tra cứu nhanh không cần đăng nhập.<br>*(🚩 **Mốc nộp Báo cáo Tháng 4 - 21/02/2027**)* |
| ^ | **Tuần 17** | **`G18-FINAL1`** | **Cả nhóm** | Đánh giá Chéo Cuối kỳ | Báo cáo, Slide, Video | Tổ chức trình diễn Demo sản phẩm, hoàn thiện Báo cáo tổng kết dự án, nộp *Mẫu 5 – Phiếu đánh giá chéo cuối kỳ* giữa các nhóm theo quy chế UTH. |
| ^ | **Tuần 18** | **`G18-FINAL2`** | **Cả nhóm** | Nghiệm thu & Bàn giao | Repository & Rubric UTH | Bàn giao toàn bộ mã nguồn sạch, tài liệu kỹ thuật, video demo, hoàn thành buổi bảo vệ trước Hội đồng GTel OTS và nộp Bảng đóng góp cá nhân theo Rubric UTH (`07/03/2027`). |

---

## 4. Cơ chế Báo cáo Định kỳ Theo Quy chế UTH – GTel OTS

1. **Daily Report (Mẫu 1):** Thành viên cập nhật cho Team Leader vào mỗi ngày làm việc (ghi nhận công việc, minh chứng, khó khăn, kế hoạch ngày tiếp theo).
2. **Weekly Report (Mẫu 2):** Team Leader tổng hợp và gửi đồng thời cho Mentor GTel OTS và Giảng viên UTH (Coordinator) trong vòng **01 ngày làm việc sau buổi báo cáo định kỳ**. Tiêu đề email chuẩn hóa:
   `[HKDN UTH-Gtel OTS] - [Mã nhóm] - Weekly Report – Tuần X`
3. **Monthly Report (Mẫu 3):** Leader nộp vào cuối tuần 4, 8, 12 và 16 (tương ứng các ngày 29/11/2026, 27/12/2026, 24/01/2027 và 21/02/2027).
4. **Quy trình Gitflow Hàng ngày:**
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b feature/G18-xx-ten-ngan-gon
   # Code trong đúng thư mục độc quyền của Role mình
   npm run build
   git add . && git commit -m "feat(G18-xx): mo ta ngan gon"
   git push -u origin feature/G18-xx-ten-ngan-gon
   ```
   *Tiêu chuẩn hoàn thành (DoD):* Đạt Acceptance Criteria, build không lỗi, được Leader review và Squash Merge vào `develop`.
