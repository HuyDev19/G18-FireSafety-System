import axios from 'axios';
import { apiClient } from '../../services/apiClient';
import type { RoleCode, UserProfile } from '../../types/pccc.types';

export interface InternalLoginRequest {
  email: string;
  password: string;
}

export interface OwnerLoginRequest {
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

export interface VerifiedMfaResult {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export type AuthenticatedResult =
  | ({ portal: 'INTERNAL' } & VerifiedMfaResult)
  | ({ portal: 'OWNER'; mustChangePassword: boolean } & VerifiedMfaResult);

export type OwnerLoginResult = Extract<AuthenticatedResult, { portal: 'OWNER' }>;

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
  | 'OTP_INVALID'
  | 'MFA_EXPIRED'
  | 'UNKNOWN';

export class InternalLoginError extends Error {
  constructor(readonly code: InternalLoginErrorCode, readonly responseMessage?: string) {
    super(code);
    this.name = 'InternalLoginError';
  }
}

type InternalRole = Extract<RoleCode, 'ADMIN' | 'LEADER' | 'INSPECTOR'>;
const internalRoles: readonly InternalRole[] = ['ADMIN', 'LEADER', 'INSPECTOR'];
// Public MFA verify must not attach a stored access token or run apiClient's global 401 logout interceptor.
const publicAuthClient = axios.create({
  baseURL: apiClient.defaults.baseURL,
  timeout: apiClient.defaults.timeout ?? 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

function parseOwnerLoginResult(value: unknown): OwnerLoginResult {
  const envelope = parseEnvelope(value);
  if (!isRecord(envelope.data)) throw new InternalLoginError('INVALID_RESPONSE');
  const data = envelope.data;
  if (!requiredString(data.accessToken) || !requiredString(data.refreshToken)) {
    throw new InternalLoginError('INVALID_RESPONSE');
  }
  if (typeof data.mustChangePassword !== 'boolean') {
    throw new InternalLoginError('INVALID_RESPONSE');
  }
  if (!isRecord(data.user)) throw new InternalLoginError('INVALID_RESPONSE');
  if (data.user.role !== 'OWNER') {
    if (isInternalRole(data.user.role)) throw new InternalLoginError('ROLE_NOT_ALLOWED');
    throw new InternalLoginError('INVALID_RESPONSE');
  }
  if (
    !requiredString(data.user.id)
    || !requiredString(data.user.email)
    || !requiredString(data.user.fullName)
  ) {
    throw new InternalLoginError('INVALID_RESPONSE');
  }

  return {
    portal: 'OWNER',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
      role: 'OWNER',
      ...(typeof data.user.areaCode === 'string' ? { areaCode: data.user.areaCode } : {}),
    },
    mustChangePassword: data.mustChangePassword,
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
    if (status === 401) {
      const message = getResponseMessage(error.response?.data).toLocaleLowerCase('vi');
      if (message.includes('mã xác thực otp không chính xác')) return new InternalLoginError('OTP_INVALID');
      if (message.includes('phiên xác thực mfa') || message.includes('tạm thời không hợp lệ')) {
        return new InternalLoginError('MFA_EXPIRED');
      }
      return new InternalLoginError('UNAUTHORIZED');
    }
    if (status === 403) return new InternalLoginError('FORBIDDEN');
    if (status === 429) return new InternalLoginError('TOO_MANY_REQUESTS');
    if (status === 408) return new InternalLoginError('TIMEOUT');
    if (status !== undefined && status >= 500) return new InternalLoginError('SERVER');
    if (error.request && status === undefined) return new InternalLoginError('NETWORK');
  }

  return error instanceof InternalLoginError ? error : new InternalLoginError('UNKNOWN');
}

function getResponseMessage(value: unknown): string {
  if (!isRecord(value)) return '';
  if (typeof value.message === 'string') return value.message;
  if (isRecord(value.data) && typeof value.data.message === 'string') return value.data.message;
  return '';
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
  OTP_INVALID: 'Mã OTP chưa chính xác. Vui lòng kiểm tra và thử lại.',
  MFA_EXPIRED: 'Phiên xác thực đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại để nhận phiên mới.',
  UNKNOWN: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
};

export function getInternalLoginErrorMessage(error: unknown): string {
  return errorMessages[mapRequestError(error).code];
}

export function getMfaVerifyErrorCode(error: unknown): InternalLoginErrorCode {
  return mapRequestError(error).code;
}

export function getMfaVerifyErrorMessage(error: unknown): string {
  const code = mapRequestError(error).code;
  if (code === 'UNAUTHORIZED') return 'Máy chủ từ chối xác thực OTP. Vui lòng kiểm tra mã và thử lại; nếu phiên không còn hợp lệ, hãy đăng nhập lại.';
  if (code === 'FORBIDDEN') return 'Tài khoản không được phép hoàn tất xác thực hai bước.';
  return errorMessages[code];
}

export function getOwnerLoginErrorMessage(error: unknown): string {
  const code = mapRequestError(error).code;
  const responseMessage = axios.isAxiosError(error)
    ? getResponseMessage(error.response?.data)
    : error instanceof InternalLoginError ? error.responseMessage ?? '' : '';

  if (code === 'UNAUTHORIZED') {
    const normalized = responseMessage.toLocaleLowerCase('vi');
    if (normalized.includes('tạm khóa')) return responseMessage;
    if (normalized.includes('tạm dừng hoạt động')) return responseMessage;
    if (normalized.includes('không chính xác')) return 'Email hoặc mật khẩu không đúng.';
    return 'Không thể xác thực tài khoản doanh nghiệp. Vui lòng kiểm tra thông tin hoặc liên hệ quản trị viên.';
  }
  if (code === 'FORBIDDEN') {
    return 'Tài khoản Cán bộ PCCC không thể sử dụng Cổng Doanh nghiệp. Vui lòng chọn Cổng Cán bộ PCCC.';
  }
  if (code === 'ROLE_NOT_ALLOWED') {
    return 'Tài khoản này không thuộc vai trò Chủ cơ sở nên không thể đăng nhập tại Cổng Doanh nghiệp.';
  }
  return errorMessages[code];
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

export async function loginOwner(
  payload: OwnerLoginRequest,
  signal: AbortSignal,
): Promise<OwnerLoginResult> {
  let response: unknown;
  try {
    const result = await publicAuthClient.post<unknown>('/auth/owner/login', payload, { signal });
    response = result.data;
  } catch (error) {
    const mappedError = mapRequestError(error);
    if (axios.isAxiosError(error)) {
      throw new InternalLoginError(mappedError.code, getResponseMessage(error.response?.data));
    }
    throw mappedError;
  }

  return parseOwnerLoginResult(response);
}

function parseVerifiedMfaResult(value: unknown): VerifiedMfaResult {
  const envelope = parseEnvelope(value);
  if (!isRecord(envelope.data)) throw new InternalLoginError('INVALID_RESPONSE');
  const data = envelope.data;
  if (!requiredString(data.accessToken) || !requiredString(data.refreshToken)) {
    throw new InternalLoginError('INVALID_RESPONSE');
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: parseUser(data.user),
  };
}

export async function verifyInternalMfa(
  tempToken: string,
  code: string,
  signal: AbortSignal,
): Promise<VerifiedMfaResult> {
  let response: unknown;
  try {
    const result = await publicAuthClient.post<unknown>('/auth/2fa/verify', { tempToken, code }, { signal });
    response = result.data;
  } catch (error) {
    throw mapRequestError(error);
  }

  return parseVerifiedMfaResult(response);
}

const MFA_TOKEN_LIFETIME_MS = 5 * 60 * 1000;
let pendingMfa: { token: string; expiresAt: number } | null = null;
const VERIFIED_RESULT_HANDOFF_LIFETIME_MS = 60 * 1000;
let authenticatedResultHandoff: { result: AuthenticatedResult; expiresAt: number } | null = null;
let authenticatedResultHandoffTimer: ReturnType<typeof setTimeout> | null = null;

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

export function getPendingMfaExpiresAt(): number | null {
  if (!pendingMfa || Date.now() >= pendingMfa.expiresAt) {
    pendingMfa = null;
    return null;
  }
  return pendingMfa.expiresAt;
}

export function clearPendingMfaToken(): void {
  pendingMfa = null;
}

/** Keeps an authenticated result in memory briefly so Task 07 can consume it once. */
export function retainAuthenticatedResult(result: AuthenticatedResult): void {
  if (authenticatedResultHandoffTimer !== null) clearTimeout(authenticatedResultHandoffTimer);
  authenticatedResultHandoff = {
    result,
    expiresAt: Date.now() + VERIFIED_RESULT_HANDOFF_LIFETIME_MS,
  };
  authenticatedResultHandoffTimer = setTimeout(() => {
    authenticatedResultHandoff = null;
    authenticatedResultHandoffTimer = null;
  }, VERIFIED_RESULT_HANDOFF_LIFETIME_MS);
}

export function retainVerifiedMfaResult(result: VerifiedMfaResult): void {
  retainAuthenticatedResult({ portal: 'INTERNAL', ...result });
}

export function consumeAuthenticatedResult(): AuthenticatedResult | null {
  const handoff = authenticatedResultHandoff;
  authenticatedResultHandoff = null;
  if (authenticatedResultHandoffTimer !== null) clearTimeout(authenticatedResultHandoffTimer);
  authenticatedResultHandoffTimer = null;
  if (!handoff || Date.now() >= handoff.expiresAt) return null;
  return handoff.result;
}

export function consumeVerifiedMfaResult(): VerifiedMfaResult | null {
  const handoff = authenticatedResultHandoff;
  if (!handoff || handoff.result.portal !== 'INTERNAL') return null;
  const result = consumeAuthenticatedResult();
  if (!result || result.portal !== 'INTERNAL') return null;
  return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user };
}

export function clearVerifiedMfaResult(): void {
  authenticatedResultHandoff = null;
  if (authenticatedResultHandoffTimer !== null) clearTimeout(authenticatedResultHandoffTimer);
  authenticatedResultHandoffTimer = null;
}
