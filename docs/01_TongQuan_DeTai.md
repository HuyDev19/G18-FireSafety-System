# 01. TỔNG QUAN ĐỀ TÀI & ĐẶC TẢ NGHIỆP VỤ G1.8 (PCCC - GTEL OTS)

## 1. Thông tin chung & Bài toán
- **Tên đề tài:** Xây dựng hệ thống quản lý cơ sở thuộc diện kiểm tra phòng cháy, chữa cháy (PCCC) - Mã đề tài G1.8 (Hợp tác UTH – GTel OTS).
- **Loại sản phẩm:** Web Application Responsive (sử dụng trên PC và trình duyệt điện thoại), kiến trúc Modular Monolith (SPA + REST API).
- **Quy mô:** Cấp Tỉnh/Thành phố (Dữ liệu demo: 30–50 cơ sở giả lập có tọa độ thật; thiết kế chịu tải >= 1.000 cơ sở).
- **Chuỗi nghiệp vụ số hóa khép kín:**
  ```text
  [Cơ sở PCCC] ──> [Thiết bị PCCC + Hồ sơ pháp lý] ──> [Lịch kiểm tra] ──> [Checklist, Vi phạm & Sự cố]
       │                                                                             │
       └─────────────── [Điểm & Mức độ nguy hiểm (0-100đ, tự tính lại)] <────────────┘
       │
       └──> [Bản đồ số PCCC (Clustering/Heatmap)] & [Cổng Tra cứu Công khai cho Người dân]
  ```

---

## 2. Đối tượng sử dụng (5 Nhóm Actors)

| Vai trò (Code) | Đăng nhập | Phạm vi & Mục đích sử dụng chính |
| :--- | :---: | :--- |
| **`ADMIN`** | Có | Quản trị tài khoản người dùng, danh mục hệ thống, cấu hình và xem toàn bộ dữ liệu. |
| **`LEADER`** | Có | Lãnh đạo: Giám sát toàn địa bàn, tạo/phân công lịch kiểm tra, duyệt kết quả kiểm tra, xem báo cáo & Audit Log. |
| **`INSPECTOR`** | Có | Cán bộ kiểm tra: Quản lý cơ sở thuộc khu vực được giao, thực hiện kiểm tra theo Checklist, ghi nhận vi phạm/sự cố. |
| **`OWNER`** | Có (Tùy chọn) | Chủ cơ sở: Xem hồ sơ và lịch kiểm tra của cơ sở mình, gửi báo cáo/ảnh minh chứng khắc phục vi phạm. |
| **`PUBLIC`** | Không | Người dân: Tra cứu công khai thông tin cơ bản và tình trạng đáp ứng PCCC của cơ sở tại trang `/tra-cuu`. |

---

## 3. Danh sách 16 Module Chức năng & Thứ tự Ưu tiên (MVP First)

### 3.1. Nhóm Bắt buộc - MVP (Hoàn thành ổn định trước Tuần 6)
| Mã | Tên Module | Yêu cầu nghiệp vụ cốt lõi |
| :--- | :--- | :--- |
| **FR-01** | **Tài khoản & Phân quyền** | Đăng nhập email + mật khẩu (bcrypt), JWT Access + Refresh Token, khóa tạm 15 phút nếu sai mật khẩu 5 lần. Admin quản lý user, gán vai trò & khu vực phụ trách. |
| **FR-02** | **Quản lý Cơ sở PCCC** | Thêm/sửa/xóa mềm (`deletedAt`); tìm kiếm & lọc đa tiêu chí; chọn tọa độ trên bản đồ. Trang chi tiết cơ sở gồm 7 Tabs: *Thông tin chung · Thiết bị · Kiểm tra · Vi phạm · Sự cố · Hồ sơ · Bản đồ*. |
| **FR-03** | **Đánh giá Mức độ Nguy hiểm** | Tự động tính điểm rủi ro (0–100 điểm) và phân mức **Thấp / Trung bình / Cao** khi thêm/sửa cơ sở, đổi thiết bị, có kết quả kiểm tra hoặc vi phạm mới. Cho phép ghi đè thủ công kèm lý do (lưu `RiskAssessment` & `AuditLog`). |
| **FR-04** | **Quản lý Thiết bị PCCC** | Quản lý bình chữa cháy, báo khói, tủ báo cháy, bơm, đèn thoát hiểm... theo từng cơ sở. Tự động đánh dấu **Sắp hết hạn** (<= 30 ngày) và **Đã hết hạn** kiểm định; đối chiếu thiết bị bắt buộc theo loại cơ sở. |
| **FR-05** | **Quản lý Lịch kiểm tra** | Tạo/phân công lịch (Định kỳ / Đột xuất / Tái kiểm tra); gợi ý tần suất theo mức nguy hiểm (Cao: 3 tháng, Trung bình: 6 tháng, Thấp: 12 tháng). Xem dạng bảng & lịch tháng/tuần; tự đánh dấu quá hạn. |
| **FR-06** | **Kết quả Kiểm tra (Checklist)** | Mở từ lịch -> nạp Checklist theo nhóm tiêu chí -> đánh giá `Đạt / Không đạt / Không áp dụng` kèm ghi chú & ảnh minh chứng. Khi nộp: **tự sinh Vi phạm** cho tiêu chí `Không đạt`, tính lại điểm rủi ro, chờ `LEADER` duyệt. |
| **FR-07** | **Lịch sử Vi phạm & Sự cố** | Quản lý vòng đời Vi phạm (`OPEN` -> `FIXING` -> `RESOLVED` / `OVERDUE`) kèm căn cứ pháp lý, hạn khắc phục. Quản lý Sự cố (cháy, chập điện, rò rỉ, báo cháy giả) và hiển thị Timeline tổng hợp. |
| **FR-08** | **Hồ sơ Điện tử Pháp lý** | Upload PDF/JPG/PNG (<= 10MB) lên MinIO: Giấy thẩm duyệt, nghiệm thu, phương án chữa cháy, biên bản... Quản lý số văn bản, ngày cấp, **ngày hết hiệu lực**, quản lý phiên bản (version) và xem trước. |
| **FR-09** | **Bản đồ số PCCC (GIS)** | Hiển thị cơ sở theo màu mức nguy hiểm (Xanh/Vàng/Đỏ), gom cụm (**Marker Clustering**) khi zoom xa, bật/tắt Heatmap rủi ro. Lọc theo loại hình, mức nguy hiểm, quá hạn kiểm tra, vi phạm mở. |
| **FR-10** | **Báo cáo & Thống kê** | 7 báo cáo chuẩn: Cơ sở theo mức nguy hiểm/loại hình/khu vực; Cơ sở quá hạn; Kết quả kiểm tra; Tình trạng khắc phục vi phạm; Thiết bị hết hạn; Sự cố; Hiệu suất cán bộ. Hỗ trợ xuất Excel & PDF tiếng Việt. |

### 3.2. Nhóm Mở rộng - Nên có (Triển khai sau khi MVP ổn định)
| Mã | Tên Module | Yêu cầu nghiệp vụ cốt lõi |
| :--- | :--- | :--- |
| **FR-11** | **Dashboard Tổng quan** | Thẻ số liệu KPI (tổng cơ sở, nguy cơ cao, lịch quá hạn, vi phạm mở, thiết bị sắp hết hạn), biểu đồ ECharts và danh sách việc cần xử lý hôm nay theo từng vai trò. |
| **FR-12** | **Nhật ký Thao tác (Audit Log)** | Tự động ghi nhận ai, lúc nào, làm hành động gì, trên đối tượng nào, dữ liệu trước và sau (`beforeData`, `afterData` dạng JSON). |
| **FR-13** | **Nhập Cơ sở từ Excel** | Tải file mẫu -> Upload -> Kiểm tra hợp lệ từng dòng, báo dòng lỗi -> Xem trước -> Xác nhận nhập hàng loạt. |
| **FR-14** | **Cảnh báo Tự động** | Cronjob chạy 06:00 sáng hàng ngày quét lịch sắp đến hạn (7 ngày), thiết bị/hồ sơ hết hạn (30 ngày), vi phạm quá hạn để tạo thông báo trong ứng dụng. |
| **FR-15** | **In Biên bản Kiểm tra PDF** | Xuất biên bản kiểm tra chuẩn thể thức hành chính có đầy đủ thông tin cơ sở, bảng kết quả checklist, kiến nghị và **Mã QR trỏ tới biên bản trên hệ thống**. |
| **FR-16** | **Tra cứu Công khai (`/tra-cuu`)** | Trang không cần đăng nhập cho người dân tìm theo tên/địa chỉ/khu vực. Chỉ hiển thị: Tên, địa chỉ, loại hình, mức nguy hiểm, trạng thái đáp ứng PCCC, ngày kiểm tra gần nhất. **Tuyệt đối ẩn:** SĐT/Email chủ cơ sở, chi tiết vi phạm, hồ sơ. |

---

## 4. Công thức Tự động Tính Điểm Nguy hiểm Cháy nổ (FR-03: Thang 0 – 100 Điểm)

| Nhóm tiêu chí | Điểm tối đa | Quy tắc chấm điểm tự động (Cấu hình được) |
| :--- | :---: | :--- |
| **1. Loại hình & Tính chất hoạt động** | **30 điểm** | Kho hóa chất/xăng dầu: `30đ`; Nhà xưởng sản xuất: `22đ`; Karaoke, Chợ, TTTM: `20đ`; Chung cư, Trường học, Bệnh viện: `12đ`; Văn phòng nhỏ: `5đ`. |
| **2. Quy mô diện tích & Số tầng** | **20 điểm** | Diện tích < 300 m²: `5đ`; Từ 300–1.000 m²: `10đ`; Từ 1.000–5.000 m²: `15đ`; Trên 5.000 m² hoặc >= 7 tầng: `20đ`. |
| **3. Tình trạng Thiết bị PCCC** | **25 điểm** | Tính theo tỷ lệ thiếu thiết bị bắt buộc hoặc thiết bị hết hạn/hư hỏng nhân với 25 (Tối đa `25đ`). |
| **4. Lịch sử Vi phạm & Sự cố (12 tháng)** | **25 điểm** | Mỗi vi phạm nghiêm trọng: `+8đ`; Vi phạm thường: `+3đ`; Sự cố cháy nổ: `+10đ` (Cộng dồn tối đa `25đ`). |

* **Ngưỡng phân loại tự động:** `0 – 34 điểm`: **Thấp (`LOW` - Xanh)** · `35 – 64 điểm`: **Trung bình (`MEDIUM` - Vàng)** · `65 – 100 điểm`: **Cao (`HIGH` - Đỏ)**.
* *(Lưu ý: Cơ sở pháp lý đối chiếu theo Luật PCCC & CNCH 55/2024/QH15 và Nghị định 105/2025/NĐ-CP; bảng điểm là quy tắc cấu hình phục vụ demo và xác nhận với GTel OTS).*