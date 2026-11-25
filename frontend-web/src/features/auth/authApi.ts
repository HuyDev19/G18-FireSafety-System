import axios from 'axios';
import { apiClient } from '../../services/apiClient';
import type { RoleCode, UserProfile } from '../../types/pccc.types';

export interface InternalLoginRequest {
  email: string;
  password: string;
}

export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export type InternalLoginResult =
  | { kind: 'mfa-required'; tempToken: string; message?: string }
  | { kind: 'authenticated'; accessToken: string; refreshToken: string; user: UserProfile };

export type InternalLoginErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOO_MANY_REQUESTS'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER'
  | 'INVALID_RESPONSE'
  | 'ROLE_NOT_ALLOWED'
  | 'UNKNOWN';

export class InternalLoginError extends Error {
  constructor(readonly code: InternalLoginErrorCode) {
    super(code);
    this.name = 'InternalLoginError';
  }
}

type InternalRole = Extract<RoleCode, 'ADMIN' | 'LEADER' | 'INSPECTOR'>;
const internalRoles: readonly InternalRole[] = ['ADMIN', 'LEADER', 'INSPECTOR'];

function isInternalRole(value: unknown): value is InternalRole {
  return typeof value === 'string' && internalRoles.includes(value as InternalRole);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUser(value: unknown): UserProfile {
  if (!isRecord(value)) throw new InternalLoginError('INVALID_RESPONSE');
  if (value.role === 'OWNER') throw new InternalLoginError('ROLE_NOT_ALLOWED');
  if (
    !requiredString(value.id)
    || !requiredString(value.email)
    || !requiredString(value.fullName)
    || !isInternalRole(value.role)
  ) {
    throw new InternalLoginError('INVALID_RESPONSE');
  }

  return {
    id: value.id,
    email: value.email,
    fullName: value.fullName,
    role: value.role,
    ...(typeof value.areaCode === 'string' ? { areaCode: value.areaCode } : {}),
  };
}

function parseEnvelope(value: unknown): ApiEnvelope<unknown> {
  if (!isRecord(value) || value.success !== true || typeof value.message !== 'string' || !('data' in value)) {
    throw new InternalLoginError('INVALID_RESPONSE');
  }

  return { success: true, message: value.message, data: value.data };
}

function parseLoginResult(value: unknown): InternalLoginResult {
  const envelope = parseEnvelope(value);
  if (!isRecord(envelope.data)) throw new InternalLoginError('INVALID_RESPONSE');
  const data = envelope.data;
  if ('mfaRequired' in data && typeof data.mfaRequired !== 'boolean') {
    throw new InternalLoginError('INVALID_RESPONSE');
  }

  if (data.mfaRequired === true) {
    if (!requiredString(data.tempToken)) throw new InternalLoginError('INVALID_RESPONSE');
    return {
      kind: 'mfa-required',
      tempToken: data.tempToken,
      ...(typeof data.message === 'string' && data.message.trim() ? { message: data.message } : {}),
    };
  }

  if (!requiredString(data.accessToken) || !requiredString(data.refreshToken)) {
    throw new InternalLoginError('INVALID_RESPONSE');
  }

  return {
    kind: 'authenticated',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: parseUser(data.user),
  };
}

function mapRequestError(error: unknown): InternalLoginError {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new InternalLoginError('TIMEOUT');
    }
    if (error.code === 'ERR_CANCELED') return new InternalLoginError('UNKNOWN');

    const status = error.response?.status;
    if (status === 400) return new InternalLoginError('BAD_REQUEST');
    if (status === 401) return new InternalLoginError('UNAUTHORIZED');
    if (status === 403) return new InternalLoginError('FORBIDDEN');
    if (status === 429) return new InternalLoginError('TOO_MANY_REQUESTS');
    if (status === 408) return new InternalLoginError('TIMEOUT');
    if (status !== undefined && status >= 500) return new InternalLoginError('SERVER');
    if (error.request && status === undefined) return new InternalLoginError('NETWORK');
  }

  return error instanceof InternalLoginError ? error : new InternalLoginError('UNKNOWN');
}

const errorMessages: Record<InternalLoginErrorCode, string> = {
  BAD_REQUEST: 'Yêu cầu đăng nhập chưa hợp lệ. Vui lòng kiểm tra lại thông tin.',
  UNAUTHORIZED: 'Email hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa/tạm dừng.',
  FORBIDDEN: 'Tài khoản không có quyền truy cập Cổng Cán bộ PCCC.',
  TOO_MANY_REQUESTS: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
  TIMEOUT: 'Máy chủ phản hồi quá thời gian cho phép. Vui lòng thử lại.',
  NETWORK: 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.',
  SERVER: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  INVALID_RESPONSE: 'Máy chủ trả về dữ liệu đăng nhập không hợp lệ. Vui lòng thử lại sau.',
  ROLE_NOT_ALLOWED: 'Tài khoản này thuộc Cổng Doanh nghiệp, không thể đăng nhập tại Cổng Cán bộ PCCC.',
  UNKNOWN: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
};

export function getInternalLoginErrorMessage(error: unknown): string {
  return errorMessages[mapRequestError(error).code];
}

export async function loginInternal(
  payload: InternalLoginRequest,
  signal: AbortSignal,
): Promise<InternalLoginResult> {
  let response: unknown;
  try {
    // apiClient's response interceptor returns response.data (the API envelope).
    response = await apiClient.post<unknown>('/auth/internal/login', payload, { signal });
  } catch (error) {
    throw mapRequestError(error);
  }

  return parseLoginResult(response);
}

const MFA_TOKEN_LIFETIME_MS = 5 * 60 * 1000;
let pendingMfa: { token: string; expiresAt: number } | null = null;

export function retainPendingMfaToken(token: string): void {
  pendingMfa = { token, expiresAt: Date.now() + MFA_TOKEN_LIFETIME_MS };
}

export function getPendingMfaToken(): string | null {
  if (!pendingMfa || Date.now() >= pendingMfa.expiresAt) {
    pendingMfa = null;
    return null;
  }
  return pendingMfa.token;
}

export function clearPendingMfaToken(): void {
  pendingMfa = null;
}
