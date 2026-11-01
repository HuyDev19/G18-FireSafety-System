# 02. KIẾN TRÚC HỆ THỐNG, CẤU TRÚC THƯ MỤC & CÀI ĐẶT HẠ TẦNG

## 1. Sơ đồ Kiến trúc Tổng quan 4 Tầng (Modular Monolith)

```text
====================================================================================================
 TẦNG 1: 5 NHÓM ĐỐI TƯỢNG NGƯỜI DÙNG (ACTORS)
====================================================================================================
  [Admin Hệ thống]    [Lãnh đạo PCCC]    [Cán bộ Kiểm tra]    [Chủ cơ sở]    [Người dân (Không cần Login)]
         |                   |                   |                 |                      |
         +-------------------+-------------------+-----------------+----------------------+
                                                 | HTTPS (Nginx Reverse Proxy)
                                                 v
====================================================================================================
 TẦNG 2: GIAO DIỆN PHÍA CLIENT (FRONTEND: React 18 + Vite + TypeScript + Tailwind + React Query)
         Chạy tại: http://localhost:5173
====================================================================================================
  +------------------------------+  +--------------------------------+  +--------------------------+
  | BẢN ĐỒ SỐ & TRA CỨU CÔNG KHAI|  | QUẢN LÝ HỒ SƠ, THIẾT BỊ & LỊCH |  | KIỂM TRA, DASHBOARD & PDF|
  |     [Phụ trách: ROLE 1]      |  |      [Phụ trách: ROLE 2]       |  |    [Phụ trách: ROLE 5]   |
  +------------------------------+  +--------------------------------+  +--------------------------+
  | • Bản đồ PCCC (FR-09):       |  | • Đăng nhập & Quản lý User     |  | • Checklist Kiểm tra &   |
  |   Clustering, Heatmap, Lọc   |  | • Bảng Cơ sở & Chi tiết 7 Tabs |  |   Lãnh đạo Duyệt (FR-06) |
  | • Chọn tọa độ trên bản đồ    |  | • Quản lý Thiết bị PCCC (FR-04)|  | • Timeline Vi phạm/Sự cố |
  | • Cổng Tra cứu Công khai cho |  | • Lịch Kiểm tra Tháng/Tuần     |  | • In Biên bản PDF có QR  |
  |   Người dân (/tra-cuu FR-16) |  | • Hồ sơ Điện tử & Nhập Excel   |  | • Dashboard & 7 Báo cáo  |
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
                     | LỚP BẢO VỆ: JWT Auth Guard, RBAC & Rate Limit [ROLE 3 & 4]   |
                     | (Kiểm tra quyền vai trò, quyền dữ liệu khu vực & chống spam) |
                     +------------------------------+-------------------------------+
                                                    |
        +-------------------------------------------+-------------------------------------------+
        v                                           v                                           v
  +---------------------------+       +-------------------------------+       +---------------------------+
  | CORE, RISK & AUDIT ENGINE |       | INSPECTION & PUBLIC ENGINE    |       | REPORT & SEED ENGINE      |
  |    [Phụ trách: ROLE 3]    |       |      [Phụ trách: ROLE 4]      |       |    [Phụ trách: ROLE 5]    |
  +---------------------------+       +-------------------------------+       +---------------------------+
  | • Module Auth & Users     |       | • Module Schedules (FR-05)    |       | • Module Reports (FR-10): |
  | • Module Facilities (CRUD,|       | • Module Inspections (FR-06): |       |   7 Báo cáo & Xuất Excel  |
  |   Import Excel FR-13)     |       |   Nạp Checklist, Tự sinh Vi   |       | • API Dashboard (FR-11)   |
  | • Engine Tính Điểm Nguy   |       |   phạm, Duyệt & Tính lại Rủi ro|      | • Script Seed Data chuẩn  |
  |   hiểm 0-100đ (FR-03)     |       | • Module Violations/Incidents |       |   (40 cơ sở + Checklist)  |
  | • Module Equipments(FR-04)|       | • Module Documents & Public   |       |                           |
  | • Module Audit Log (FR-12)|       | • Cronjob Cảnh báo 06:00 sáng |       |                           |
  +-------------+-------------+       +-------+---------------+-------+       +-------------+-------------+
                |                             |               |                             |
                +------------------+----------+               |                             |
                                   v                          v                             |
====================================================================================================
 TẦNG 4: DỮ LIỆU, LƯU TRỮ & PIPELINE CI/CD (DOCKER COMPOSE & GITHUB ACTIONS)
====================================================================================================
  +-----------------------------------------+   +---------------------------+   +-------------------------+
  | POSTGRESQL 16 + POSTGIS (Cổng 5432)     |   | MINIO / VOLUME STORAGE    |   | GITHUB ACTIONS CI/CD    |
  | • Lưu 14 Bảng CSDL chuẩn hóa [ROLE 3]   |   | • Lưu PDF Hồ sơ pháp lý   |   | • Tự động Lint, Build,  |
  | • Hỗ trợ xóa mềm (deletedAt) & GiST GIS |   | • Lưu Ảnh minh chứng <=10M|   |   Unit Test mỗi khi PR  |
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
|       |   |-- auth/                 # [Role 2 - FE 1] Đăng nhập, Đổi mật khẩu & Quản trị người dùng (FR-01)
|       |   |-- facilities/           # [Role 2 - FE 1] Cơ sở 7 Tabs, Hồ sơ & Nhập Excel (FR-02, 08, 13)
|       |   |-- equipments/           # [Role 2 - FE 1] Quản lý thiết bị PCCC & Hạn kiểm định (FR-04)
|       |   |-- schedules/            # [Role 2 - FE 1] Lịch kiểm tra bảng & lịch tháng/tuần (FR-05)
|       |   |-- inspections/          # [Role 5 - Fullstack] Checklist kiểm tra (lưu nháp localStorage), Vi phạm/Sự cố, In PDF (FR-06, 07, 15)
|       |   \-- dashboard/            # [Role 5 - Fullstack] Dashboard tổng quan & 7 Báo cáo thống kê (FR-10, 11)
|       |-- stores/                   # [Role 1 giữ khóa] useAuthStore.ts, useMapStore.ts
|       |-- services/                 # [Role 1 giữ khóa] apiClient.ts
|       |-- types/                    # [Role 1 giữ khóa] pccc.types.ts
|       |-- utils/                    # [Role 1 giữ khóa] riskCalculator.ts
|       \-- App.tsx                   # [Role 1 giữ khóa] Khai báo sẵn toàn bộ Route từ Ngày 1
|
\-- backend-api/                      # (Chạy ở cổng http://localhost:3000)
    |-- prisma/
    |   |-- schema.prisma             # [Role 3 giữ khóa] Khai báo 14 bảng Database chuẩn
    |   \-- seed.ts                   # [Role 5 - Fullstack] Script nạp danh mục, checklist & 40 cơ sở
    |-- src/
    |   |-- common/                   # [Role 3 giữ khóa] Guards (@RolesGuard), Filters, Decorators
    |   |-- jobs/                     # [Role 4 - BE 2] Cronjob quét cảnh báo 06:00 sáng (FR-14)
    |   |-- modules/                  # [CHIA ĐỘC LẬP CHO TỪNG ROLE]
    |   |   |-- auth/                 # [Role 3 - BE 1] JWT Login, Refresh Token, Đổi/Reset mật khẩu, Khóa tạm 15p (FR-01)
    |   |   |-- users/                # [Role 3 - BE 1] Quản lý người dùng & Phân công khu vực (FR-01)
    |   |   |-- facilities/           # [Role 3 - BE 1] CRUD Cơ sở, Tính điểm rủi ro 0-100, Import Excel (FR-02, 03, 13)
    |   |   |-- equipments/           # [Role 3 - BE 1] Thiết bị PCCC & Thiết bị bắt buộc (FR-04)
    |   |   |-- audit/                # [Role 3 - BE 1] Nhật ký thao tác hệ thống (FR-12)
    |   |   |-- schedules/            # [Role 4 - BE 2] Lập lịch kiểm tra & Gợi ý tần suất (FR-05)
    |   |   |-- inspections/          # [Role 4 - BE 2] Biên bản Checklist, Tự sinh vi phạm & Duyệt (FR-06)
    |   |   |-- violations/           # [Role 4 - BE 2] Quản lý Vi phạm (Báo khắc phục -> Nghiệm thu) & Sự cố (FR-07)
    |   |   |-- documents/            # [Role 4 - BE 2] Upload Hồ sơ điện tử & Ảnh minh chứng (FR-08)
    |   |   |-- public/               # [Role 4 - BE 2] API Tra cứu công khai có Rate Limit (FR-16)
    |   |   \-- reports/              # [Role 5 - Fullstack] API Dashboard & 7 Báo cáo xuất Excel/PDF (FR-10, 11)
    |   \-- main.ts                   # [Role 3 giữ khóa] Cấu hình CORS, Helmet, Validation & Swagger UI
    \-- docker-compose.yml            # [Role 4 giữ khóa] Chạy PostgreSQL 16/PostGIS & MinIO
```

* **Quy tắc bên trong mỗi Module NestJS:** Mọi module trong `backend-api/src/modules/<ten-module>/` đều thống nhất gồm: `<name>.module.ts`, `<name>.controller.ts` (chỉ nhận request/trả response), `<name>.service.ts` (xử lý nghiệp vụ, kiểm tra quyền dữ liệu), thư mục `dto/` (validate bằng `class-validator`) và `<name>.service.spec.ts` (Unit test).

---

## 3. Cấu hình Docker Compose Chuẩn (`backend-api/docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres_db:
    image: postgis/postgis:16-3.4-alpine
    container_name: g18_pccc_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: admin_pccc
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: g18_fire_safety_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin_pccc -d g18_fire_safety_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio_storage:
    image: minio/minio:latest
    container_name: g18_pccc_minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: password123
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

---

## 4. Các File Khung Cốt Lõi Khởi Tạo Từ Ngày 1

### 4.1. Router Chống Conflict (`frontend-web/src/App.tsx` - Owner: Role 1)
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
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
        {/* Cổng tra cứu công khai cho người dân (Không cần đăng nhập - FR-16) */}
        <Route element="{<PublicLookupPage" path="/tra-cuu"/>} />
        <Route element="{<LoginPage" path="/login"/>} />

        {/* Các phân hệ nghiệp vụ nội bộ (Có bảo vệ bởi RBAC Guard) */}
        <Route element="{<DashboardReportPage" path="/dashboard"/>} />
        <Route element="{<GisMapPage" path="/map"/>} />
        <Route element="{<FacilityListPage" path="/facilities"/>} />
        <Route element="{<FacilityDetailPage" path="/facilities/:id"/>} />
        <Route element="{<EquipmentManagementPage" path="/equipments"/>} />
        <Route element="{<ScheduleManagementPage" path="/schedules"/>} />
        <Route element="{<InspectionExecutionPage" path="/inspections/:scheduleId"/>} />
        <Route element="{<ViolationIncidentPage" path="/violations-incidents"/>} />
        <Route element="{<UserManagementPage" path="/admin/users"/>} />

        <Route element="{<Navigate" path="*" replace to="/dashboard"/>} />
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
      useAuthStore.getState().logout();
      window.location.href = '/login';
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
  // 1. Điểm loại hình (Max 30đ)
  const typeScore = Math.min(30, Math.max(0, input.baseTypeScore));

  // 2. Điểm quy mô diện tích & số tầng (Max 20đ)
  let scaleScore = 5;
  if (input.areaM2 > 5000 || input.floors >= 7) scaleScore = 20;
  else if (input.areaM2 >= 1000) scaleScore = 15;
  else if (input.areaM2 >= 300) scaleScore = 10;

  // 3. Điểm thiết bị PCCC (Max 25đ) - Chống lỗi chia cho 0 (NaN) khi cơ sở mới tạo
  let equipRatio = 0;
  if (input.requiredEquipCount > 0) {
    equipRatio = Math.min(1, Math.max(0, input.missingOrExpiredEquipCount / input.requiredEquipCount));
  }
  const equipmentScore = Math.min(25, Math.round(equipRatio * 25));

  // 4. Điểm lịch sử vi phạm & sự cố 12 tháng (Max 25đ)
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