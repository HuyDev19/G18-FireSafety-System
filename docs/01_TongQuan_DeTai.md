# 01. TỔNG QUAN ĐỀ TÀI & ĐẶC TẢ NGHIỆP VỤ G1.8 (PCCC - GTEL OTS)

## 1. Thông tin chung & Bài toán
- **Tên đề tài:** Xây dựng hệ thống quản lý cơ sở thuộc diện kiểm tra phòng cháy, chữa cháy (PCCC) - Mã đề tài G1.8 (Hợp tác UTH – GTel OTS).
- **Loại sản phẩm:** Web Application Responsive (sử dụng trên PC và trình duyệt điện thoại), kiến trúc Modular Monolith (SPA + REST API).
- **Quy mô:** Cấp Tỉnh/Thành phố (Dữ liệu demo: 40 cơ sở giả lập có tọa độ thật tại TP.HCM; thiết kế chịu tải >= 1.000 cơ sở).
- **Chuỗi nghiệp vụ số hóa khép kín:**
  ```text
  [Cơ sở PCCC] ──> [Thiết bị PCCC + Hồ sơ pháp lý] ──> [Lịch kiểm tra] ──> [Checklist, Vi phạm & Sự cố]
       │                                                                             │
       └─────────────── [Điểm & Mức độ nguy hiểm (0-100đ, tự tính lại)] <────────────┘
       │
       └──> [Bản đồ số PCCC (Clustering/Heatmap)] & [Cổng Tra cứu Công khai cho Người dân]
  ```

---

## 2. Đối tượng sử dụng & Kiến trúc Phân tách Cổng Truy cập (3 Portals)

Để đảm bảo an toàn an ninh thông tin cấp Chính phủ (GovTech) và phù hợp mô hình tác nghiệp của lực lượng Cảnh sát PCCC, hệ thống **tuyệt đối không dùng chung một cổng đăng nhập duy nhất** mà phân tách độc lập thành 3 Cổng truy cập với chính sách an ninh phân tầng:

| Nhóm Cổng Truy cập | Đối tượng (Code) | Phương thức Cấp phát & Đăng nhập | Yêu cầu An toàn & Bảo mật GovTech |
| :--- | :--- | :--- | :--- |
| **1. Cổng Nghiệp vụ PCCC Nội bộ**<br>(`/admin-portal/login`) | **`ADMIN`**<br>**`LEADER`**<br>**`INSPECTOR`** | - Đăng nhập tài khoản nghiệp vụ do Quản trị hệ thống cấp phát.<br>- **Bắt buộc xác thực 2 bước (MFA / TOTP qua Google Authenticator)**.<br>- Cấp phát JWT Access + Refresh Token. | - **Kiểm soát vùng mạng:** Giới hạn qua VPN mạng truyền số liệu chuyên dùng ngành Công an hoặc IP Whitelist cơ quan.<br>- **Chống Brute-force:** Khóa tạm 15 phút nếu sai mật khẩu 5 lần liên tiếp.<br>- Phân quyền dữ liệu theo `areaCode` và vai trò RBAC. |
| **2. Cổng Doanh nghiệp & Cơ sở PCCC**<br>(`/doanh-nghiep/login`) | **`OWNER`**<br>*(Chủ cơ sở PCCC)* | - **TUYỆT ĐỐI CẤM TỰ ĐĂNG KÝ (No Self-Registration):** Tài khoản do Cán bộ PCCC trực tiếp khởi tạo & cấp phát (Identity Provisioning) khi thẩm duyệt, nghiệm thu hoặc đi kiểm tra thực tế cơ sở.<br>- Gắn chặt định danh duy nhất với `ownerUserId` của cơ sở. | - Mật khẩu khởi tạo ngẫu nhiên, **bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên** (`mustChangePassword = true`).<br>- Rate Limiting tối đa 5 lần thử/phút.<br>- Khóa tạm tài khoản 15 phút nếu sai 5 lần liên tiếp. |
| **3. Cổng Dân sự Tra cứu Công khai**<br>(`/tra-cuu`) | **`PUBLIC`**<br>*(Người dân, Doanh nghiệp)* | - Truy cập tự do qua Internet thông thường, **không cần tài khoản, không cần đăng nhập**. | - **Bảo vệ dữ liệu bí mật:** Dùng Prisma `select` tường minh, tuyệt đối ẩn SĐT, Email chủ cơ sở, biên bản nội bộ, tài liệu thẩm duyệt.<br>- Rate Limiting 30 req/phút/IP chống cào dữ liệu (Anti-Scraping). |

---

## 3. Danh sách 16 Module Chức năng & Thứ tự Ưu tiên (MVP First)

### 3.1. Nhóm Bắt buộc - MVP (Hoàn thành ổn định trước Tuần 6)
| Mã | Tên Module | Yêu cầu nghiệp vụ cốt lõi & Quy chuẩn An ninh GovTech |
| :--- | :--- | :--- |
| **FR-01** | **Tài khoản, Xác thực & Phân quyền GovTech** | - Phân tách 2 cổng đăng nhập riêng biệt (`/admin-portal` cho Cán bộ; `/doanh-nghiep` cho Chủ cơ sở).<br>- **Cơ chế Cấp phát Danh tính (Identity Provisioning):** Cấm endpoint tự đăng ký công khai (`/api/auth/register` bị vô hiệu hóa); Cán bộ PCCC/Admin cấp phát tài khoản Chủ cơ sở theo hồ sơ quản lý.<br>- **Xác thực Đa yếu tố (MFA/TOTP):** Bắt buộc đối với `ADMIN`, `LEADER` và `INSPECTOR`.<br>- **Chống Brute-force 3 lớp:** Rate Limit theo IP; Delay phản hồi từ lần sai thứ 3; Khóa tài khoản tạm thời 15 phút (`lockedUntil`) sau 5 lần sai; Tự động ghi cảnh báo an ninh vào `AuditLog`.<br>- Bắt buộc đổi mật khẩu lần đầu (`mustChangePassword`). Phân quyền dữ liệu RBAC + địa bàn phụ trách (`areaCode`). |
| **FR-02** | **Quản lý Cơ sở PCCC** | Thêm/sửa/xóa mềm (`deletedAt`); tìm kiếm & lọc đa tiêu chí; chọn tọa độ trên bản đồ. Trang chi tiết cơ sở gồm 7 Tabs: *Thông tin chung · Thiết bị · Kiểm tra · Vi phạm · Sự cố · Hồ sơ · Bản đồ*. Liên kết tài khoản chủ cơ sở (`ownerUserId`) và cán bộ phụ trách (`assignedInspectorId`). |
| **FR-03** | **Đánh giá Mức độ Nguy hiểm** | Tự động tính điểm rủi ro (0–100 điểm) và phân mức **Thấp / Trung bình / Cao** khi thêm/sửa cơ sở, đổi thiết bị, có kết quả kiểm tra hoặc vi phạm mới. Cho phép ghi đè thủ công kèm lý do (lưu `RiskAssessment` & `AuditLog`). |
| **FR-04** | **Quản lý Thiết bị PCCC** | Quản lý bình chữa cháy, báo khói, tủ báo cháy, bơm, đèn thoát hiểm... theo từng cơ sở. Tự động đánh dấu **Sắp hết hạn** (<= 30 ngày) và **Đã hết hạn** kiểm định; đối chiếu thiết bị bắt buộc theo loại cơ sở. |
| **FR-05** | **Quản lý Lịch kiểm tra** | Tạo/phân công lịch (Định kỳ / Đột xuất / Tái kiểm tra); gợi ý tần suất theo mức nguy hiểm (Cao: 3 tháng, Trung bình: 6 tháng, Thấp: 12 tháng). Xem dạng bảng & lịch tháng/tuần; tự đánh dấu quá hạn (`OVERDUE`). |
| **FR-06** | **Kết quả Kiểm tra (Checklist)** | Mở từ lịch -> nạp Checklist 16 tiêu chí theo nhóm & điều kiện áp dụng (tách riêng điểm Checklist lượt kiểm tra với điểm rủi ro FR-03) -> đánh giá `Đạt / Không đạt / Không áp dụng` kèm ghi chú & ảnh minh chứng. Cơ chế **tự lưu nháp vào `localStorage`** chống mất dữ liệu hiện trường. Khi nộp: sinh Vi phạm trạng thái chờ xác minh (`OPEN`/`PENDING_VERIFY`); khi `LEADER` duyệt mới chốt vi phạm & tính lại điểm rủi ro FR-03. |
| **FR-07** | **Lịch sử Vi phạm & Sự cố (Luồng 2 Bước)** | Quản lý vòng đời Vi phạm chuẩn BA: `OPEN` -> `FIXING` (Chủ cơ sở gửi ảnh báo cáo khắc phục) -> `RESOLVED` (Cán bộ nghiệm thu xác nhận đạt, tự động giảm điểm phạt) / `OVERDUE`. Quản lý Sự cố (cháy, chập điện, rò rỉ, báo cháy giả) và hiển thị Timeline tổng hợp. |
| **FR-08** | **Hồ sơ Điện tử Pháp lý** | Upload PDF/JPG/PNG (<= 10MB) lên MinIO: Giấy thẩm duyệt, nghiệm thu, phương án chữa cháy, biên bản... Quản lý số văn bản, ngày cấp, **ngày hết hiệu lực**, quản lý phiên bản (version) và xem trước. |
| **FR-09** | **Bản đồ số PCCC (GIS)** | Hiển thị cơ sở theo màu mức nguy hiểm (Xanh/Vàng/Đỏ), gom cụm (**Marker Clustering**) khi zoom xa, bật/tắt Heatmap rủi ro. Lọc theo loại hình, mức nguy hiểm, quá hạn kiểm tra, vi phạm mở. |
| **FR-10** | **Báo cáo & Thống kê** | 7 báo cáo chuẩn: Cơ sở theo mức nguy hiểm/loại hình/khu vực; Cơ sở quá hạn; Kết quả kiểm tra; Tình trạng khắc phục vi phạm; Thiết bị hết hạn; Sự cố; Hiệu suất cán bộ. Hỗ trợ xuất Excel & PDF tiếng Việt có dấu. |

### 3.2. Nhóm Mở rộng - Nên có (Triển khai sau khi MVP ổn định)
| Mã | Tên Module | Yêu cầu nghiệp vụ cốt lõi |
| :--- | :--- | :--- |
| **FR-11** | **Dashboard Tổng quan** | Thẻ số liệu KPI (tổng cơ sở, nguy cơ cao, lịch quá hạn, vi phạm mở, thiết bị sắp hết hạn), biểu đồ ECharts và danh sách việc cần xử lý hôm nay theo từng vai trò. |
| **FR-12** | **Nhật ký Thao tác (Audit Log)** | Tự động ghi nhận ai, lúc nào, làm hành động gì, trên đối tượng nào, dữ liệu trước và sau (`beforeData`, `afterData` dạng JSON), địa chỉ IP, và ghi nhận sự kiện tấn công đăng nhập bất thường. |
| **FR-13** | **Nhập Cơ sở từ Excel** | Tải file mẫu -> Upload -> Kiểm tra hợp lệ từng dòng, báo dòng lỗi -> Xem trước -> Xác nhận nhập hàng loạt. |
| **FR-14** | **Cảnh báo Tự động** | Cronjob chạy 06:00 sáng hàng ngày quét lịch sắp đến hạn (7 ngày), thiết bị/hồ sơ hết hạn (30 ngày), vi phạm quá hạn để tạo thông báo trong ứng dụng. |
| **FR-15** | **In Biên bản Kiểm tra PDF** | Xuất biên bản kiểm tra chuẩn thể thức hành chính theo **Mẫu PC03 (Cán bộ kiểm tra) / Mẫu PC02 (Chủ cơ sở tự kiểm tra)** của NĐ 105/2025/NĐ-CP; kèm bảng kết quả checklist, kiến nghị và **Mã QR xác thực kèm SHA-256 hash** (người ngoài quét QR chỉ xem được thẻ xác thực hợp lệ, ẩn toàn bộ chi tiết vi phạm nội bộ). |
| **FR-16** | **Tra cứu Công khai (`/tra-cuu`)** | Trang không cần đăng nhập cho người dân tìm theo tên/địa chỉ/khu vực. Chỉ hiển thị: Tên, địa chỉ, loại hình, mức nguy hiểm, trạng thái đáp ứng PCCC, ngày kiểm tra gần nhất. **Tuyệt đối ẩn:** SĐT/Email chủ cơ sở, chi tiết vi phạm, hồ sơ mật. |

---

## 4. Công thức Tự động Tính Điểm Nguy hiểm Cháy nổ (FR-03: Thang 0 – 100 Điểm)

| Nhóm tiêu chí | Điểm tối đa | Quy tắc chấm điểm tự động (Cấu hình được) |
| :--- | :---: | :--- |
| **1. Loại hình & Tính chất hoạt động** | **30 điểm** | Kho hóa chất/xăng dầu: `30đ`; Nhà xưởng sản xuất: `22đ`; Karaoke, Chợ, TTTM: `20đ`; Chung cư, Trường học, Bệnh viện: `12đ`; Văn phòng nhỏ: `5đ`. |
| **2. Quy mô diện tích & Số tầng** | **20 điểm** | Diện tích < 300 m²: `5đ`; Từ 300–1.000 m²: `10đ`; Từ 1.000–5.000 m²: `15đ`; Trên 5.000 m² hoặc >= 7 tầng: `20đ`. |
| **3. Tình trạng Thiết bị PCCC** | **25 điểm** | Tính theo tỷ lệ thiếu thiết bị bắt buộc hoặc thiết bị hết hạn/hư hỏng nhân với 25 (Tối đa `25đ`). |
| **4. Lịch sử Vi phạm & Sự cố (12 tháng)** | **25 điểm** | Mỗi vi phạm nghiêm trọng: `+8đ`; Vi phạm thường: `+3đ`; Sự cố cháy nổ: `+10đ` (Cộng dồn tối đa `25đ`). |

* **Ngưỡng phân loại tự động:** `0 – 34 điểm`: **Thấp (`LOW` - Xanh)** · `35 – 64 điểm`: **Trung bình (`MEDIUM` - Vàng)** · `65 – 100 điểm`: **Cao (`HIGH` - Đỏ)**.
* *(Lưu ý: Cơ sở pháp lý đối chiếu theo **Luật PCCC & CNCH 55/2024/QH15**, **Nghị định 105/2025/NĐ-CP**, **Nghị định 106/2025/NĐ-CP**, **Nghị định 69/2026/NĐ-CP** và **Nghị định 347/2026/NĐ-CP** [thay thế NĐ 136/2020/NĐ-CP]; bảng điểm FR-03 và khung phạt tham chiếu là quy tắc cấu hình nội bộ phục vụ demo và xác nhận với GTel OTS).*
---

## 5. Phân tích Nghiệp vụ Biểu mẫu Phụ lục VIII (Nghị định 105/2025/NĐ-CP)

Căn cứ **Phụ lục VIII Nghị định số 105/2025/NĐ-CP** (hướng dẫn thi hành Luật PCCC & CNCH số 55/2024/QH15), hệ thống chuẩn hóa và phân định rõ 3 biểu mẫu nghiệp vụ cốt lõi, xác định rõ nguồn dữ liệu kế thừa và phát sinh:

### 5.1. Tổng quan 3 Biểu mẫu Cốt lõi Phụ lục VIII

| Mã Mẫu | Tên Biểu Mẫu | Chủ thể thực hiện | Mục đích & Chu kỳ | Tương tác trên Hệ thống G1.8 |
| :---: | :--- | :--- | :--- | :--- |
| **PC01** | **Phiếu thông tin cơ sở phục vụ quản lý về PCCC & CNCH** | Chủ cơ sở khai báo / Cán bộ PC07 số hóa | Thu thập hồ sơ định danh ban đầu khi đưa cơ sở vào diện quản lý hoặc thay đổi quy mô. | Tự động sinh từ bảng `Facility`, `FacilityType`, `Document` & `Equipment`. Hỗ trợ nhập hàng loạt qua Excel (FR-13). |
| **PC02** | **Biên bản tự kiểm tra an toàn PCCC** | Người đứng đầu cơ sở (`OWNER`) tự tổ chức | Tự rà soát an toàn định kỳ (tháng/quý) và lưu trữ hồ sơ PCCC tại chỗ. | Doanh nghiệp thực hiện trên Cổng Doanh nghiệp (`/doanh-nghiep`), tự đánh giá 16 tiêu chí, tự lên kế hoạch bảo trì thiết bị (không phạt VPHC). |
| **PC03** | **Biên bản kiểm tra an toàn PCCC** | Đoàn kiểm tra Công an PCCC (`INSPECTOR`) | Cơ quan chức năng kiểm tra định kỳ (1–2 năm/lần) hoặc đột xuất. | Cán bộ lập tại hiện trường (FR-06), Lãnh đạo duyệt (FR-07), tự sinh `Violation` khi `FAIL`, trigger tính rủi ro FR-03, xuất PDF có QR SHA-256 (FR-15). |

---

### 5.2. Bảng Bóc tách Chi tiết Biểu mẫu PC01 & PC02

#### A. Mẫu PC01 — Phiếu Thông Tin Cơ Sở
* **1. Thông tin định danh:** Tên cơ sở, mã số thuế, họ tên người đại diện pháp luật, số CCCD/CMND, điện thoại, email $\rightarrow$ Lưu tại `Facility.name`, `Facility.ownerName`, `Facility.ownerPhone`, `User` (role `OWNER`).
* **2. Địa điểm & Tọa độ:** Số nhà, tên đường, phường/xã, quận/huyện, tọa độ địa lý GPS $\rightarrow$ Lưu tại `Facility.address`, `ward`, `district`, `province`, `lat`, `lng` (chuẩn PostGIS không gian).
* **3. Quy mô kiến trúc & Công năng:** Loại hình cơ sở (`FacilityType`), diện tích đất, tổng diện tích sàn (`areaM2`), số tầng nổi (`floors`), số tầng hầm, chiều cao (`heightM`), bậc chịu lửa $\rightarrow$ Thuộc tính bảng `Facility`.
* **4. Hồ sơ văn bản pháp lý PCCC:** Giấy chứng nhận thẩm duyệt thiết kế, văn bản nghiệm thu về PCCC, phương án chữa cháy được phê duyệt $\rightarrow$ Bảng `Document` (`docType: DESIGN_APPROVAL, ACCEPTANCE, FIRE_PLAN`).
* **5. Phương tiện PCCC trang bị:** Hệ thống báo cháy tự động, hệ thống chữa cháy vách tường, sprinkler, số lượng bình chữa cháy $\rightarrow$ Bảng `Equipment` (số lượng, vị trí, tình trạng).
* **6. Lực lượng PCCC tại chỗ:** Đội PCCC cơ sở/chuyên ngành, số lượng đội viên đã qua tập huấn nghiệp vụ $\rightarrow$ Quản trị trong hồ sơ `Facility`.

#### B. Mẫu PC02 — Biên Bản Tự Kiểm Tra An Toàn PCCC
* **1. Cơ quan/Doanh nghiệp tự kiểm tra:** Tự động điền từ thông tin `Facility` đã đăng ký.
* **2. Thời điểm tự kiểm tra:** Ghi nhận `startedAt` và `finishedAt` khi chủ cơ sở mở phiếu trên ứng dụng.
* **3. Thành phần làm việc:** Người đứng đầu cơ sở (hoặc người được ủy quyền), Đội trưởng Đội PCCC cơ sở, Cán bộ phụ trách an toàn $\rightarrow$ Lưu mảng đối tượng tham gia.
* **4. Kết quả tự rà soát 16 tiêu chí:** Tự chấm Đạt/Không đạt/Không áp dụng (`InspectionItem`).
* **5. Tồn tại tự phát hiện & Biện pháp tự khắc phục:** Bình chữa cháy tụt áp, đèn sự cố hỏng $\rightarrow$ Tự động chuyển trạng thái `Equipment.status = NEEDS_MAINTENANCE` để lên lịch nạp sạc/thay mới (phân biệt rõ với Vi phạm hành chính do Công an xử phạt).
* **6. Ký lưu hồ sơ:** Người đứng đầu cơ sở ký xác nhận và tải lên bản PDF lưu tại mục Hồ sơ PCCC điện tử.

---

### 5.3. Bảng Đối Chiếu Chi Tiết Từng Vị Trí Trên Biểu Mẫu Trọng Tâm PC03 (Theo R5-02)

Dựa trên kết quả rà soát thực tế quy chuẩn biểu mẫu hành chính PC03 (tài liệu kỹ thuật `R5-02.md`), nhóm bóc tách toàn bộ 16 vị trí cần điền trên phôi mẫu đối chiếu với CSDL G1.8:

| Vị trí trên Mẫu PC03 | Thông tin cần điền thực tế | Thuộc tính đối chiếu CSDL G1.8 | Đánh giá mức độ đáp ứng CSDL |
| :---: | :--- | :--- | :--- |
| **(1)** | Cơ quan cấp trên trực tiếp | `Inspection.parentAgencyName` *(Đề xuất)* | Cán bộ chọn/nhập (VD: CÔNG AN TP. HỒ CHÍ MINH) |
| **(2)** | Cơ quan/tổ chức chủ trì kiểm tra | `Inspection.inspectingAgencyName` *(Đề xuất)* | Tự điền đơn vị của cán bộ (VD: PHÒNG CẢNH SÁT PCCC VÀ CNCH) |
| **Thời điểm bắt đầu** | Hồi … giờ … ngày … tháng … năm … | `Inspection.startedAt` | **Có sẵn 100%**; tự động điền thời gian bắt đầu làm việc |
| **Nơi kiểm tra** | Tại cơ sở … | `Facility.name` (qua `Inspection.facilityId`) | **Có sẵn 100%**; tự động trích xuất từ hồ sơ cơ sở |
| **Địa chỉ nơi kiểm tra**| Địa chỉ: … | `Facility.address`, `ward`, `district` | **Có sẵn 100%**; tự động trích xuất từ bảng `Facility` |
| **Đại diện phía đoàn** | Cơ quan/đơn vị mà người kiểm tra đại diện | Tái sử dụng đơn vị chủ trì (2) | **Có sẵn**; gắn theo tài khoản cán bộ |
| **Cán bộ kiểm tra** | Ông/bà …; chức vụ … (phía đoàn) | `Inspection.inspectorId` $\rightarrow$ `User.fullName` | **Có sẵn họ tên**; chức vụ lấy từ `User.role` hoặc chức danh |
| **Thành viên đoàn** | Các thành viên khác và chức vụ | `Inspection.attendees` (Mảng cán bộ cùng đi) | **Có sẵn trong thiết kế**; lưu danh sách họ tên, chức danh |
| **(3)** | Tên đối tượng được kiểm tra | `Facility.name` | **Có sẵn 100%**; tự động điền |
| **(4)** | Tổ chức/cá nhân trực tiếp quản lý | `Facility.ownerName`, `ownerUserId` | **Có sẵn 100%**; người đứng đầu cơ sở |
| **Đại diện cơ sở** | Ông/bà …; chức vụ … (phía cơ sở) | `Inspection.representativeName`, `representativeTitle` | **Có sẵn trong thiết kế**; ghi nhận người trực tiếp làm việc |
| **(5) - Cơ sở trình bày** | Ý kiến cơ sở về công tác PCCC | `Inspection.facilityStatement` *(Đề xuất)* | Cán bộ ghi nhận tóm tắt nội dung báo cáo của cơ sở |
| **(5) - Kết quả kiểm tra**| Tình trạng 16 tiêu chí, sơ hở, vi phạm | `InspectionItem.status`, `Violation.description` | **Có sẵn 100%**; tổng hợp tự động từ kết quả chấm checklist |
| **(5) - Khắc phục cũ** | Kết quả khắc phục kiến nghị lần trước | `Violation.status = RESOLVED`, `resolutionNote` | **Có sẵn 100%**; trích xuất lịch sử vi phạm đã đóng |
| **(6) - Kiến nghị** | Biện pháp yêu cầu cơ sở thực hiện | `Inspection.recommendation`, `remediationDeadline`| **Có sẵn 100%**; cán bộ nhập nội dung chỉ đạo khắc phục |
| **Thời điểm hoàn tất** | Biên bản lập xong hồi … giờ … ngày … | `Inspection.finishedAt` *(hoặc `submittedAt`)* | **Có sẵn**; ghi nhận thời điểm hoàn tất và ký biên bản |
| **Số trang, số bản** | Gồm … trang, lập thành … bản | Hệ thống tự đếm khi dàn trang PDF | Không cần thêm cột DB; tự tính toán khi render PDF |
| **Vị trí ký (7)(8)(9)** | Đại diện cơ sở, người liên quan, đoàn KT | Chừa chỗ ký trên bản in / Gắn mã QR SHA-256 | Đạt chuẩn thể thức hành chính Nhà nước |

---

### 5.4. Ví dụ Thực Tế Minh Họa Phôi In PC03 Chuẩn: Công ty CP Sản xuất Nhựa Duy Tân

Dựa trên dataset thực tế của nhóm tại địa bàn TP.HCM (Mã cơ sở: **`CS-HCM-BTA-001`**, Địa chỉ: **298 Hồ Học Lãm, Phường An Lạc, Quận Bình Tân**), mẫu in biên bản PC03 được kết xuất tự động như sau:

```text
       CÔNG AN TP. HỒ CHÍ MINH                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
PHÒNG CẢNH SÁT PCCC VÀ CNCH                     Độc lập - Tự do - Hạnh phúc
         ─────────────                                   ─────────────

                                 BIÊN BẢN KIỂM TRA
                           Về phòng cháy, chữa cháy
                                 ─────────────

Hồi 08 giờ 30 ngày 19 tháng 11 năm 2026, tại Công ty Cổ phần Sản xuất Nhựa Duy Tân.
Địa chỉ: 298 Hồ Học Lãm, phường An Lạc, quận Bình Tân, Thành phố Hồ Chí Minh.
Chúng tôi gồm:
Đại diện: Phòng Cảnh sát PCCC và CNCH – Công an Thành phố Hồ Chí Minh
- Ông: NGUYỄN VĂN A   - Chức vụ: Đội trưởng – Trưởng đoàn kiểm tra
- Bà:  TRẦN THỊ B     - Chức vụ: Cán bộ Đội Công tác PCCC
Đã tiến hành kiểm tra về phòng cháy, chữa cháy đối với: Công ty Cổ phần Sản xuất Nhựa Duy Tân.
Đại diện: Công ty Cổ phần Sản xuất Nhựa Duy Tân
- Ông: LÊ VĂN C       - Chức vụ: Tổng Giám đốc
- Bà:  PHẠM THỊ D     - Chức vụ: Trưởng phòng Hành chính – An toàn

1. Nội dung và kết quả kiểm tra:
Đại diện Công ty trình bày tóm tắt việc thực hiện quy định PCCC. Đoàn kiểm tra đối soát thực tế 16 tiêu chí:
- Hệ thống báo cháy tự động, họng nước chữa cháy vách tường: ĐẠT
- Lối thoát nạn, khoảng cách ngăn cháy: ĐẠT
- Tồn tại vi phạm: 04 bình chữa cháy bột ABC 8kg tại xưởng ép định hình đã hết hạn kiểm định áp suất (Không đạt Tiêu chí TC-04; Căn cứ Khoản 2 Điều 10 Nghị định 106/2025/NĐ-CP).

2. Kiến nghị và biện pháp xử lý:
- Yêu cầu người đứng đầu cơ sở tổ chức nạp sạc, kiểm định lại toàn bộ bình chữa cháy hết hạn; hoàn thành trước ngày 26/11/2026 và nộp ảnh minh chứng khắc phục qua Cổng Doanh nghiệp.

Biên bản lập xong hồi 11 giờ 30 cùng ngày, gồm 02 trang, lập thành 03 bản, mỗi bên giữ 01 bản.
[Kèm Mã QR SHA-256 Xác Thực Tính Toàn Vẹn Biên Bản Điện Tử - FR-15]

   ĐẠI DIỆN CƠ SỞ                    NGƯỜI CÓ LIÊN QUAN                ĐẠI DIỆN ĐOÀN KIỂM TRA
 (Ký, đóng dấu, ghi rõ họ tên)       (Ký, ghi rõ họ tên)           (Ký, ghi rõ họ tên, chức vụ)
          LÊ VĂN C                       PHẠM THỊ D                         NGUYỄN VĂN A
```

---

## 6. Kịch bản Mẫu Minh Họa Trọn Luồng 4 Bước (End-to-End Scenario Walkthrough)

Để chứng minh tính nhất quán giữa **Yêu cầu nghiệp vụ ↔ CSDL Schema ↔ Giao diện Prototype**, hệ thống thiết lập kịch bản thực tế khép kín sau:

* **Đối tượng giả lập:** Cơ sở *"Xưởng Dệt May An Lạc"* (Mã: `CS-BT-001`, Địa chỉ: Quận Bình Tân, Loại hình: Nhà máy sản xuất, Điểm rủi ro ban đầu: `40/100` - Mức `MEDIUM`).
* **Hành vi vi phạm giả lập:** *"Bình chữa cháy bột ABC 8kg hết hạn kiểm định áp suất khí đẩy"* (Vi phạm Tiêu chí TC-04, tham chiếu Nghị định 106/2025/NĐ-CP).

```text
[BƯỚC 1: LẬP & DUYỆT PC03] ──> [BƯỚC 2: CHỦ CƠ SỞ NỘP ẢNH] ──> [BƯỚC 3: NGHIỆM THU ĐẠT] ──> [BƯỚC 4: HỆ THỐNG GIẢM ĐIỂM]
 Cán bộ lập, Lãnh đạo duyệt        Chủ cơ sở gửi ảnh bình mới          Cán bộ xác nhận hoàn thành         Điểm rủi ro hạ từ 70đ
 Vi phạm chuyển OPEN               Vi phạm chuyển FIXING             Vi phạm chuyển RESOLVED            về 40đ (MEDIUM)
 Điểm rủi ro tăng 40đ -> 70đ (HIGH) File lưu MinIO + Metadata         Lưu vết AuditLog                   Ghi RiskScoreHistory
```

### Chi tiết 4 Bước Thực thi:
1. **Bước 1: Cán bộ lập và duyệt Biên bản kiểm tra PC03**
   * *Ai thao tác:* Cán bộ PCCC (`INSPECTOR`) lập biên bản tại hiện trường → Lãnh đạo (`LEADER`) bấm duyệt.
   * *Dữ liệu thay đổi:* 
     - Bản ghi `Inspection` chuyển `status: "APPROVED"`.
     - Tự động sinh 1 bản ghi `Violation` (ID: `vio-001`, `status: "OPEN"`, `deadline: 2026-11-25`).
     - Hệ thống kích hoạt Engine tính điểm: Điểm phạt vi phạm `+30đ`. Cập nhật `Facility.riskScore = 70` (Mức rủi ro chuyển thành `HIGH` - Báo động đỏ).
     - Ghi nhận 1 bản ghi vào `RiskScoreHistory` (Lý do: *"Phát hiện vi phạm bình chữa cháy theo Biên bản PC03"*).
   * *Quy tắc áp dụng:* Quy tắc kích hoạt FR-03 (Trigger Event on `Inspection.APPROVED`).

2. **Bước 2: Chủ cơ sở nộp ảnh minh chứng khắc phục qua Cổng Doanh nghiệp**
   * *Ai thao tác:* Chủ cơ sở (`OWNER`) đăng nhập tại `/doanh-nghiep/login`, vào mục Vi phạm, bấm *"Báo cáo khắc phục"*.
   * *Dữ liệu thay đổi:*
     - Tải ảnh chụp biên bản nạp bình và tem kiểm định mới lên MinIO bucket `pccc-documents`.
     - Tạo bản ghi `ViolationEvidence` (ID: `evi-001`, `violationId: "vio-001"`, `uploadedById: user.id`, `uploadedByRole: "OWNER"`, `accessLevel: "OWNER_AND_STAFF"`).
     - Bản ghi `Violation` chuyển `status: "FIXING"` (Chờ nghiệm thu).
   * *Quy tắc áp dụng:* Phân quyền quản lý tài liệu FR-08 (Chỉ Cán bộ địa bàn và Chủ cơ sở mới có quyền xem ảnh minh chứng qua Presigned URL).

3. **Bước 3: Cán bộ PCCC xác nhận kết quả nghiệm thu**
   * *Ai thao tác:* Cán bộ PCCC phụ trách địa bàn (`INSPECTOR`) kiểm tra đối soát ảnh hoặc tái kiểm hiện trường → Bấm *"Xác nhận đã khắc phục"*.
   * *Dữ liệu thay đổi:*
     - Bản ghi `Violation` chuyển `status: "RESOLVED"`, ghi nhận `resolvedAt = NOW()`, `resolutionNote: "Đã thay mới 04 bình chữa cháy đạt chuẩn"`.
     - Ghi vết hành chính vào `AuditLog`.
   * *Quy tắc áp dụng:* Quy tắc đóng vi phạm FR-07.

4. **Bước 4: Hệ thống tự động cập nhật giảm điểm rủi ro**
   * *Ai thao tác:* Hệ thống chạy tự động ngầm (System Automated Job).
   * *Dữ liệu thay đổi:*
     - Thuật toán trừ `30đ` điểm phạt của vi phạm đã giải quyết.
     - Điểm số cơ sở hạ từ `70đ` về `40đ` → Mức rủi ro tự động chuyển từ `HIGH` (Đỏ) xuống `MEDIUM` (Vàng).
     - Ghi bản ghi vào `RiskScoreHistory`: `scoreBefore: 70`, `scoreAfter: 40`, `changeReason: "Nghiệm thu khắc phục hoàn thành vi phạm vio-001"`.
     - Cập nhật màu Marker trên Bản đồ số GIS (FR-09) chuyển từ Đỏ sang Vàng.

---

## 7. Quy tắc Phân nhóm Nguy cơ Cơ sở A–E (Giả định Nghiệp vụ)

Phục vụ việc thiết kế CSDL và tham vấn chuyên môn với Mentor GTel OTS, hệ thống thiết lập giả định phân loại 5 nhóm cơ sở (Nhóm A đến Nhóm E) dựa trên tính chất cháy nổ và quy mô tập trung đông người:

| Nhóm | Tên Phân loại Giả định | Loại hình Tiêu biểu | Tiêu chí Định lượng Giả định | Tần suất Kiểm tra Định kỳ |
| :---: | :--- | :--- | :--- | :---: |
| **Nhóm A** | **Nguy cơ Cháy nổ Đặc biệt Cao** | Kho xăng dầu, hóa chất, nhà máy sơn, kho pháo hoa, vũ trường, quán bar ngầm | Tồn trữ > 50 tấn chất dễ cháy hoặc sức chứa ngầm > 200 người | **3 tháng / lần** (4 lần/năm) |
| **Nhóm B** | **Nguy cơ Cháy nổ Cao** | TTTM, Chợ kiên cố, Chung cư cao tầng (>= 10 tầng), Xưởng gỗ, Xưởng may lớn | Diện tích sàn > 3.000 m² hoặc cao từ 28m trở lên | **6 tháng / lần** (2 lần/năm) |
| **Nhóm C** | **Nguy cơ Cháy nổ Trung bình** | Khách sạn, Bệnh viện, Trường học, Tòa nhà văn phòng, Kho bãi thông thường | Diện tích từ 1.000 – 3.000 m², cao dưới 28m | **12 tháng / lần** (1 lần/năm) |
| **Nhóm D** | **Nguy cơ Cháy nổ Thấp** | Trụ sở hành chính, cửa hàng bán lẻ nhỏ, xưởng thủ công không dùng nhiệt | Diện tích từ 300 – 1.000 m² | **24 tháng / lần** (Theo kế hoạch) |
| **Nhóm E** | **Cơ sở diện Tự kiểm tra** | Hộ kinh doanh cá thể nhỏ lẻ, nhà ở kết hợp kinh doanh nhỏ | Diện tích sàn < 300 m² | Cơ sở tự lập **Biên bản PC02** hàng năm |
