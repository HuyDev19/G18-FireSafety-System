# 06. BỘ SƠ ĐỒ KIẾN TRÚC, NGHIỆP VỤ & CƠ SỞ DỮ LIỆU HỆ THỐNG G1.8 (PCCC)

Tài liệu này tổng hợp 5 sơ đồ chuẩn hóa dựa trên cấu trúc thư mục, 14 bảng Prisma và 16 module chức năng (`FR-01` -> `FR-16`) của dự án.

Anh em cài extention "Markdown Preview Mermaid Support" rồi bấm "Ctrl Shhift V" để xem sơ đồ
---

## 1. Sơ đồ Kiến trúc Tổng thể 4 Tầng & Ranh giới 5 Role (System Architecture)
*Khớp với cấu trúc thư mục tại `02_KIEN_TRUC_VA_CONG_NGHE.md` và phân công tại `04_PHAN_CONG_TASK_VA_GITFLOW.md`.*

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'curve': 'stepAfter', 'nodeSpacing': 40, 'rankSpacing': 50}}}%%
flowchart TB
    %% ==================== TẦNG 1: ACTORS ====================
    subgraph T1 ["TẦNG 1: 5 NHÓM ĐỐI TƯỢNG NGƯỜI DÙNG (ACTORS)"]
        direction LR
        ACT_AUTH["👮 Nhóm Đăng nhập Nội bộ (JWT)<br/>ADMIN | LEADER | INSPECTOR | OWNER"]
        ACT_PUB["👥 Người dân (Không cần Login)<br/>PUBLIC"]
    end

    %% ==================== TẦNG 2: FRONTEND ====================
    subgraph T2 ["TẦNG 2: FRONTEND SPA (React 18 + Vite + TS + Tailwind - Port 5173)"]
        direction TB
        APP_ROUTER{{"🧭 App.tsx Router + AdminLayout (RBAC Guard) & PublicLayout"}}

        subgraph FE_DIRS ["Thư mục src/features/ (Chia độc lập theo Role)"]
            direction LR
            FE_R1["🗺️ ROLE 1 (Leader)<br/>• features/gis-map/ (FR-09)<br/>• features/public-lookup/ (FR-16)"]
            FE_R2["📋 ROLE 2 (FE 1)<br/>• features/auth/ (FR-01)<br/>• features/facilities/ (FR-02, 08, 13)<br/>• features/equipments/ (FR-04)<br/>• features/schedules/ (FR-05)"]
            FE_R5["📊 ROLE 5 (Fullstack 2)<br/>• features/inspections/ (FR-06, 07, 15)<br/>• features/dashboard/ (FR-10, 11)"]
        end

        API_CLIENT["🔌 src/services/apiClient.ts (Axios Interceptor gắn Bearer Token) + React Query"]
    end

    %% ==================== TẦNG 3: BACKEND ====================
    subgraph T3 ["TẦNG 3: BACKEND MONOLITH (NestJS + TypeScript - Port 3000/api)"]
        direction TB
        BE_GUARD{{"🛡️ src/common/: JwtAuthGuard | RolesGuard | ValidationPipe | RateLimit"}}

        subgraph BE_DIRS ["Thư mục src/modules/ & src/jobs/ (Chia độc lập theo Role)"]
            direction LR
            BE_R3["⚙️ ROLE 3 (BE 1)<br/>• modules/auth/ & users/ (FR-01)<br/>• modules/facilities/ (FR-02, 03, 13)<br/>• modules/equipments/ (FR-04)<br/>• modules/audit/ (FR-12)"]
            BE_R4["🔍 ROLE 4 (BE 2)<br/>• modules/schedules/ (FR-05)<br/>• modules/inspections/ (FR-06)<br/>• modules/violations/ (FR-07)<br/>• modules/documents/ (FR-08)<br/>• modules/public/ (FR-16)<br/>• src/jobs/ Cron 06:00 (FR-14)"]
            BE_R5["📈 ROLE 5 (Fullstack 2)<br/>• modules/reports/ (FR-10, 11)<br/>• prisma/seed.ts (40 cơ sở mẫu)"]
        end

        PRISMA_ORM["🔗 Prisma Client ORM (prisma/schema.prisma - Owner: Role 3)"]
    end

    %% ==================== TẦNG 4: INFRASTRUCTURE ====================
    subgraph T4 ["TẦNG 4: HẠ TẦNG DOCKER & CI/CD (Owner: Role 4)"]
        direction LR
        PG_DB[("🗄️ PostgreSQL 16 + PostGIS (Port 5432)<br/>Container: g18_pccc_postgres (14 Bảng)")]
        MINIO_S3[("📦 MinIO Object Storage (Port 9000/9001)<br/>Bucket: pccc-files (PDF & Ảnh <= 10MB)")]
    end

    %% ==================== LUỒNG KẾT NỐI ====================
    ACT_AUTH ==> APP_ROUTER
    ACT_PUB -. "Truy cập /tra-cuu" .-> FE_R1

    APP_ROUTER --> FE_R1
    APP_ROUTER --> FE_R2
    APP_ROUTER --> FE_R5

    FE_R1 --> API_CLIENT
    FE_R2 --> API_CLIENT
    FE_R5 --> API_CLIENT

    API_CLIENT == "HTTP RESTful JSON" ==> BE_GUARD

    BE_GUARD --> BE_R3
    BE_GUARD --> BE_R4
    BE_GUARD --> BE_R5

    BE_R3 --> PRISMA_ORM
    BE_R4 --> PRISMA_ORM
    BE_R5 --> PRISMA_ORM

    PRISMA_ORM ==> PG_DB
    BE_R4 -. "Upload/Download fileUrl" .-> MINIO_S3

    classDef actor fill:#0f172a,stroke:#334155,color:#ffffff,stroke-width:2px;
    classDef gateway fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:2px,font-weight:bold;
    classDef fe fill:#eff6ff,stroke:#2563eb,color:#1e3a8a,stroke-width:1.5px;
    classDef be fill:#f0fdf4,stroke:#16a34a,color:#14532d,stroke-width:1.5px;
    classDef db fill:#faf5ff,stroke:#9333ea,color:#581c87,stroke-width:2px;

    class ACT_AUTH,ACT_PUB actor;
    class APP_ROUTER,API_CLIENT,BE_GUARD,PRISMA_ORM gateway;
    class FE_R1,FE_R2,FE_R5 fe;
    class BE_R3,BE_R4,BE_R5 be;
    class PG_DB,MINIO_S3 db;
```

---

## 2. Sơ đồ Phân quyền Tác nhân & Chức năng (Use Case Diagram theo FR-01 -> FR-16)
*Khớp với Ma trận RBAC tại `01_TongQuan_DeTai.md` và `05_HOP_DONG_API_VA_BAO_MAT.md`.*

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'curve': 'stepAfter', 'rankSpacing': 85, 'nodeSpacing': 30}}}%%
flowchart LR
    subgraph ACTORS ["5 NHÓM NGƯỜI DÙNG"]
        direction TB
        A1(["👮 ADMIN"])
        A2(["👨‍💼 LEADER"])
        A3(["🕵️ INSPECTOR"])
        A4(["🏢 OWNER"])
        A5(["👥 PUBLIC"])
    end

    subgraph SYSTEM ["16 MODULE CHỨC NĂNG HỆ THỐNG G1.8 PCCC"]
        direction TB
        
        subgraph GRP_ADMIN ["Nhóm Quản trị Hệ thống"]
            UC_ADM["• FR-01: Quản lý Users, Phân quyền & Khóa tài khoản<br/>• FR-02: Xóa mềm Cơ sở & Quản lý Danh mục gốc"]
        end

        subgraph GRP_LEADER ["Nhóm Chỉ đạo, Phân công & Phê duyệt"]
            UC_LDR["• FR-05: Tạo & Phân công Lịch kiểm tra (/api/schedules)<br/>• FR-06: Phê duyệt Kết quả Kiểm tra (/api/inspections/:id/approve)<br/>• FR-03 & 12: Ghi đè Điểm rủi ro & Tra cứu Audit Log<br/>• FR-10 & 11: Xem Dashboard Tổng quan & Xuất 7 Báo cáo Excel"]
        end

        subgraph GRP_INSP ["Nhóm Tác nghiệp Kiểm tra Địa bàn"]
            UC_INS["• FR-02, 04, 08, 13: Tạo/Sửa Cơ sở, Thiết bị, Hồ sơ & Import Excel<br/>• FR-06 & 15: Thực hiện Checklist Kiểm tra & In Biên bản PDF có QR<br/>• FR-07 & 09: Ghi nhận Vi phạm/Sự cố & Xem Bản đồ số PCCC"]
        end

        subgraph GRP_OWNER ["Nhóm Chủ cơ sở Tự theo dõi"]
            UC_OWN["• FR-02 & 08: Xem Hồ sơ & Lịch kiểm tra của cơ sở mình<br/>• FR-07: Báo cáo khắc phục vi phạm kèm ảnh (/api/violations/:id/resolve)"]
        end

        subgraph GRP_PUBLIC ["Cổng Tra cứu Công khai (Không cần Token)"]
            UC_PUB["• FR-16: Tra cứu thông tin cơ sở & tình trạng PCCC (/tra-cuu)<br/>• Xem vị trí cơ sở trên Bản đồ công khai (/api/public/facilities)"]
        end
    end

    A1 ==> GRP_ADMIN
    A1 --> GRP_LEADER

    A2 ==> GRP_LEADER
    A2 -. "Xem toàn địa bàn" .-> GRP_INSP

    A3 ==> GRP_INSP

    A4 ==> GRP_OWNER
    A4 -.-> GRP_PUBLIC

    A5 ==> GRP_PUBLIC

    classDef adm fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px;
    classDef ldr fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:2px;
    classDef ins fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px;
    classDef own fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:2px;
    classDef pub fill:#f1f5f9,stroke:#64748b,color:#0f172a,stroke-width:2px;

    class A1,UC_ADM adm;
    class A2,UC_LDR ldr;
    class A3,UC_INS ins;
    class A4,UC_OWN own;
    class A5,UC_PUB pub;
```

---

## 3. Sơ đồ Tuần tự Luồng Kiểm tra, Tự sinh Vi phạm & Tự tính Điểm Rủi ro (Sequence Diagram)
*Khớp với các API trong `05_HOP_DONG_API_VA_BAO_MAT.md` và hàm `calculateRiskScoreAndLevel` trong `02_KIEN_TRUC_VA_CONG_NGHE.md`.*

```mermaid
%%{init: {'theme': 'base', 'sequence': {'mirrorActors': false}}}%%
sequenceDiagram
    autonumber
    actor INS as 🕵️ Cán bộ (INSPECTOR)
    participant FE5 as 💻 InspectionExecutionPage<br/>(Role 5 - FE)
    participant BE4 as 🔍 Inspections & Documents API<br/>(Role 4 - BE)
    participant BE3 as ⚙️ Facilities & Audit Service<br/>(Role 3 - BE)
    participant DB as 🗄️ PostgreSQL & MinIO
    actor LDR as 👨‍💼 Lãnh đạo (LEADER)

    rect rgb(239, 246, 255)
        Note over INS,DB: BƯỚC 1: TẢI CHECKLIST & ĐÍNH KÈM ẢNH MINH CHỨNG (FR-06, FR-08)
        INS->>+FE5: Mở trang kiểm tra từ lịch (/inspections/:scheduleId)
        FE5->>+BE4: GET /api/inspections/criteria
        BE4->>+DB: Lấy danh mục InspectionCriteria đang active
        DB-->>-BE4: Trả về danh sách tiêu chí
        BE4-->>-FE5: Hiển thị form Checklist theo nhóm
        
        INS->>FE5: Đánh giá từng mục (PASS / FAIL / NA) & Chọn ảnh chụp hiện trường
        FE5->>+BE4: POST /api/documents/upload (File JPG/PNG <= 10MB)
        BE4->>+DB: Lưu vào MinIO bucket 'pccc-files'
        DB-->>-BE4: Trả về fileUrl
        BE4-->>-FE5: Gắn fileUrl vào mảng imageUrls của tiêu chí
    end

    rect rgb(254, 243, 199)
        Note over INS,DB: BƯỚC 2: NỘP BIÊN BẢN -> TỰ SINH VI PHẠM -> TỰ TÍNH ĐIỂM RỦI RO (FR-03, FR-07)
        INS->>FE5: Bấm "Nộp kết quả kiểm tra"
        FE5->>+BE4: POST /api/inspections/:scheduleId/submit
        
        BE4->>+DB: Bắt đầu Prisma $transaction: Lưu Inspection (SUBMITTED) & InspectionItem[]
        BE4->>DB: Tự động tạo bản ghi bảng Violation (status = OPEN) cho mọi mục có result = FAIL
        
        BE4->>+BE3: Gọi calculateRiskScoreAndLevel() tính lại điểm cơ sở (0-100đ)
        BE3->>DB: Cập nhật Facility (riskScore, riskLevel) & thêm bản ghi RiskAssessment
        BE3->>DB: Lưu vết vào bảng AuditLog (action = UPDATE, entity = INSPECTION)
        BE3-->>-BE4: Trả về điểm rủi ro mới (VD: 58đ MEDIUM -> 66đ HIGH)
        
        DB-->>-BE4: Commit Transaction
        BE4-->>-FE5: Trả về { success: true, data: inspection }
        FE5-->>-INS: Thông báo nộp thành công & Cập nhật huy hiệu Mức độ nguy hiểm
    end

    rect rgb(240, 253, 244)
        Note over FE5,LDR: BƯỚC 3: LÃNH ĐẠO PHÊ DUYỆT & KHÓA BIÊN BẢN (FR-06, FR-12, FR-15)
        LDR->>+FE5: Mở xem biên bản chờ duyệt
        LDR->>FE5: Bấm "Phê duyệt"
        FE5->>+BE4: PATCH /api/inspections/:id/approve
        BE4->>+DB: Cập nhật Inspection (status = APPROVED), khóa chỉnh sửa & ghi AuditLog
        DB-->>-BE4: Xác nhận lưu
        BE4-->>-FE5: Trả về kết quả đã duyệt
        FE5-->>-LDR: Mở khóa nút "In Biên bản PDF kèm mã QR" (FR-15)
    end
```

---

## 4. Sơ đồ Lưu đồ Thuật toán Tính Điểm Nguy hiểm Cháy nổ 0–100 Điểm (FR-03 Flowchart)
*Minh họa trực quan công thức tại Mục 4 của `01_TongQuan_DeTai.md` và hàm `riskCalculator.ts`.*

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'curve': 'stepAfter'}}}%%
flowchart TD
    START(["⚡ Kích hoạt khi: Tạo/Sửa Cơ sở | Đổi Thiết bị | Nộp Kiểm tra | Thêm Vi phạm/Sự cố"])
    
    subgraph CALC ["TÍNH TOÁN 4 NHÓM TIÊU CHÍ (Tổng tối đa 100 điểm)"]
        direction LR
        C1["1. Loại hình cơ sở (Max 30đ)<br/>• Xăng dầu/Hóa chất: 30đ<br/>• Nhà xưởng: 22đ<br/>• Karaoke/Chợ/TTTM: 20đ<br/>• Chung cư/Trường/Viện: 12đ<br/>• Văn phòng nhỏ: 5đ"]
        C2["2. Quy mô (Max 20đ)<br/>• > 5.000m² hoặc >= 7 tầng: 20đ<br/>• 1.000 – 5.000m²: 15đ<br/>• 300 – 1.000m²: 10đ<br/>• < 300m²: 5đ"]
        C3["3. Thiết bị PCCC (Max 25đ)<br/>• Tỷ lệ thiết bị thiếu hoặc<br/>  hết hạn/hỏng × 25đ"]
        C4["4. Lịch sử 12 tháng (Max 25đ)<br/>• Vi phạm nghiêm trọng: +8đ/lỗi<br/>• Vi phạm thường: +3đ/lỗi<br/>• Sự cố cháy nổ: +10đ/vụ"]
    end

    SUM["∑ Cộng tổng: totalScore = min(100, C1 + C2 + C3 + C4)"]
    CHECK_SCORE{"Kiểm tra ngưỡng<br/>totalScore"}

    LOW["🟢 Mức THẤP (LOW)<br/>0 – 34 điểm<br/>Chu kỳ gợi ý: 12 tháng"]
    MED["🟡 Mức TRUNG BÌNH (MEDIUM)<br/>35 – 64 điểm<br/>Chu kỳ gợi ý: 6 tháng"]
    HIGH["🔴 Mức CAO (HIGH)<br/>65 – 100 điểm<br/>Chu kỳ gợi ý: 3 tháng"]

    SAVE[("Lưu vào bảng Facility (riskScore, riskLevel)<br/>& tạo bản ghi lịch sử trong bảng RiskAssessment")]

    START --> C1 & C2 & C3 & C4
    C1 & C2 & C3 & C4 --> SUM
    SUM --> CHECK_SCORE

    CHECK_SCORE -- "0 -> 34 điểm" --> LOW
    CHECK_SCORE -- "35 -> 64 điểm" --> MED
    CHECK_SCORE -- "65 -> 100 điểm" --> HIGH

    LOW & MED & HIGH --> SAVE

    classDef lowBox fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:2px,font-weight:bold;
    classDef medBox fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:2px,font-weight:bold;
    classDef highBox fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px,font-weight:bold;
    class LOW lowBox;
    class MED medBox;
    class HIGH highBox;
```

---

## 5. Sơ đồ Quan hệ Thực thể 14 Bảng Cơ sở Dữ liệu (Prisma ERD Diagram)
*Khớp 100% với 14 model trong `03_CSDL_PRISMA_VA_TYPES.md`.*

```mermaid
erDiagram
    User ||--o{ Facility : "assignedInspector"
    User ||--o{ InspectionSchedule : "inspector"
    User ||--o{ Inspection : "inspector / approvedBy"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "performs"

    FacilityType ||--o{ Facility : "classifies"

    Facility ||--o{ RiskAssessment : "has_history"
    Facility ||--o{ Equipment : "equips"
    Facility ||--o{ InspectionSchedule : "scheduled_for"
    Facility ||--o{ Inspection : "inspected_in"
    Facility ||--o{ Violation : "commits"
    Facility ||--o{ Incident : "suffers"
    Facility ||--o{ Document : "stores"

    InspectionSchedule ||--o| Inspection : "generates"
    Inspection ||--o{ InspectionItem : "contains"
    InspectionCriteria ||--o{ InspectionItem : "defines"
    Inspection ||--o{ Violation : "detects"

    User {
        string id PK
        string email UK
        string phone 
        RoleCode role "ADMIN | LEADER | INSPECTOR | OWNER"
        string areaCode
        boolean isActive
        datetime lockedUntil
        datetime deletedAt
    }

    FacilityType {
        string id PK
        string code UK
        string name
        int baseRiskScore
        int inspectionIntervalDays
        json requiredEquipments
    }

    Facility {
        string id PK
        string code UK
        string name
        string facilityTypeId FK
        string assignedInspectorId FK
        float areaM2
        int floors
        float latitude
        float longitude
        int riskScore "0 - 100"
        RiskLevelCode riskLevel "LOW | MEDIUM | HIGH"
        FacilityStatus status "ACTIVE | SUSPENDED | CLOSED"
        datetime nextInspectionDue
        datetime deletedAt
    }

    RiskAssessment {
        string id PK
        string facilityId FK
        int score
        RiskLevelCode riskLevel
        json breakdown
        boolean isManual
    }

    Equipment {
        string id PK
        string facilityId FK
        string categoryCode
        string name
        int quantity
        datetime expiresAt
        string condition
    }

    InspectionCriteria {
        string id PK
        string groupName
        string content
        int weight
        boolean isMandatory
    }

    InspectionSchedule {
        string id PK
        string facilityId FK
        string inspectorId FK
        string inspectionType
        datetime plannedDate
        string status
    }

    Inspection {
        string id PK
        string scheduleId FK
        string facilityId FK
        string inspectorId FK
        string approvedById FK
        float score
        string result
        string status "DRAFT | SUBMITTED | APPROVED | REJECTED"
    }

    InspectionItem {
        string id PK
        string inspectionId FK
        string criteriaId FK
        string result "PASS | FAIL | NA"
        string[] imageUrls
    }

    Violation {
        string id PK
        string facilityId FK
        string inspectionId FK
        string severity "MINOR | MAJOR | CRITICAL"
        datetime deadline
        string status "OPEN | FIXING | RESOLVED | OVERDUE"
    }

    Incident {
        string id PK
        string facilityId FK
        string incidentType
        datetime occurredAt
        float damageEstimate
    }

    Document {
        string id PK
        string facilityId FK
        string docType
        string fileUrl
        datetime expiresAt
        int version
    }

    Notification {
        string id PK
        string userId FK
        string type
        boolean isRead
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string entity
        string entityId
    }
```