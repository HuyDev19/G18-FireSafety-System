# 02. KIẾN TRÚC HỆ THỐNG, CẤU TRÚC THƯ MỤC & CÀI ĐẶT HẠ TẦNG

## 1. Sơ đồ Kiến trúc Tổng quan 4 Tầng Phân Tách An Toàn (GovTech Architecture)

```text
====================================================================================================
 TẦNG 1: 3 PHÂN VÙNG MẠNG & 3 CỔNG TRUY CẬP PHÂN TÁCH (NETWORK SEGMENTATION)
====================================================================================================
  [ VÙNG NỘI BỘ NGÀNH PCCC ]        [ VÙNG CƠ SỞ / DOANH NGHIỆP ]      [ VÙNG DÂN SỰ CÔNG KHAI ]
  (Admin, Lãnh đạo, Cán bộ)         (Chủ cơ sở - Cấp phát tài khoản)   (Người dân không cần Login)
            |                                      |                               |
            v                                      v                               v
    [ VPN / IP Whitelist ]                 [ Internet / WAF ]             [ Internet / WAF ]
            |                                      |                               |
            v                                      v                               v
   /admin-portal/login                   /doanh-nghiep/login                   /tra-cuu
  (Bắt buộc Mật khẩu + MFA)             (Tài khoản được cấp phát)       (Chỉ đọc, Rate Limit 30r/m)
            |                                      |                               |
            +--------------------------------------+-------------------------------+
                                                   | HTTPS (Nginx Reverse Proxy & WAF)
                                                   v
====================================================================================================
 TẦNG 2: GIAO DIỆN PHÍA CLIENT (FRONTEND: React 18 + Vite + TypeScript + Tailwind + React Query)
         Chạy tại: http://localhost:5173
====================================================================================================
  +------------------------------+  +--------------------------------+  +--------------------------+
  | BẢN ĐỒ SỐ & TRA CỨU CÔNG KHAI|  | QUẢN LÝ HỒ SƠ, THIẾT BỊ & LỊCH |  | KIỂM TRA, DASHBOARD & PDF|
  |     [Phụ trách: ROLE 1]      |  |      [Phụ trách: ROLE 2]       |  |    [Phụ trách: ROLE 5]   |
  +------------------------------+  +--------------------------------+  +--------------------------+
  | • Bản đồ PCCC (FR-09):       |  | • 2 Form Login tách biệt:      |  | • Checklist Kiểm tra &   |
  |   Clustering, Heatmap, Lọc   |  |   - Cán bộ (/admin-portal)     |  |   Lãnh đạo Duyệt (FR-06) |
  | • Chọn tọa độ trên bản đồ    |  |   - Doanh nghiệp (/doanh-nghiep|  | • Timeline Vi phạm/Sự cố |
  | • Cổng Tra cứu Công khai cho |  | • Quản trị User & Cấp tài khoản|  | • In Biên bản PDF có QR  |
  |   Người dân (/tra-cuu FR-16) |  | • Bảng Cơ sở & Chi tiết 7 Tabs |  | • Dashboard & 7 Báo cáo  |
  +--------------+---------------+  +---------------+----------------+  +-------------+------------+
                 |                                  |                                 |
                 +----------------------------------+---------------------------------+
                                                    |
                            [ Trạm trung chuyển: src/services/apiClient.ts ]
                            (Tự động đính kèm JWT Bearer Token vào Header)
                                                    |
                                                    v  (Giao tiếp qua HTTP RESTful API)
====================================================================================================
 TẦNG 3: XỬ LÝ NGHIỆP VỤ & BẢO MẬT (BACKEND: NestJS Modular Monolith + Prisma ORM + Swagger UI)
         Chạy tại: http://localhost:3000/api  |  Tài liệu API: http://localhost:3000/api/docs
====================================================================================================
                     +--------------------------------------------------------------+
                     | LỚP BẢO VỆ GOVTECH: JWT Guard, RBAC, MFA Verify & Brute-force |
                     | • Chặn tuyệt đối endpoint tự đăng ký (No Self-Registration)  |
                     | • Bắt buộc MFA (TOTP) với tài khoản Admin / Lãnh đạo         |
                     | • Rate Limit Gateway & Khóa tạm 15 phút sau 5 lần sai        |
                     +------------------------------+-------------------------------+
                                                    |
        +-------------------------------------------+-------------------------------------------+
        v                                           v                                           v
  +---------------------------+       +-------------------------------+       +---------------------------+
  | CORE, RISK & AUDIT ENGINE |       | INSPECTION & PUBLIC ENGINE    |       | REPORT & SEED ENGINE      |
  |    [Phụ trách: ROLE 3]    |       |      [Phụ trách: ROLE 4]      |       |    [Phụ trách: ROLE 5]    |
  +---------------------------+       +-------------------------------+       +---------------------------+
  | • Module Auth & Users:    |       | • Module Schedules (FR-05)    |       | • Module Reports (FR-10): |
  |   - Tách Login Cán bộ/DN  |       | • Module Inspections (FR-06): |       |   7 Báo cáo & Xuất Excel  |
  |   - MFA TOTP & Audit khóa |       |   Nạp Checklist, Tự sinh Vi   |       | • API Dashboard (FR-11)   |
  |   - Cấp phát User (Admin) |       |   phạm, Duyệt & Tính lại Rủi ro|      | • Script Seed Data chuẩn  |
  | • Facilities CRUD & Rủi ro|       | • Module Violations/Incidents |       |   (40 cơ sở + Checklist)  |
  | • Module Equipments(FR-04)|       | • Module Documents & Public   |       |                           |
  | • Module Audit Log (FR-12)|       | • Cronjob Cảnh báo 06:00 sáng |       |                           |
  +-------------+-------------+       +-------+---------------+-------+       +-------------+-------------+
                |                             |               |                             |
                +------------------+----------+               |                             |
                                   v                          v                             |
====================================================================================================
 TẦNG 4: DỮ LIỆU, LƯU TRỮ & PIPELINE CI/CD (CLOUD DATABASE & GITHUB ACTIONS)
====================================================================================================
  +-----------------------------------------+   +---------------------------+   +-------------------------+
  | CLOUD POSTGRESQL 16 + POSTGIS           |   | MINIO / CLOUD S3 STORAGE  |   | GITHUB ACTIONS CI/CD    |
  | • Lưu 14 Bảng CSDL dùng chung 5 Roles   |   | • Lưu PDF Hồ sơ pháp lý   |   | • Tự động Lint, Build,  |
  | • Supabase / Neon (sslmode=require)     |   | • Lưu Ảnh minh chứng <=10M|   |   Unit Test mỗi khi PR  |
  +-----------------------------------------+   +---------------------------+   +-------------------------+
```

---

## 2. Cấu trúc Thư mục Chuẩn Toàn Dự án (Chia Độc Lập Cho 5 Role)

```text
G18-FireSafety-System/
|-- .github/workflows/ci.yml          # [Role 4] GitHub Actions CI tự động test & build
|-- CLAUDE.md                         # [Role 1] Luật gốc cho Claude Code
|-- .cursorrules                      # [Role 1] Luật gốc cho Cursor / Antigravity
|-- docs/                             # [Cả nhóm] Bộ 6 file tài liệu chuẩn của dự án
|-- frontend-web/                     # (Chạy ở cổng http://localhost:5173)
|   \-- src/
|       |-- assets/                   # Icon mức độ nguy hiểm, logo PCCC
|       |-- components/ui/            # Shadcn/UI components dùng chung
|       |-- layouts/                  # [Role 2] AdminLayout (có Guard) & PublicLayout
|       |-- features/                 # [CHIA ĐỘC LẬP CHO TỪNG ROLE]
|       |   |-- gis-map/              # [Role 1 - Leader] Bản đồ số PCCC (Clustering, Heatmap, Picker)
|       |   |-- public-lookup/        # [Role 1 - Leader] Cổng tra cứu công khai cho người dân (FR-16)
|       |   |-- auth/                 # [Role 2 - FE 1] Đăng nhập Cán bộ (MFA), Đăng nhập Doanh nghiệp, Đổi mật khẩu & Quản trị User (FR-01)
|       |   |-- facilities/           # [Role 2 - FE 1] Cơ sở 7 Tabs, Hồ sơ & Nhập Excel (FR-02, 08, 13)
|       |   |-- equipments/           # [Role 2 - FE 1] Quản lý thiết bị PCCC & Hạn kiểm định (FR-04)
|       |   |-- schedules/            # [Role 2 - FE 1] Lịch kiểm tra bảng & lịch tháng/tuần (FR-05)
|       |   |-- inspections/          # [Role 5 - Fullstack] Checklist kiểm tra (lưu nháp localStorage), Vi phạm/Sự cố, In PDF (FR-06, 07, 15)
|       |   \-- dashboard/            # [Role 5 - Fullstack] Dashboard tổng quan & 7 Báo cáo thống kê (FR-10, 11)
|       |-- stores/                   # [Role 1 giữ khóa] useAuthStore.ts, useMapStore.ts
|       |-- services/                 # [Role 1 giữ khóa] apiClient.ts
|       |-- types/                    # [Role 1 giữ khóa] pccc.types.ts
|       |-- utils/                    # [Role 1 giữ khóa] riskCalculator.ts
|       \-- App.tsx                   # [Role 1 giữ khóa] Khai báo sẵn toàn bộ Route phân tách từ Ngày 1
|
\-- backend-api/                      # (Chạy ở cổng http://localhost:3000)
    |-- prisma/
    |   |-- schema.prisma             # [Role 3 giữ khóa] Khai báo 14 bảng Database chuẩn (bổ sung MFA & Audit)
    |   \-- seed.ts                   # [Role 5 - Fullstack] Script nạp danh mục, checklist & 40 cơ sở mẫu
    |-- src/
    |   |-- common/                   # [Role 3 giữ khóa] Guards (@RolesGuard, @MfaGuard), Filters, Decorators
    |   |-- jobs/                     # [Role 4 - BE 2] Cronjob quét cảnh báo 06:00 sáng (FR-14)
    |   |-- modules/                  # [CHIA ĐỘC LẬP CHO TỪNG ROLE]
    |   |   |-- auth/                 # [Role 3 - BE 1] Login Nội bộ (MFA), Login Cơ sở, Khóa tạm 15p, Chống Brute-force (FR-01)
    |   |   |-- users/                # [Role 3 - BE 1] Cấp phát tài khoản Chủ cơ sở (Identity Provisioning) & Phân công địa bàn (FR-01)
    |   |   |-- facilities/           # [Role 3 - BE 1] CRUD Cơ sở, Tính điểm rủi ro 0-100, Import Excel (FR-02, 03, 13)
    |   |   |-- equipments/           # [Role 3 - BE 1] Thiết bị PCCC & Thiết bị bắt buộc (FR-04)
    |   |   |-- audit/                # [Role 3 - BE 1] Nhật ký thao tác hệ thống & Cảnh báo an ninh đăng nhập (FR-12)
    |   |   |-- schedules/            # [Role 4 - BE 2] Lập lịch kiểm tra & Gợi ý tần suất (FR-05)
    |   |   |-- inspections/          # [Role 4 - BE 2] Biên bản Checklist, Tự sinh vi phạm & Duyệt (FR-06)
    |   |   |-- violations/           # [Role 4 - BE 2] Quản lý Vi phạm (Báo khắc phục -> Nghiệm thu) & Sự cố (FR-07)
    |   |   |-- documents/            # [Role 4 - BE 2] Upload Hồ sơ điện tử & Ảnh minh chứng (FR-08)
    |   |   |-- public/               # [Role 4 - BE 2] API Tra cứu công khai có Rate Limit (FR-16)
    |   |   \-- reports/              # [Role 5 - Fullstack] API Dashboard & 7 Báo cáo xuất Excel/PDF (FR-10, 11)
    |   \-- main.ts                   # [Role 3 giữ khóa] Cấu hình CORS, Helmet, RateLimiter & Swagger UI
    \-- .env.example                  # [Role 3 điều phối] Mẫu kết nối Cloud DB & JWT chung
```

---

## 3. Hướng dẫn Kết nối & Cấu hình Cloud PostgreSQL (Supabase / Neon + PostGIS)

Dự án sử dụng **Cloud PostgreSQL chung** cho cả 5 thành viên, giúp toàn đội ngũ làm việc trên cùng một nguồn dữ liệu duy nhất mà không cần cài đặt hay duy trì Docker container cục bộ.

### 3.1. Kích hoạt Extension PostGIS trên Cloud DB
Trước khi thực hiện migrate hoặc seed dữ liệu, Role 3 (hoặc người khởi tạo DB) mở SQL Editor trên giao diện web của Supabase hoặc Neon và thực thi:
```sql
-- Kích hoạt extension PostGIS phục vụ lưu trữ tọa độ không gian và bản đồ số PCCC
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3.2. Cấu hình Chuỗi Kết nối Chung (`backend-api/.env`)
Mỗi thành viên sao chép `backend-api/.env.example` thành `backend-api/.env` và sử dụng chuỗi kết nối Cloud PostgreSQL chung được cấp:

```env
# Chuỗi kết nối Cloud PostgreSQL (Bắt buộc có ?sslmode=require)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Cổng khởi chạy Backend API
PORT=3000

# Secret Key cho JWT Authentication & MFA
JWT_SECRET=super_secret_jwt_key_pccc_g18
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=g18_pccc_jwt_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# Cấu hình MinIO / S3 Cloud Storage (Role 4 cấu hình)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=password123
MINIO_BUCKET_NAME=pccc-documents
```

---

## 4. Các File Khung Cốt Lõi Khởi Tạo Từ Ngày 1

### 4.1. Router Phân Tách Cổng An Toàn (`frontend-web/src/App.tsx` - Owner: Role 1)
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InternalLoginPage } from './features/auth/InternalLoginPage';   // Cổng Cán bộ PCCC (MFA)
import { OwnerLoginPage } from './features/auth/OwnerLoginPage';         // Cổng Cơ sở Doanh nghiệp
import { UserManagementPage } from './features/auth/UserManagementPage';
import { GisMapPage } from './features/gis-map/GisMapPage';
import { PublicLookupPage } from './features/public-lookup/PublicLookupPage';
import { FacilityListPage } from './features/facilities/FacilityListPage';
import { FacilityDetailPage } from './features/facilities/FacilityDetailPage';
import { EquipmentManagementPage } from './features/equipments/EquipmentManagementPage';
import { ScheduleManagementPage } from './features/schedules/ScheduleManagementPage';
import { InspectionExecutionPage } from './features/inspections/InspectionExecutionPage';
import { ViolationIncidentPage } from './features/inspections/ViolationIncidentPage';
import { DashboardReportPage } from './features/dashboard/DashboardReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. CỔNG DÂN SỰ CÔNG KHAI (Không cần đăng nhập - FR-16) */}
        <Route path="/tra-cuu" element={<PublicLookupPage />} />

        {/* 2. CỔNG CƠ SỞ DOANH NGHIỆP (Tài khoản được cấp phát, đổi mật khẩu lần đầu) */}
        <Route path="/doanh-nghiep/login" element={<OwnerLoginPage />} />

        {/* 3. CỔNG NGHIỆP VỤ PCCC NỘI BỘ (Chỉ mở mạng nội bộ/VPN, bắt buộc 2FA/MFA) */}
        <Route path="/admin-portal/login" element={<InternalLoginPage />} />

        {/* CÁC PHÂN HỆ QUẢN TRỊ & TÁC NGHIỆP NỘI BỘ (Có RBAC & Area Guard bảo vệ) */}
        <Route path="/dashboard" element={<DashboardReportPage />} />
        <Route path="/map" element={<GisMapPage />} />
        <Route path="/facilities" element={<FacilityListPage />} />
        <Route path="/facilities/:id" element={<FacilityDetailPage />} />
        <Route path="/equipments" element={<EquipmentManagementPage />} />
        <Route path="/schedules" element={<ScheduleManagementPage />} />
        <Route path="/inspections/:scheduleId" element={<InspectionExecutionPage />} />
        <Route path="/violations-incidents" element={<ViolationIncidentPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />

        {/* Điều hướng mặc định */}
        <Route path="*" element={<Navigate to="/tra-cuu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 4.2. Axios Client Dùng Chung (`frontend-web/src/services/apiClient.ts` - Owner: Role 1)
```typescript
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const userRole = useAuthStore.getState().user?.role;
      useAuthStore.getState().logout();
      // Điều hướng về đúng cổng đăng nhập theo vai trò
      if (userRole === 'OWNER') {
        window.location.href = '/doanh-nghiep/login';
      } else {
        window.location.href = '/admin-portal/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### 4.3. Hàm Tính Điểm Nguy Hiểm Cháy Nổ (`utils/riskCalculator.ts` - FR-03)
```typescript
export interface RiskCalculationInput {
  baseTypeScore: number;              // Điểm loại hình cơ sở (Tối đa 30đ)
  areaM2: number;                     // Quy mô diện tích (m2)
  floors: number;                     // Số tầng
  requiredEquipCount: number;         // Tổng số thiết bị bắt buộc theo FacilityType
  missingOrExpiredEquipCount: number; // Số thiết bị đang thiếu, hỏng hoặc hết hạn
  majorViolationCount12m: number;     // Số vi phạm nghiêm trọng đang mở/12 tháng (+8đ/lỗi)
  minorViolationCount12m: number;     // Số vi phạm thường đang mở/12 tháng (+3đ/lỗi)
  fireIncidentCount12m: number;       // Số sự cố cháy nổ 12 tháng (+10đ/vụ)
}

export function calculateRiskScoreAndLevel(input: RiskCalculationInput): {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown: {
    typeScore: number;
    scaleScore: number;
    equipmentScore: number;
    historyScore: number;
  };
} {
  const typeScore = Math.min(30, Math.max(0, input.baseTypeScore));

  let scaleScore = 5;
  if (input.areaM2 > 5000 || input.floors >= 7) scaleScore = 20;
  else if (input.areaM2 >= 1000) scaleScore = 15;
  else if (input.areaM2 >= 300) scaleScore = 10;

  let equipRatio = 0;
  if (input.requiredEquipCount > 0) {
    equipRatio = Math.min(1, Math.max(0, input.missingOrExpiredEquipCount / input.requiredEquipCount));
  }
  const equipmentScore = Math.min(25, Math.round(equipRatio * 25));

  const historyRaw =
    input.majorViolationCount12m * 8 +
    input.minorViolationCount12m * 3 +
    input.fireIncidentCount12m * 10;
  const historyScore = Math.min(25, Math.max(0, historyRaw));

  const totalScore = Math.min(100, typeScore + scaleScore + equipmentScore + historyScore);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (totalScore >= 65) riskLevel = 'HIGH';
  else if (totalScore >= 35) riskLevel = 'MEDIUM';

  return {
    score: totalScore,
    riskLevel,
    breakdown: { typeScore, scaleScore, equipmentScore, historyScore },
  };
}
```
