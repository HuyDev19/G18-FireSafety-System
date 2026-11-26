import { useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import type { RoleCode } from '../../types/pccc.types';
import { getLoginPath, hasAuthenticatedSession, useAuthHydrated } from './authRouting';
import { ChangePasswordModal } from './UserManagementModals';
import type { ChangePasswordPayload } from './userManagement.types';

export interface ProtectedRouteProps {
  allowedRoles: readonly RoleCode[];
  portal?: 'internal' | 'owner';
  children?: ReactNode;
  /** Task 09 must call the real API and update the session only after success. */
  onChangePassword?: (payload: ChangePasswordPayload) => Promise<void>;
}

/** Also used by Login until Role 1 protects the Owner destination in App.tsx. */
export function PasswordChangeRequired({ onChangePassword, onLogout }: Pick<ProtectedRouteProps, 'onChangePassword'> & { onLogout?: () => void }) {
  const logout = useAuthStore((state) => state.logout);
  const role = useAuthStore((state) => state.user?.role);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function signOut() {
    // Inside a Guard, let its unauthenticated branch own the redirect.
    if (onLogout) {
      onLogout();
      return;
    }
    logout();
    navigate(getLoginPath(role === 'OWNER' ? 'owner' : 'internal'), { replace: true });
  }

  async function submit(payload: ChangePasswordPayload) {
    if (!onChangePassword || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onChangePassword(payload);
      // Never clear mustChangePassword locally. Task 09 owns the verified session update.
    } catch {
      setError('Không thể đổi mật khẩu. Vui lòng thử lại hoặc liên hệ quản trị viên.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
      <section className="w-full max-w-lg space-y-4" aria-labelledby="password-required-title">
        <h1 id="password-required-title" className="text-2xl font-bold">Cần đổi mật khẩu trước khi tiếp tục</h1>
        <p role="status">
          {onChangePassword
            ? 'Nội dung nghiệp vụ được khóa cho đến khi mật khẩu được cập nhật thành công.'
            : 'Nội dung nghiệp vụ đã được khóa. Chức năng đổi mật khẩu đang chờ tích hợp; vui lòng liên hệ quản trị viên hoặc đăng xuất.'}
        </p>
        {!onChangePassword && (
          <button type="button" onClick={signOut} className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            Đăng xuất
          </button>
        )}
      </section>
      {onChangePassword && (
        <ChangePasswordModal isMandatory isSubmitting={isSubmitting} error={error} onClose={() => {}} onSubmit={submit} />
      )}
    </main>
  );
}

export function ProtectedRoute({ allowedRoles, portal, children, onChangePassword }: ProtectedRouteProps) {
  const hydrated = useAuthHydrated();
  const session = useAuthStore();

  if (!hydrated) return <p role="status">Đang khôi phục phiên đăng nhập...</p>;
  if (!hasAuthenticatedSession(session)) return <Navigate to={getLoginPath(portal)} replace />;

  // Do not mount a business page (or its own password modal) until this gate is cleared.
  if (session.user?.mustChangePassword === true) {
    return <PasswordChangeRequired key={session.user.id} onChangePassword={onChangePassword} onLogout={session.logout} />;
  }

  if (!session.user || !allowedRoles.includes(session.user.role)) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
        <section className="max-w-lg space-y-3" aria-labelledby="access-denied-title">
          <h1 id="access-denied-title" className="text-2xl font-bold">Không có quyền truy cập</h1>
          <p>Vai trò của bạn không được phép mở trang này. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.</p>
          <button type="button" onClick={session.logout} className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            Đăng xuất
          </button>
        </section>
      </main>
    );
  }

  return children === undefined ? <Outlet /> : <>{children}</>;
}
