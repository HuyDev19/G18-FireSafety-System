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
