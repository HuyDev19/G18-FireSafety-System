# 05. HỢP ĐỒNG GIAO TIẾP API (API CONTRACTS), BẢO MẬT & KỊCH BẢN DEMO

## 1. Quy chuẩn Định dạng RESTful API Chung
- **Base URL:** `http://localhost:3000/api` (Tài liệu Swagger UI tự động tại: `http://localhost:3000/api/docs`).
- **Format JSON Trả về Bắt buộc:**
  ```json
  {
    "success": true,
    "message": "Thao tác thành công",
    "data": { ... },
    "meta": { "page": 1, "limit": 20, "total": 45 }
  }
  ```

---

## 2. Danh mục Endpoints Cốt lõi & Ma trận Phân quyền (RBAC)

*(Ghi chú: Kiểm tra quyền phải thực hiện ở cả `@RolesGuard` lẫn kiểm tra phạm vi dữ liệu `areaCode`/`assignedInspectorId`/`ownerUserId` trong tầng Service).*

| Phân hệ (FR) | Method & Endpoint chính | Quyền được phép gọi | Ghi chú Hợp đồng Dữ liệu & Nghiệp vụ Chuẩn BA |
| :--- | :--- | :--- | :--- |
| **FR-01: Auth & Users (Cổng Nội bộ & Cổng Doanh nghiệp)** | `POST /api/auth/internal/login`<br>`POST /api/auth/2fa/verify`<br>`POST /api/auth/owner/login`<br>`POST /api/users/provision-owner`<br>`POST /api/auth/refresh`<br>`PATCH /api/auth/change-password`<br>`POST /api/users/:id/reset-password`<br>`GET/POST/PATCH /api/users` | Cán bộ/Admin (`internal/login`, `2fa/verify`)<br>Chủ cơ sở (`owner/login`)<br>`ADMIN`, `INSPECTOR` (`provision-owner`, Reset MK)<br>Authenticated (Đổi MK, Refresh) | - **Tuyệt đối không có API tự đăng ký (`POST /api/auth/register` -> 404/403)**.<br>- `internal/login`: Kiểm tra IP Whitelist/VPN -> Trả về `{ mfaRequired: true, tempToken }`.<br>- `2fa/verify`: Xác thực mã TOTP 6 số -> Trả về Access/Refresh Token.<br>- `owner/login`: Cổng doanh nghiệp, kiểm tra Brute-force & CAPTCHA.<br>- `provision-owner`: Cán bộ cấp tài khoản gắn `facilityId`, tạo mật khẩu tạm, bật `mustChangePassword = true`.<br>- Khóa tạm 15 phút nếu sai mật khẩu 5 lần liên tiếp trên bất kỳ cổng nào. |
| **FR-02 & 03: Cơ sở & Điểm Rủi ro** | `GET /api/facilities`<br>`GET /api/facilities/:id`<br>`POST/PATCH /api/facilities`<br>`POST /api/facilities/:id/override-risk`<br>`POST /api/facilities/import-excel` | Xem: `ADMIN`, `LEADER`, `INSPECTOR` (được giao), `OWNER` (theo `ownerUserId`)<br>Tạo/Sửa: `ADMIN`, `INSPECTOR` | Khi tạo/sửa tự động gọi `calculateRiskScoreAndLevel` cập nhật `riskScore` (0-100) và `riskLevel` (`LOW`, `MEDIUM`, `HIGH`). |
| **FR-04: Thiết bị PCCC** | `GET /api/facilities/:id/equipments`<br>`POST/PATCH/DELETE /api/equipments` | `ADMIN`, `INSPECTOR` (Xem thêm: `LEADER`, `OWNER`) | Hỗ trợ query `?expiringWithinDays=30` để lọc thiết bị sắp hết hạn kiểm định. |
| **FR-05: Lịch Kiểm tra** | `GET /api/schedules`<br>`POST /api/schedules`<br>`PATCH /api/schedules/:id/status` | Tạo/Phân công: `ADMIN`, `LEADER`<br>Xem lịch được giao: `INSPECTOR` | - Hỗ trợ lọc theo khoảng thời gian (lịch tháng/tuần) và trạng thái quá hạn (`OVERDUE`).<br>- Lịch Định kỳ (`PERIODIC`) bắt buộc báo trước tối thiểu **3 ngày làm việc** (NĐ 105/2025/NĐ-CP Điều 14).<br>- Lịch chỉ chuyển trạng thái **`COMPLETED`** khi Leader duyệt biên bản (`APPROVED`). |
| **FR-06: Thực hiện Kiểm tra & Duyệt** | `GET /api/inspections/criteria`<br>`PATCH /api/inspections/:scheduleId/draft`<br>`POST /api/inspections/:scheduleId/submit`<br>`PATCH /api/inspections/:id/approve` | Thực hiện & Nộp: `INSPECTOR`<br>Phê duyệt / Trả lại: `ADMIN`, `LEADER` | - **Chống mất dữ liệu hiện trường:** Frontend tự động lưu nháp Checklist vào `localStorage` mỗi khi tick chọn và hỗ trợ lưu bản nháp (`DRAFT`).<br>- Khi `submit`: Lưu `InspectionItem`, **tự động sinh `Violation`** cho mục `FAIL`, tính lại điểm rủi ro. Khi `approve`: Khóa chỉnh sửa & ghi `AuditLog`. |
| **FR-07: Vi phạm & Sự cố (Luồng 2 bước)** | `GET/POST /api/violations`<br>`POST /api/violations/:id/upload-evidence`<br>`PATCH /api/violations/:id/report-fix`<br>`PATCH /api/violations/:id/verify-resolve`<br>`GET/POST /api/incidents` | Upload ảnh (`upload-evidence`) & Báo khắc phục (`report-fix`): `OWNER` (đúng `ownerUserId`), `INSPECTOR`<br>Nghiệm thu (`verify-resolve`): `ADMIN`, `LEADER`, `INSPECTOR`<br>Báo Sự cố (`incidents`): `ADMIN`, `INSPECTOR`, `OWNER` (cơ sở mình) | - **Bước 1 (`upload-evidence` + `report-fix`):** Chủ cơ sở tải ảnh minh chứng khắc phục (`JPG/PNG <= 5MB`) + ghi chú -> Đổi trạng thái từ `OPEN` sang **`FIXING` (Chờ nghiệm thu)**, chưa trừ điểm rủi ro.<br>- **Bước 2 (`verify-resolve`):** Cán bộ/Lãnh đạo kiểm tra minh chứng và xác nhận đạt -> Đổi sang **`RESOLVED`**, tự động tính giảm lại `riskScore` cho cơ sở. |
| **FR-08: Hồ sơ Điện tử** | `POST /api/documents/upload`<br>`GET /api/facilities/:id/documents`<br>`GET /api/documents/:id/download` | Upload: `ADMIN`, `INSPECTOR`<br>Xem/Tải: `ADMIN`, `LEADER`, `INSPECTOR`, `OWNER` (kiểm tra quyền) | Chỉ nhận file `PDF/JPG/PNG` <= 10MB, lưu vào MinIO/S3 **bucket `pccc-documents` (chế độ PRIVATE)**, cấp **Presigned URL** ngắn hạn khi tải xuống, tăng `version` nếu tải bản mới và ghi `AuditLog`. |
| **FR-09: Bản đồ số PCCC** | `GET /api/facilities/map-markers` | `ADMIN`, `LEADER`, `INSPECTOR` (phạm vi được giao) | Trả về mảng nhẹ gồm `id`, `code`, `name`, `latitude`, `longitude`, `riskScore`, `riskLevel`, `status`, `hasOpenViolation`. |
| **FR-10 & 11: Báo cáo & Dashboard** | `GET /api/reports/dashboard-summary`<br>`GET /api/reports/statistics`<br>`GET /api/reports/export-excel` | `ADMIN`, `LEADER`, `INSPECTOR` (theo phạm vi) | Tổng hợp số liệu KPI, biểu đồ xu hướng vi phạm và xuất file `.xlsx` tiếng Việt có dấu. |
| **FR-16: Tra cứu Công khai** | `GET /api/public/facilities` | `PUBLIC` (Không cần Token, Rate Limit 30 req/phút/IP) | **Chỉ trả về:** `id`, `code`, `name`, `facilityTypeName`, `address`, `ward`, `district`, `latitude`, `longitude`, `riskLevel`, `complianceStatus`, `lastInspectedAt`.<br>- `complianceStatus`: `NEEDS_REMEDIATION` (có vi phạm chưa xử lý) / `COMPLIANT` (đã duyệt & sạch vi phạm) / `UNINSPECTED` (chưa từng kiểm tra). |

---

## 3. Checklist Bảo mật GovTech Bắt buộc (Security Checklist)

1. **Phân tách Cổng & Phân vùng Mạng (Network Segmentation & Portal Isolation):**
   - Tách biệt hoàn toàn 3 luồng: Cổng Nội bộ PCCC (`/admin-portal/login`), Cổng Doanh nghiệp (`/doanh-nghiep/login`), và Cổng Tra cứu Dân sự (`/tra-cuu`).
   - Cổng Nội bộ bắt buộc kiểm tra IP Whitelist/VPN mạng công an chuyên dùng và áp dụng xác thực 2 bước (MFA).

2. **Cấp phát Định danh Tập trung (Zero Self-Registration / Identity Provisioning):**
   - Nghiêm cấm hoàn toàn tính năng tự do đăng ký tài khoản (`POST /api/auth/register` bị cấm hoặc trả về 404/403).
   - Mọi tài khoản `OWNER` (Chủ cơ sở) đều phải được Cán bộ kiểm tra/Admin cấp phát định danh chính thức (`POST /api/users/provision-owner`) gắn liền với `facilityId` và lưu vết `provisionedById`.
   - Cấp mật khẩu ngẫu nhiên tạm thời và kích hoạt cờ `mustChangePassword = true` bắt buộc đổi mật khẩu ngay lần đầu.

3. **Bảo mật Đặc quyền Đa yếu tố (Privileged Access Management - PAM & MFA TOTP):**
   - Tài khoản cán bộ nội bộ (`ADMIN`, `LEADER`, `INSPECTOR`) bắt buộc xác thực 2 yếu tố TOTP (RFC 6238 - Google Authenticator / Microsoft Authenticator).
   - Secret key được mã hóa AES-256 trước khi lưu vào CSDL (`twoFactorSecret`).

4. **Cơ chế Phòng vệ Đa tầng Chống Brute-force & Khóa tài khoản:**
   - **Tầng 1 (Rate Limiting per IP):** Tối đa 5 yêu cầu đăng nhập/phút trên cùng 1 IP. Vượt ngưỡng trả về `HTTP 429 Too Many Requests`.
   - **Tầng 2 (Progressive Delay & CAPTCHA):** Thử sai từ lần 3 trở đi, hệ thống tăng độ trễ phản hồi (exponential backoff 1s - 2s - 4s) và yêu cầu xác thực CAPTCHA.
   - **Tầng 3 (Account Lockout & Security Audit):** Sai 5 lần liên tiếp sẽ tự động kích hoạt `isLocked = true` và `lockedUntil = NOW() + 15 phút`. Mọi lần thử sai và sự kiện khóa tài khoản đều được ghi log mức `CRITICAL` vào bảng `AuditLog`.

5. **Kiểm soát Quyền Dữ liệu (IDOR Prevention):**
   - Cán bộ (`INSPECTOR`) hoặc Chủ cơ sở (`OWNER`) truyền `facilityId` không thuộc phạm vi quyền quản lý (`areaCode` hoặc `ownerUserId`) phải bị chặn bằng mã lỗi `403 Forbidden` ngay tại tầng Service.

6. **Kiểm soát Tệp tải lên (FR-08):**
   - Kiểm tra MIME type thực tế (`PDF`, `JPG`, `PNG`) theo magic bytes và dung lượng <= 10MB, đổi tên file ngẫu nhiên UUID trước khi lưu trữ vào MinIO/S3 **bucket `pccc-documents` (PRIVATE)**.
   - Sử dụng **Presigned URL** thời hạn ngắn (5 phút) sau khi xác thực quyền, kết hợp ghi nhận `AuditLog` cho mọi thao tác upload/tải xuống/xóa.

---

## 4. Kịch bản Demo Bảo vệ 10 Phút Trước Hội đồng GTEL OTS (5 Thành viên)

1. **Phút 1 – 2 (Role 3 & Role 2 - Quản lý Cơ sở, Cấp tài khoản Chủ cơ sở & Chấm điểm Rủi ro Tự động):**
   * Đăng nhập Cổng Nội bộ `/admin-portal/login` bằng tài khoản Cán bộ PCCC (xác thực OTP 2FA).
   * Tạo mới cơ sở trên bản đồ, thêm thiết bị và cấp phát tài khoản Chủ cơ sở (`provision-owner`) cho doanh nghiệp quản lý cơ sở đó -> Hệ thống tự động chấm điểm rủi ro ban đầu là **58 điểm (Mức Trung bình - Màu Vàng)**.
2. **Phút 3 – 5 (Role 4 & Role 5 - Lập lịch, Kiểm tra Checklist & Tự sinh Vi phạm):**
   * Lãnh đạo tạo lịch phân công -> Cán bộ mở màn hình Kiểm tra trên điện thoại/tablet (tự động lưu nháp `localStorage`), đánh giá Checklist (tick `Không đạt` mục Lối thoát nạn, đính kèm ảnh chụp minh chứng) rồi bấm **Nộp** -> Lãnh đạo bấm **Duyệt**.
   * Hệ thống **tự động sinh bản ghi Vi phạm**, cộng điểm phạt làm điểm rủi ro nhảy lên **66 điểm (Tự động chuyển sang Mức Cao - Màu Đỏ)** và lưu vết vào `AuditLog`.
3. **Phút 6 – 7 (Role 1 - Bản đồ số PCCC):**
   * Mở Bản đồ số PCCC (`FR-09`), lọc các cơ sở có vi phạm mở -> Phóng tới cơ sở vừa chuyển sang **Chấm Đỏ**, trình diễn tính năng gom cụm (Clustering) 50 cơ sở và bật lớp **Heatmap rủi ro**.
4. **Phút 8 – 9 (Role 5 - Dashboard, Báo cáo Excel & In Biên bản PDF có QR):**
   * Mở Dashboard xem biểu đồ ECharts, xuất báo cáo thống kê ra file Excel và bấm **In Biên bản kiểm tra ra PDF có gắn mã QR** xác thực.
5. **Phút 9 – 10 (Role 1 & Role 2 - Kiểm tra An ninh, Cổng Doanh nghiệp & Cổng Tra cứu Dân sự):**
   * Mở Cổng Doanh nghiệp `/doanh-nghiep/login`: Đăng nhập bằng tài khoản Chủ cơ sở vừa được cấp phát, đổi mật khẩu lần đầu, xem thông báo vi phạm và upload ảnh khắc phục.
   * Mở trang `/tra-cuu` (`FR-16` - không cần đăng nhập), tìm tên cơ sở vừa kiểm tra -> Hiển thị trạng thái *"Cần khắc phục PCCC"* trên bản đồ công khai, chứng minh không lộ SĐT chủ cơ sở, tài liệu nội bộ hay form đăng nhập quản trị.
