import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AUTH_ROUTE_ROLES } from './features/auth/authRouting';
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
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Cổng tra cứu công khai cho người dân (Không cần đăng nhập - FR-16) */}
        <Route path="/tra-cuu" element={<PublicLookupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-portal/login" element={<LoginPage />} />
        <Route path="/doanh-nghiep/login" element={<LoginPage />} />

        {/* Các phân hệ nội bộ chỉ dành cho Cán bộ PCCC (ADMIN, LEADER, INSPECTOR) */}
        <Route element={<ProtectedRoute allowedRoles={AUTH_ROUTE_ROLES.internal} portal="internal" />}>
          <Route path="/dashboard" element={<DashboardReportPage />} />
          <Route path="/map" element={<GisMapPage />} />
          <Route path="/schedules" element={<ScheduleManagementPage />} />
          <Route path="/inspections/:scheduleId" element={<InspectionExecutionPage />} />
        </Route>

        {/* Các phân hệ dùng chung cho Cán bộ PCCC và Chủ cơ sở (OWNER) */}
        <Route element={<ProtectedRoute allowedRoles={AUTH_ROUTE_ROLES.facilities} />}>
          <Route path="/facilities" element={<FacilityListPage />} />
          <Route path="/facilities/:id" element={<FacilityDetailPage />} />
          <Route path="/equipments" element={<EquipmentManagementPage />} />
          <Route path="/violations-incidents" element={<ViolationIncidentPage />} />
        </Route>

        {/* Quản trị người dùng (Chỉ ADMIN và LEADER) */}
        <Route element={<ProtectedRoute allowedRoles={AUTH_ROUTE_ROLES.userManagement} portal="internal" />}>
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
