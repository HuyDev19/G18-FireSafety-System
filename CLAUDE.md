# SYSTEM RULES & CONTEXT ROUTER - PROJECT G1.8 (PCCC - GTEL OTS)

You are an Expert Fullstack Developer working in a strict 5-member team where ALL 5 members write code in isolated folders. You MUST obey these rules in every single code generation and file edit:

## 1. MANDATORY DOCUMENT ROUTING (READ BEFORE CODING)
Before implementing any feature, consult the single-source-of-truth files in `/docs`:
- Business Scope, FR-01 to FR-16 & Risk Formula: Read `@docs/01_TONG_QUAN_VA_NGHIEP_VU.md`
- Folder Structure, Docker & Core Setup (`App.tsx`, `apiClient.ts`): Read `@docs/02_KIEN_TRUC_VA_CONG_NGHE.md`
- Database Prisma Schema (14 Models) & Shared TypeScript Interfaces: Read `@docs/03_CSDL_PRISMA_VA_TYPES.md`
- Role Responsibilities, Shared File Owners & Jira Tasks: Read `@docs/04_PHAN_CONG_TASK_VA_GITFLOW.md`
- REST API Endpoints, RBAC Matrix & Security Rules: Read `@docs/05_HOP_DONG_API_VA_BAO_MAT.md`

## 2. STRICT TECH STACK (DO NOT DEVIATE)
- **Frontend:** React 18, Vite, TypeScript (strict), Tailwind CSS, Shadcn/UI, Lucide-react, Zustand (auth/map state), TanStack React Query (server state), Axios (`apiClient.ts`), MapLibre GL JS (GIS clustering & heatmap), Apache ECharts, ExcelJS / react-to-print.
- **Backend:** Node.js 20 LTS, NestJS, TypeScript, Prisma ORM, PostgreSQL 16 + PostGIS, MinIO (S3 compatible), class-validator, `@nestjs/swagger`, `@nestjs/schedule`.
- **FORBIDDEN:**
  - Do NOT implement fire hydrant scanning (`FireHydrant` is removed from scope).
  - Do NOT install or use Redux, Material-UI (MUI), Ant Design, Bootstrap, Moment.js, or raw `fetch()`.
  - Do NOT use `any` type in TypeScript. Always import shared interfaces from `src/types/pccc.types.ts`.

## 3. FOLDER BOUNDARY & ANTI-CONFLICT LAW FOR 5 ROLES (CRITICAL)
You are ONLY allowed to create or modify files inside the specific folder assigned to the current user's Role:
- **Role 1 (Team Leader, GIS & Public Portal Architect):**
  - Allowed Frontend: `frontend-web/src/features/gis-map/`, `src/features/public-lookup/`, `src/stores/`, `src/services/`, `src/types/`, `src/utils/`, `src/App.tsx`.
- **Role 2 (Frontend 1 - Core Management UI):**
  - Allowed Frontend: `frontend-web/src/layouts/`, `src/features/auth/`, `src/features/facilities/`, `src/features/equipments/`, `src/features/schedules/`.
- **Role 3 (Backend 1 - Core DB, Auth, Risk Engine & Audit):**
  - Allowed Backend: `backend-api/prisma/schema.prisma`, `src/main.ts`, `src/common/`, `src/modules/auth/`, `src/modules/users/`, `src/modules/facilities/`, `src/modules/equipments/`, `src/modules/audit/`.
- **Role 4 (Backend 2 - Inspection Workflow, Storage, Public API & CI/CD):**
  - Allowed Backend: `backend-api/docker-compose.yml`, `.github/workflows/`, `src/modules/schedules/`, `src/modules/inspections/`, `src/modules/violations/`, `src/modules/documents/`, `src/modules/public/`, `src/jobs/`.
- **Role 5 (Fullstack 2 - Inspection UI, Dashboard, Reporting, Seed & QA):**
  - Allowed Backend: `backend-api/prisma/seed.ts`, `src/modules/reports/`.
  - Allowed Frontend: `frontend-web/src/features/inspections/`, `src/features/dashboard/`.

- **STRICT PROHIBITION:** NEVER touch shared root files (`App.tsx`, `main.tsx`, `package.json`, `apiClient.ts`, `useAuthStore.ts`, `pccc.types.ts`, `schema.prisma`, `docker-compose.yml`) unless the user explicitly states they are the assigned Owner of that root file.
- Keep each file modular and under 300 lines.

## 4. BUSINESS LOGIC, NAMING & UI CONVENTIONS
- Use `camelCase` for variables/JSON keys and `PascalCase` for Components/Classes/Interfaces.
- All Backend API responses MUST follow: `{ "success": true, "message": "...", "data": ... }`.
- **Soft Delete Rule:** Never hard-delete facilities or users with linked history; update `deletedAt = new Date()`.
- **Automatic Risk Score (FR-03):** Recalculate score (0-100) whenever facility info, equipment, inspection results, or violations change (`0-34`: LOW/Green `#10b981`, `35-64`: MEDIUM/Amber `#f59e0b`, `65-100`: HIGH/Red `#ef4444`).
- **Public API Security (FR-16):** `/api/public/facilities` must NEVER expose `ownerPhone`, `ownerEmail`, detailed violations, or internal document links.
- All UI text, labels, table headers, and notifications MUST be in **Vietnamese** using accurate PCCC terminology.

## 5. BUILD & VERIFICATION COMMANDS
After completing any task, automatically run:
- Frontend check: `cd frontend-web && npm run build`
- Backend check: `cd backend-api && npx prisma generate && npm run build`