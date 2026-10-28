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
        <Route path="/tra-cuu" element={<PublicLookupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Các phân hệ nghiệp vụ nội bộ (Có bảo vệ bởi RBAC Guard) */}
        <Route path="/dashboard" element={<DashboardReportPage />} />
        <Route path="/map" element={<GisMapPage />} />
        <Route path="/facilities" element={<FacilityListPage />} />
        <Route path="/facilities/:id" element={<FacilityDetailPage />} />
        <Route path="/equipments" element={<EquipmentManagementPage />} />
        <Route path="/schedules" element={<ScheduleManagementPage />} />
        <Route path="/inspections/:scheduleId" element={<InspectionExecutionPage />} />
        <Route path="/violations-incidents" element={<ViolationIncidentPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
