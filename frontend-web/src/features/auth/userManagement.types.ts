import type { RoleCode } from "../../types/pccc.types";

/* Thông tin người dùng hiển thị trong hệ thống quản trị */
export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: RoleCode;
  areaCode?: string;
  facilityId?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

/**
 * Dữ liệu cấp tài khoản OWNER cho một cơ sở PCCC.
 * Tài khoản được tạo bởi ADMIN hoặc LEADER.
 */
export interface ProvisionOwnerPayload {
  email: string;
  fullName: string;
  phoneNumber: string;
  facilityId: string;
}

/** Dữ liệu cập nhật trạng thái khóa/mở khóa tài khoản. */
export interface StatusPayload {
  isActive: boolean;
}

/** Dữ liệu yêu cầu thay đổi mật khẩu cá nhân. */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Cấu trúc phản hồi API dùng trong phân hệ quản trị người dùng. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}
