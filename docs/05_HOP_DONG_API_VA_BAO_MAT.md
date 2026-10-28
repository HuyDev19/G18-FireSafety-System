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

*(Ghi chú: Kiểm tra quyền phải thực hiện ở cả `@RolesGuard` lẫn kiểm tra phạm vi dữ liệu `areaCode`/`assignedInspectorId` trong tầng Service).*

| Phân hệ (FR) | Method & Endpoint chính | Quyền được phép gọi | Ghi chú Hợp đồng Dữ liệu |
| :--- | :--- | :--- | :--- |
| **FR-01: Auth & Users** | `POST /api/auth/login`<br>`POST /api/auth/refresh`<br>`GET/POST/PATCH /api/users` | Public (Login)<br>`ADMIN` (Quản lý User) | Khóa tạm 15 phút nếu đăng nhập sai 5 lần liên tiếp. Không xóa cứng user đã có dữ liệu. |
| **FR-02 & 03: Cơ sở & Điểm Rủi ro** | `GET /api/facilities`<br>`GET /api/facilities/:id`<br>`POST/PATCH /api/facilities`<br>`POST /api/facilities/:id/override-risk`<br>`POST /api/facilities/import-excel` | Xem: `ADMIN`, `LEADER`, `INSPECTOR` (được giao), `OWNER` (của mình)<br>Tạo/Sửa: `ADMIN`, `INSPECTOR` | Khi tạo/sửa tự động gọi `calculateRiskScoreAndLevel` cập nhật `riskScore` (0-100) và `riskLevel` (`LOW`, `MEDIUM`, `HIGH`). |
| **FR-04: Thiết bị PCCC** | `GET /api/facilities/:id/equipments`<br>`POST/PATCH/DELETE /api/equipments` | `ADMIN`, `INSPECTOR` (Xem thêm: `LEADER`, `OWNER`) | Hỗ trợ query `?expiringWithinDays=30` để lọc thiết bị sắp hết hạn kiểm định. |
| **FR-05: Lịch Kiểm tra** | `GET /api/schedules`<br>`POST /api/schedules`<br>`PATCH /api/schedules/:id/status` | Tạo/Phân công: `ADMIN`, `LEADER`<br>Xem lịch được giao: `INSPECTOR` | Hỗ trợ lọc theo khoảng thời gian (hiển thị lịch tháng/tuần) và trạng thái quá hạn (`OVERDUE`). |
| **FR-06: Thực hiện Kiểm tra & Duyệt** | `GET /api/inspections/criteria`<br>`POST /api/inspections/:scheduleId/submit`<br>`PATCH /api/inspections/:id/approve` | Thực hiện & Nộp: `INSPECTOR`<br>Phê duyệt / Trả lại: `ADMIN`, `LEADER` | Khi `submit`: Lưu `InspectionItem`, **tự động sinh `Violation`** cho mục `FAIL`, tính lại điểm rủi ro. Khi `approve`: Khóa chỉnh sửa & ghi `AuditLog`. |
| **FR-07: Vi phạm & Sự cố** | `GET/POST/PATCH /api/violations`<br>`PATCH /api/violations/:id/resolve`<br>`GET/POST /api/incidents` | Ghi nhận: `ADMIN`, `INSPECTOR`<br>Báo cáo khắc phục: `OWNER`, `INSPECTOR` | Cập nhật khắc phục kèm ảnh minh chứng (`evidenceImageUrls`). Cung cấp API lấy Timeline tổng hợp của cơ sở. |
| **FR-08: Hồ sơ Điện tử** | `POST /api/documents/upload`<br>`GET /api/facilities/:id/documents` | Upload: `ADMIN`, `INSPECTOR`<br>Xem/Tải: `ADMIN`, `LEADER`, `INSPECTOR`, `OWNER` | Chỉ nhận file `PDF/JPG/PNG` <= 10MB, lưu vào MinIO bucket `pccc-files`, tăng `version` nếu tải bản mới. |
| **FR-09: Bản đồ số PCCC** | `GET /api/facilities/map-markers` | `ADMIN`, `LEADER`, `INSPECTOR` (phạm vi được giao) | Trả về mảng nhẹ gồm `id`, `code`, `name`, `latitude`, `longitude`, `riskScore`, `riskLevel`, `status`, `hasOpenViolation`. |
| **FR-10 & 11: Báo cáo & Dashboard** | `GET /api/reports/dashboard-summary`<br>`GET /api/reports/statistics`<br>`GET /api/reports/export-excel` | `ADMIN`, `LEADER`, `INSPECTOR` (theo phạm vi) | Tổng hợp số liệu KPI, biểu đồ xu hướng vi phạm và xuất file `.xlsx` tiếng Việt có dấu. |
| **FR-16: Tra cứu Công khai** | `GET /api/public/facilities` | `PUBLIC` (Không cần Token, có Rate Limit theo IP) | **Chỉ trả về:** `id`, `code`, `name`, `facilityTypeName`, `address`, `ward`, `district`, `latitude`, `longitude`, `riskLevel`, `complianceStatus`, `lastInspectedAt`. |

---

## 3. Checklist Bảo mật Bắt buộc (Security Checklist)
1. **Xác thực & Mật khẩu:** Mật khẩu băm bằng `bcrypt` (cost >= 10), tuyệt đối không trả `passwordHash` về trong bất kỳ API nào.
2. **Kiểm soát Truy cập Dữ liệu (IDOR Prevention):** Cán bộ (`INSPECTOR`) hoặc Chủ cơ sở (`OWNER`) truyền `facilityId` của cơ sở không thuộc quyền quản lý lên API phải bị chặn bằng mã lỗi `403 Forbidden` ngay tại tầng Service.
3. **Bảo vệ API Công khai (FR-16):** Áp dụng giới hạn tần suất (Rate Limiting) chống cào dữ liệu và dùng Prisma `select` tường minh để không bao giờ lộ SĐT, Email chủ cơ sở hay tài liệu nội bộ.
4. **Kiểm soát Tệp tải lên (FR-08):** Kiểm tra MIME type và kích thước <= 10MB, đổi tên file ngẫu nhiên trước khi lưu vào MinIO.

---

## 4. Kịch bản Demo Bảo vệ 10 Phút Trước Hội đồng GTEL OTS (5 Thành viên)

1. **Phút 1 – 2 (Role 3 & Role 2 - Quản lý Cơ sở & Chấm điểm Rủi ro Tự động):**
   * Đăng nhập tài khoản Cán bộ, tạo mới cơ sở (bấm chọn tọa độ trên bản đồ), thêm thiết bị PCCC và tải lên Hồ sơ thẩm duyệt PDF -> Hệ thống tự động chấm điểm rủi ro ban đầu là **58 điểm (Mức Trung bình - Màu Vàng)**.
2. **Phút 3 – 5 (Role 4 & Role 5 - Lập lịch, Kiểm tra Checklist & Tự sinh Vi phạm):**
   * Lãnh đạo tạo lịch phân công -> Cán bộ mở màn hình Kiểm tra trên điện thoại/tablet, đánh giá Checklist (tick `Không đạt` mục Lối thoát nạn, đính kèm ảnh chụp minh chứng) rồi bấm **Nộp** -> Lãnh đạo bấm **Duyệt**.
   * Hệ thống **tự động sinh bản ghi Vi phạm**, cộng điểm phạt làm điểm rủi ro nhảy lên **66 điểm (Tự động chuyển sang Mức Cao - Màu Đỏ)** và lưu vết vào `AuditLog`.
3. **Phút 6 – 7 (Role 1 - Bản đồ số PCCC):**
   * Mở Bản đồ số PCCC (`FR-09`), lọc các cơ sở có vi phạm mở -> Phóng tới cơ sở vừa chuyển sang **Chấm Đỏ**, trình diễn tính năng gom cụm (Clustering) 50 cơ sở và bật lớp **Heatmap rủi ro**.
4. **Phút 8 – 9 (Role 5 - Dashboard, Báo cáo Excel & In Biên bản PDF có QR):**
   * Mở Dashboard xem biểu đồ ECharts, xuất báo cáo thống kê ra file Excel và bấm **In Biên bản kiểm tra ra PDF có gắn mã QR** xác thực.
5. **Phút 9 – 10 (Role 1 - Cổng Tra cứu Công khai cho Người dân):**
   * Mở trang `/tra-cuu` (`FR-16` - không cần đăng nhập), tìm tên cơ sở vừa kiểm tra -> Hiển thị trạng thái *"Cần khắc phục PCCC"* trên bản đồ công khai, chứng minh không lộ SĐT chủ cơ sở hay hồ sơ mật.