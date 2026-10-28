# 03. THIẾT KẾ CƠ SỞ DỮ LIỆU PRISMA & HỢP ĐỒNG KIỂU DỮ LIỆU

## 1. Quy ước Cơ sở dữ liệu & Ràng buộc Kỹ thuật
1. **Hệ quản trị:** PostgreSQL 16 + PostGIS, quản lý thông qua Prisma ORM (`backend-api/prisma/schema.prisma`).
2. **Quy tắc Migration:** Tuyệt đối không sửa CSDL bằng tay trên môi trường dùng chung. Mọi thay đổi bảng/cột phải do **Role 3 (Backend Lead)** thực hiện qua Prisma Migration và Pull Request.
3. **Xóa mềm (Soft Delete):** Không xóa cứng (`DELETE`) đối với `User` và `Facility` đã phát sinh dữ liệu lịch sử; luôn cập nhật trường `deletedAt = new Date()`.
4. **Quy tắc Seed Data (`prisma/seed.ts`):** Phải có tính chất **Idempotent** (dùng `upsert` theo mã `code` hoặc `email` để chạy nhiều lần không bị lỗi trùng dữ liệu). Khởi tạo sẵn: 4 vai trò, 8–10 loại cơ sở, 15–20 tiêu chí checklist và 30–50 cơ sở giả có tọa độ thật.

---

## 2. Schema Prisma Chuẩn 14 Bảng (`backend-api/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RoleCode {
  ADMIN          // Quản trị người dùng, danh mục, cấu hình hệ thống
  LEADER         // Lãnh đạo: Phân công lịch, duyệt kết quả kiểm tra, xem báo cáo
  INSPECTOR      // Cán bộ kiểm tra: Quản lý cơ sở được giao, thực hiện kiểm tra, ghi vi phạm
  OWNER          // Chủ cơ sở: Xem hồ sơ cơ sở mình, báo cáo khắc phục vi phạm
}

enum RiskLevelCode {
  LOW            // Thấp (0 - 34 điểm) - Màu Xanh
  MEDIUM         // Trung bình (35 - 64 điểm) - Màu Vàng
  HIGH           // Cao (65 - 100 điểm) - Màu Đỏ
}

enum FacilityStatus {
  ACTIVE         // Đang hoạt động
  SUSPENDED      // Tạm đình chỉ / Tạm ngừng
  CLOSED         // Ngừng hoạt động
}

// 1. Bảng Tài khoản & Phân quyền (FR-01)
model User {
  id                  String               @id @default(uuid())
  email               String               @unique
  passwordHash        String
  fullName            String
  phone               String?
  role                RoleCode             @default(INSPECTOR)
  areaCode            String?              // Quận/Phường phụ trách
  isActive            Boolean              @default(true)
  failedLoginCount    Int                  @default(0)
  lockedUntil         DateTime?            // Khóa tạm 15 phút sau 5 lần đăng nhập sai
  lastLoginAt         DateTime?
  assignedFacilities  Facility[]           @relation("AssignedInspector")
  schedules           InspectionSchedule[]
  inspections         Inspection[]         @relation("InspectorUser")
  approvedInspections Inspection[]         @relation("ApproverUser")
  auditLogs           AuditLog[]
  notifications       Notification[]
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  deletedAt           DateTime?            // Xóa mềm
}

// 2. Bảng Danh mục Loại hình Cơ sở (FR-02, FR-03)
model FacilityType {
  id                     String     @id @default(uuid())
  code                   String     @unique // KARAOKE, APARTMENT, WAREHOUSE, GAS_STATION...
  name                   String
  baseRiskScore          Int        @default(15)  // Điểm rủi ro cơ bản (Tối đa 30)
  inspectionIntervalDays Int        @default(180) // Chu kỳ gợi ý kiểm tra (ngày)
  requiredEquipments     Json?      // Danh mục thiết bị bắt buộc tối thiểu theo loại cơ sở (FR-04)
  facilities             Facility[]
}

// 3. Bảng Cơ sở thuộc diện Quản lý PCCC (FR-02, FR-03, FR-09, FR-16)
model Facility {
  id                  String               @id @default(uuid())
  code                String               @unique // Mã cơ sở tự sinh (VD: "CS-HCM-0001")
  name                String
  facilityTypeId      String
  facilityType        FacilityType         @relation(fields: [facilityTypeId], references: [id], onDelete: Restrict)
  address             String
  ward                String
  district            String
  province            String               @default("TP. Hồ Chí Minh")
  areaM2              Float                @default(100)
  floors              Int                  @default(1)
  builtYear           Int?
  ownerName           String
  ownerPhone          String
  ownerEmail          String?
  assignedInspectorId String?
  assignedInspector   User?                @relation("AssignedInspector", fields: [assignedInspectorId], references: [id])
  latitude            Float                // Vĩ độ hiển thị trên Bản đồ số PCCC
  longitude           Float                // Kinh độ hiển thị trên Bản đồ số PCCC
  riskScore           Int                  @default(20) // Điểm nguy hiểm (0 - 100)
  riskLevel           RiskLevelCode        @default(LOW)
  riskOverridden      Boolean              @default(false)
  status              FacilityStatus       @default(ACTIVE)
  lastInspectedAt     DateTime?
  nextInspectionDue   DateTime?
  equipments          Equipment[]
  schedules           InspectionSchedule[]
  inspections         Inspection[]
  violations          Violation[]
  incidents           Incident[]
  documents           Document[]
  riskAssessments     RiskAssessment[]
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  deletedAt           DateTime?            // Xóa mềm

  @@index([riskLevel, facilityTypeId])
  @@index([district, ward])
  @@index([nextInspectionDue])
}

// 4. Bảng Lịch sử Đánh giá Mức độ Nguy hiểm (FR-03)
model RiskAssessment {
  id         String        @id @default(uuid())
  facilityId String
  facility   Facility      @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  score      Int
  riskLevel  RiskLevelCode
  breakdown  Json          // Chi tiết điểm 4 nhóm tiêu chí
  isManual   Boolean       @default(false)
  reason     String?
  assessedBy String?
  assessedAt DateTime      @default(now())
}

// 5. Bảng Thiết bị PCCC của Cơ sở (FR-04)
model Equipment {
  id              String    @id @default(uuid())
  facilityId      String
  facility        Facility  @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  categoryCode    String    // EXTINGUISHER, SMOKE_DETECTOR, FIRE_PUMP, EXIT_LIGHT...
  name            String    // Bình chữa cháy bột MFZ4, Đầu báo khói...
  brandModel      String?
  serialNo        String?
  quantity        Int       @default(1)
  locationNote    String    // Tầng / Khu vực lắp đặt
  installedAt     DateTime?
  lastInspectedAt DateTime?
  expiresAt       DateTime  // Hạn kiểm định / bảo dưỡng (Cảnh báo trước 30 ngày)
  condition       String    @default("GOOD") // GOOD, NEEDS_REPAIR, BROKEN, EXPIRED
  qrCode          String?   @unique          // Mã QR định danh thiết bị (nếu dùng EXT-01)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([facilityId, expiresAt])
}

// 6. Bảng Danh mục Tiêu chí Checklist Kiểm tra (FR-06)
model InspectionCriteria {
  id             String           @id @default(uuid())
  groupName      String           // Lối thoát nạn, Hệ thống báo cháy, Chữa cháy, Điện, Hồ sơ...
  content        String           // Nội dung tiêu chí kiểm tra
  weight         Int              @default(5)
  isMandatory    Boolean          @default(true)
  facilityTypeId String?          // Null = Áp dụng cho mọi loại cơ sở
  isActive       Boolean          @default(true)
  items          InspectionItem[]
}

// 7. Bảng Lịch Kiểm tra (FR-05)
model InspectionSchedule {
  id             String      @id @default(uuid())
  facilityId     String
  facility       Facility    @relation(fields: [facilityId], references: [id], onDelete: Restrict)
  inspectorId    String
  inspector      User        @relation(fields: [inspectorId], references: [id], onDelete: Restrict)
  inspectionType String      @default("PERIODIC") // PERIODIC, SURPRISE, REINSPECTION
  plannedDate    DateTime
  status         String      @default("PLANNED")  // PLANNED, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
  rescheduleNote String?
  inspection     Inspection?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([inspectorId, plannedDate])
  @@index([status, plannedDate])
}

// 8. Bảng Biên bản & Kết quả Kiểm tra (FR-06, FR-15)
model Inspection {
  id                  String             @id @default(uuid())
  scheduleId          String             @unique
  schedule            InspectionSchedule @relation(fields: [scheduleId], references: [id], onDelete: Restrict)
  facilityId          String
  facility            Facility           @relation(fields: [facilityId], references: [id], onDelete: Restrict)
  inspectorId         String
  inspector           User               @relation("InspectorUser", fields: [inspectorId], references: [id])
  startedAt           DateTime           @default(now())
  submittedAt         DateTime?
  score               Float              @default(100)
  result              String             @default("PASSED") // PASSED, CONDITIONAL, FAILED
  conclusion          String?
  recommendation      String?
  remediationDeadline DateTime?
  status              String             @default("DRAFT")  // DRAFT, SUBMITTED, APPROVED, REJECTED
  approvedById        String?
  approvedBy          User?              @relation("ApproverUser", fields: [approvedById], references: [id])
  approvedAt          DateTime?
  reviewNote          String?
  items               InspectionItem[]
  violations          Violation[]
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
}

// 9. Bảng Chi tiết Đánh giá Từng Tiêu chí Checklist (FR-06)
model InspectionItem {
  id           String             @id @default(uuid())
  inspectionId String
  inspection   Inspection         @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  criteriaId   String
  criteria     InspectionCriteria @relation(fields: [criteriaId], references: [id])
  result       String             @default("PASS") // PASS, FAIL (Tự sinh vi phạm), NA
  note         String?
  imageUrls    String[]
}

// 10. Bảng Lịch sử Vi phạm (FR-07)
model Violation {
  id                String      @id @default(uuid())
  facilityId        String
  facility          Facility    @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  inspectionId      String?
  inspection        Inspection? @relation(fields: [inspectionId], references: [id])
  description       String
  severity          String      @default("MAJOR") // MINOR, MAJOR, CRITICAL
  legalBasis        String?
  actionTaken       String?
  deadline          DateTime
  status            String      @default("OPEN")  // OPEN, FIXING, RESOLVED, OVERDUE
  resolvedAt        DateTime?
  resolutionNote    String?
  evidenceImageUrls String[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([facilityId, status])
  @@index([deadline])
}

// 11. Bảng Lịch sử Sự cố Cháy nổ (FR-07)
model Incident {
  id             String   @id @default(uuid())
  facilityId     String
  facility       Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  occurredAt     DateTime @default(now())
  incidentType   String   @default("ELECTRICAL") // FIRE, ELECTRICAL, LEAK, FALSE_ALARM, OTHER
  description    String
  casualties     Int      @default(0)
  damageEstimate Float    @default(0)
  cause          String?
  handling       String?
  imageUrls      String[]
  createdAt      DateTime @default(now())
}

// 12. Bảng Hồ sơ Điện tử Pháp lý (FR-08)
model Document {
  id               String    @id @default(uuid())
  facilityId       String
  facility         Facility  @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  docType          String    // DESIGN_APPROVAL, ACCEPTANCE, FIRE_PLAN, BUSINESS_LICENSE, INSPECTION_RECORD...
  title            String
  docNumber        String?
  issuedDate       DateTime
  expiresAt        DateTime?
  issuingAuthority String?
  fileUrl          String    // Object key hoặc đường dẫn file trên MinIO
  mimeType         String    @default("application/pdf")
  fileSize         Int       @default(0)
  version          Int       @default(1)
  uploadedBy       String?
  createdAt        DateTime  @default(now())
}

// 13. Bảng Thông báo Cảnh báo Tự động (FR-14)
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   // SCHEDULE_DUE, EQUIPMENT_EXPIRED, DOCUMENT_EXPIRED, VIOLATION_OVERDUE
  title     String
  message   String
  link      String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

// 14. Bảng Nhật ký Thao tác Hệ thống (Audit Log - FR-12)
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  action     String   // CREATE, UPDATE, DELETE, APPROVE, OVERRIDE_RISK
  entity     String   // FACILITY, INSPECTION, VIOLATION, USER
  entityId   String
  beforeData Json?
  afterData  Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([entity, entityId])
  @@index([userId, createdAt])
}
```

---

## 3. Hợp đồng Kiểu Dữ liệu Frontend (`frontend-web/src/types/pccc.types.ts`)

```typescript
export type RoleCode = 'ADMIN' | 'LEADER' | 'INSPECTOR' | 'OWNER';
export type RiskLevelCode = 'LOW' | 'MEDIUM' | 'HIGH';
export type FacilityStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: RoleCode;
  areaCode?: string;
}

export interface Facility {
  id: string;
  code: string;
  name: string;
  facilityTypeId: string;
  facilityTypeName?: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  areaM2: number;
  floors: number;
  builtYear?: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  assignedInspectorId?: string;
  latitude: number;
  longitude: number;
  riskScore: number;
  riskLevel: RiskLevelCode;
  riskOverridden: boolean;
  status: FacilityStatus;
  lastInspectedAt?: string;
  nextInspectionDue?: string;
  hasOpenViolation?: boolean;
}

export interface PublicFacilityInfo {
  id: string;
  code: string;
  name: string;
  facilityTypeName: string;
  address: string;
  ward: string;
  district: string;
  latitude: number;
  longitude: number;
  riskLevel: RiskLevelCode;
  complianceStatus: 'COMPLIANT' | 'NEEDS_REMEDIATION' | 'UNINSPECTED';
  lastInspectedAt?: string;
}
```