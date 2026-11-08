# BẢN KHẢO SÁT HẠ TẦNG CLOUD, CI/CD VÀ QUY HOẠCH CHI TIẾT PHÂN HỆ ROLE 4
**Mã Task:** G18-T2R4 | **Người thực hiện:** Võ Mạnh Huynh (Role 4)

---

## 1. KẾ HOẠCH CÁ NHÂN (WBS) & ĐỀ XUẤT TÀI KHOẢN CLOUD

### 1.1. Bảng phân rã công việc cá nhân (WBS)
- **Tuần 1 - 2 (Hiện tại):** Khảo sát hạ tầng Cloud, Docker Compose cục bộ, CI/CD Pipeline và quy hoạch chi tiết luồng nghiệp vụ Role 4.
- **Tuần 3 - 6:** Phát triển Backend module Lập lịch kiểm tra (FR-05) gồm các loại `PERIODIC`, `SURPRISE`, `REINSPECTION`. Thiết lập Cronjob tự động quét quá hạn (`OVERDUE`) lúc 06:00 sáng.
- **Tuần 7 - 10:** Phát triển Backend module Xử lý vi phạm (FR-07), xử lý tự động theo từng mục checklist FAILED với vòng đời `OPEN` -> `FIXING` -> `RESOLVED`.
- **Tuần 11 - 14:** Phát triển Backend module Hồ sơ điện tử & Quản lý Tệp (FR-08), tích hợp MinIO/S3 lưu trữ hình ảnh hiện trường và biên bản thẩm duyệt.
- **Tuần 15 - 16:** Kiểm thử tích hợp hệ thống, tối ưu hóa API và hoàn tất bàn giao.

### 1.2. Nhu cầu cung cấp tài khoản Cloud
- **Cloud Database (PostgreSQL 16 + PostGIS):** Đề xuất Trưởng nhóm cấp 01 tài khoản kết nối Supabase/Neon với quyền tạo và migrate bảng dữ liệu, kích hoạt extension PostGIS.
- **Object Storage (MinIO / S3):** Cấp quyền truy cập S3 Access Key / Secret Key có quyền thao tác trên bucket `pccc-files`.

---

## 2. BÁO CÁO KHẢO SÁT & ĐÁNH GIÁ GIẢI PHÁP HẠ TẦNG

### 2.1. Cơ sở dữ liệu đám mây (Cloud Database)
- **Phương án A: Supabase PostgreSQL (Được chọn cho Staging/Production):** Managed PostgreSQL 16 tại Singapore (`ap-southeast-1`), hỗ trợ sẵn PostGIS, kết nối SSL bắt buộc, tích hợp tốt với Prisma. *Rủi ro:* Giới hạn dung lượng free (500MB).
- **Phương án B: Neon Serverless Postgres:** Hỗ trợ tách nhánh (branching) tốt nhưng có độ trễ khởi động cụm serverless (cold start).
- **Phương án C: Docker Local (PostgreSQL 16 + PostGIS):** Được chọn dùng cho môi trường Dev cục bộ để kiểm thử tự động trên máy và qua CI/CD Pipeline.

### 2.2. Lưu trữ đối tượng (Object Storage)
- **Phương án A: MinIO Docker cục bộ (Được chọn cho giai đoạn Dev):** Hoàn toàn miễn phí, chuẩn giao tiếp AWS S3 API v4, cấu hình bucket `pccc-files` đơn giản.
- **Phương án B: AWS S3 Cloud (Được chọn cho Production):** Độ bền bỉ cao (99.999999999%), bảo mật mạnh mẽ. Dễ dàng chuyển đổi từ MinIO sang S3 chỉ bằng cách đổi biến môi trường Endpoint.

---

## 3. PHÂN TÍCH LUỒNG DỮ LIỆU ĐỒNG BỘ VỚI TÀI LIỆU NHÓM

### 3.1. Phân hệ Lập lịch kiểm tra (FR-05)
- **Phân loại lịch (Khớp schema.prisma):**
  - `PERIODIC`: Lịch định kỳ, ngày kiểm tra phải cách ngày tạo tối thiểu 3 ngày làm việc (không tính T7, CN).
  - `SURPRISE`: Lịch đột xuất khi có phản ánh hoặc thanh tra đột xuất.
  - `REINSPECTION`: Lịch tái kiểm tra lại cơ sở chưa đạt yêu cầu.
- **Cơ chế quét tự động (Khớp FR-14):**
  - Cronjob quét lúc **06:00 sáng hàng ngày**: Quét các lịch đến hạn mà chưa thực hiện để chuyển trạng thái sang `OVERDUE` và bắn thông báo nhắc nhở.
- **Chu kỳ kiểm tra định kỳ (Khớp tài liệu quy hoạch chung docs/01):**
  - Cơ sở nguy cơ Cao: 3 tháng / lần.
  - Cơ sở nguy cơ Trung bình: 6 tháng / lần.
  - Cơ sở nguy cơ Thấp: 12 tháng / lần.

### 3.2. Phân hệ Hồ sơ điện tử & Quản lý Tệp (FR-08)
- Tiếp nhận file qua `multipart/form-data`, giới hạn dung lượng $\le$ 10MB.
- **Định dạng cho phép:** Chỉ chấp nhận **PDF, JPG, PNG** (loại bỏ định dạng webp).
- **Đặt tên file:** Đặt tên bằng mã UUID ngẫu nhiên duy nhất để chống trùng lặp. Đẩy lên bucket `pccc-files` và trả URL lưu vào Database.

### 3.3. Phân hệ Vi phạm (FR-07)
- **Cơ chế phát sinh:** Tự động sinh bản ghi vi phạm cho **từng mục tiêu chí checklist bị FAILED** trong biên bản kiểm tra.
- **Vòng đời trạng thái vi phạm:** `OPEN` (mới ghi nhận) -> `FIXING` (đang sửa chữa) -> `RESOLVED` (nghiệm thu đạt yêu cầu và đóng vi phạm).