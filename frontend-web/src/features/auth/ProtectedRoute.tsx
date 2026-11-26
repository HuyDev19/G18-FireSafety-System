import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import type { RoleCode } from '../../types/pccc.types';
import { getLoginPath, hasAuthenticatedSession, useAuthHydrated } from './authRouting';
import { ChangePasswordModal } from './UserManagementModals';
import type { ChangePasswordPayload } from './userManagement.types';
import { ChangePasswordError, changeMandatoryPassword, clearPendingMfaToken, clearVerifiedMfaResult, getChangePasswordErrorMessage } from './authApi';

export interface ProtectedRouteProps {
  allowedRoles: readonly RoleCode[];
  portal?: 'internal' | 'owner';
  children?: ReactNode;
  /** Optional transport override. Reject on failure; do not mutate the session. */
  onChangePassword?: (payload: ChangePasswordPayload) => Promise<void>;
}

interface ReauthenticationTarget {
  to: string;
  state: { authNotice: 'password-changed' | 'session-expired' | 'signed-out' };
}

/** Also used by Login until Role 1 protects the Owner destination in App.tsx. */
export function PasswordChangeRequired({ onChangePassword, onReauthenticate }: Pick<ProtectedRouteProps, 'onChangePassword'> & {
  onReauthenticate?: (target: ReauthenticationTarget) => void;
}) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const mountedRef = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    mountedRef.current = true;
    const unsubscribe = useAuthStore.subscribe((next, previous) => {
      if (next.token === previous.token && next.user === previous.user
        && next.refreshToken === previous.refreshToken && next.isMfaAuthenticated === previous.isMfaAuthenticated) return;
      activeRequest.current?.abort();
      activeRequest.current = null;
      setIsSubmitting(false);
      setError(null);
      setFormVersion((value) => value + 1);
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, []);

  function endSession(notice: ReauthenticationTarget['state']['authNotice']) {
    const current = useAuthStore.getState();
    activeRequest.current?.abort();
    activeRequest.current = null;
    clearPendingMfaToken();
    clearVerifiedMfaResult();
    setFormVersion((value) => value + 1);
    const target: ReauthenticationTarget = {
      to: getLoginPath(current.user?.role === 'OWNER' ? 'owner' : 'internal'),
      state: { authNotice: notice },
    };
    // A Guard owns its Navigate branch; Login uses its own router navigation.
    if (onReauthenticate) onReauthenticate(target);
    else {
      current.logout();
      navigate(target.to, { replace: true, state: target.state });
    }
  }

  async function submit(payload: ChangePasswordPayload) {
    if (activeRequest.current) return;
    const initiating = useAuthStore.getState();
    if (!hasAuthenticatedSession(initiating) || !initiating.token || initiating.user?.mustChangePassword !== true) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const isCurrentSession = () => {
      const current = useAuthStore.getState();
      return mountedRef.current && !controller.signal.aborted && activeRequest.current === controller
        && current.token === initiating.token && current.user === initiating.user
        && current.refreshToken === initiating.refreshToken && current.isMfaAuthenticated === initiating.isMfaAuthenticated;
    };
    setIsSubmitting(true);
    setError(null);
    try {
      if (onChangePassword) await onChangePassword(payload);
      else await changeMandatoryPassword(payload, initiating.token, controller.signal);
      if (!isCurrentSession()) return;
      // Keep mustChangePassword true until logout: children must never flash open.
      endSession('password-changed');
    } catch (requestError) {
      if (!isCurrentSession()) return;
      if (requestError instanceof ChangePasswordError && requestError.code === 'UNAUTHORIZED') {
        endSession('session-expired');
      } else {
        setError(getChangePasswordErrorMessage(requestError));
      }
    } finally {
      if (mountedRef.current && activeRequest.current === controller) {
        activeRequest.current = null;
        setIsSubmitting(false);
      }
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
      <section className="w-full max-w-lg space-y-4" aria-labelledby="password-required-title">
        <h1 id="password-required-title" className="text-2xl font-bold">Cần đổi mật khẩu trước khi tiếp tục</h1>
        <p role="status">
          Nội dung nghiệp vụ được khóa. Sau khi đổi mật khẩu thành công, vui lòng đăng nhập lại.
        </p>
      </section>
      <ChangePasswordModal key={formVersion} isMandatory isSubmitting={isSubmitting} error={error}
        onClose={() => {}} onSubmit={submit} onLogout={() => endSession('signed-out')} />
    </main>
  );
}

export function ProtectedRoute({ allowedRoles, portal, children, onChangePassword }: ProtectedRouteProps) {
  const hydrated = useAuthHydrated();
  const session = useAuthStore();
  const [reauthentication, setReauthentication] = useState<ReauthenticationTarget | null>(null);

  if (reauthentication) return <Navigate to={reauthentication.to} state={reauthentication.state} replace />;
  if (!hydrated) return <p role="status">Đang khôi phục phiên đăng nhập...</p>;
  if (!hasAuthenticatedSession(session)) return <Navigate to={getLoginPath(portal)} replace />;

  // Do not mount a business page (or its own password modal) until this gate is cleared.
  if (session.user?.mustChangePassword === true) {
    return <PasswordChangeRequired key={session.user.id} onChangePassword={onChangePassword}
      onReauthenticate={(target) => { setReauthentication(target); session.logout(); }} />;
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
