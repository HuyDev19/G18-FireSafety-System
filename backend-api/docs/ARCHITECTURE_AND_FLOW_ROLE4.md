# BẢN ĐỀ XUẤT KIẾN TRÚC HẠ TẦNG CLOUD, CI/CD VÀ PHÂN TÍCH LUỒNG DỮ LIỆU (ROLE 4)

## 1. Đề xuất Kiến trúc Hạ tầng Cloud & CI/CD
- **Cơ sở dữ liệu đám mây (Cloud Database)**: 
  - Nền tảng: PostgreSQL 16 triển khai trên Neon Serverless (hoặc Supabase) tại vùng `ap-southeast-1` (Singapore).
  - Tiện ích mở rộng: Kích hoạt `CREATE EXTENSION IF NOT EXISTS postgis;` để xử lý tọa độ không gian địa lý (phục vụ cờ GPS khoảng cách 200m).
  - Bảo mật kết nối: Yêu cầu kết nối qua `DATABASE_URL` với chứng chỉ SSL (`sslmode=require`).
- **Object Storage (Lưu trữ tệp)**:
  - Nền tảng: MinIO / AWS S3 tương thích API S3 v4.
  - Bucket: `pccc-files` dùng chung cho toàn bộ hệ thống.
  - Ràng buộc: Kích thước tệp tối đa <= 10MB; chỉ chấp nhận các định dạng `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- **Quy trình CI/CD (GitHub Actions)**:
  - Kích hoạt tự động khi có thao tác Push hoặc mở Pull Request vào nhánh `main` và `develop`.
  - Quy trình chạy song song:
    + Backend CI: Chạy kiểm tra cú pháp TypeScript (`tsc --noEmit`), chạy Linter và tiến hành `npm run build`.
    + Frontend CI: Kiểm tra Linter và tiến hành build giao diện web.

## 2. Phân tích Luồng Dữ liệu (Data Flow) các Phân hệ Phụ trách
### A. Phân hệ Lập lịch kiểm tra (FR-05)
- **Lịch định kỳ (PERIODIC)**:
  - Khi cán bộ tạo lịch định kỳ, hệ thống kiểm tra ngày kiểm tra dự kiến (`scheduledDate`).
  - Ràng buộc nghiệp vụ: Ngày kiểm tra phải sau ngày tạo tối thiểu 3 ngày làm việc (không tính Thứ Bảy và Chủ Nhật).
- **Lịch đột xuất (SUDDEN)**:
  - Khởi tạo trực tiếp không bị ràng buộc thời gian 3 ngày làm việc, áp dụng cho các đợt thanh tra đột xuất hoặc có phản ánh vi phạm.
- **Cơ chế chú ý sự cố & Quét hạn tự động**:
  - Cronjob quét lúc 00:00 hằng ngày: Nếu lịch kiểm tra đến ngày hẹn mà chưa thực hiện sẽ tự động chuyển trạng thái `OVERDUE`.
  - Nếu cơ sở quá hạn kiểm tra hoặc biên bản kết luận FAILED, hệ thống tự động gán cờ cảnh báo rủi ro cao.

### B. Phân hệ Hồ sơ điện tử & Quản lý Tệp (FR-08)
- Tiếp nhận yêu cầu upload dạng `multipart/form-data`.
- Bộ lọc `FileInterceptor` kiểm tra header dung lượng <= 10MB và định dạng MIME.
- Sinh tên file duy nhất theo định dạng: `${Date.now()}-${uuid()}.${ext}`.
- Đẩy dữ liệu nhị phân lên bucket `pccc-files` của MinIO S3.
- Trả về đường dẫn truy cập tệp (File URL) để lưu trữ vào bảng cơ sở dữ liệu tương ứng.

### C. Phân hệ Vi phạm (FR-07)
- Liên kết trực tiếp với mã biên bản kiểm tra `inspection_id`.
- Khi kết quả kiểm tra là `FAILED`, hệ thống tạo hồ sơ vi phạm ghi nhận các lỗi an toàn PCCC, ấn định thời gian phải khắc phục và tự động lên lịch tái kiểm tra (+6 tháng với cơ sở HIGH, +12 tháng với cơ sở MEDIUM/LOW).cd backend-api