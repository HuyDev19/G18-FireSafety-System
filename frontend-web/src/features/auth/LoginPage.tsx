import { FormEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import buildingImage from '../../assets/pccc-building-cutaway.png';
import pcccLogo from '../../assets/pccc-logo.png';
import {
  clearPendingMfaToken,
  clearVerifiedMfaResult,
  consumeAuthenticatedResult,
  getPendingMfaExpiresAt,
  getInternalLoginErrorMessage,
  getOwnerLoginErrorMessage,
  loginInternal,
  loginOwner,
  retainPendingMfaToken,
  retainAuthenticatedResult,
  retainVerifiedMfaResult,
  type VerifiedMfaResult,
} from './authApi';
import { useAuthStore } from '../../stores/useAuthStore';
import { OtpVerificationModal } from './components/OtpVerificationModal';
import { getLoginPortal, getRoleLandingPage, hasAuthenticatedSession, useAuthHydrated, type LoginPortal } from './authRouting';
import { PasswordChangeRequired } from './ProtectedRoute';
import './loginPage.css';

type Portal = LoginPortal;
type LoginField = 'email' | 'password';
type LoginErrors = Partial<Record<LoginField, string>>;

function validateEmail(value: string): string | undefined {
  const normalizedEmail = value.trim();
  if (!normalizedEmail) return 'Vui lòng nhập địa chỉ email.';
  if (!/^[^\s@]+@[^.\s@]+(?:\.[^.\s@]+)+$/.test(normalizedEmail)) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  return undefined;
}

function validatePassword(value: string): string | undefined {
  return value.length === 0 ? 'Vui lòng nhập mật khẩu.' : undefined;
}

const portalCopy: Record<Portal, { title: string; description: string; audience: string }> = {
  officer: {
    title: 'Đăng nhập Cổng Cán bộ PCCC',
    description: 'Dành cho cán bộ, lãnh đạo và quản trị viên hệ thống.',
    audience: 'Tài khoản ADMIN, LEADER hoặc INSPECTOR',
  },
  business: {
    title: 'Đăng nhập Cổng Doanh nghiệp',
    description: 'Theo dõi hồ sơ và thực hiện yêu cầu dành cho cơ sở của bạn.',
    audience: 'Tài khoản Chủ cơ sở (OWNER)',
  },
};

interface LoginPageProps {
  /** Enable only after Role 1 applies ProtectedRoute to the Owner routes. */
  ownerRoutesProtected?: boolean;
}

export function LoginPage({ ownerRoutesProtected = false }: LoginPageProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hydrated = useAuthHydrated();
  const session = useAuthStore();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setMfaAuthenticated = useAuthStore((state) => state.setMfaAuthenticated);
  const [portal, setPortal] = useState<Portal>(() => getLoginPortal(pathname));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [mfaExpiresAt, setMfaExpiresAt] = useState<number | null>(null);
  const tabRefs = useRef<Record<Portal, HTMLButtonElement | null>>({ officer: null, business: null });
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const focusErrorAfterRender = useRef(false);
  const activeLoginRequest = useRef<AbortController | null>(null);
  const loginRequestId = useRef(0);
  const copy = portalCopy[portal];

  function commitAuthenticatedHandoff(expectedPortal: 'INTERNAL' | 'OWNER'): boolean {
    const result: unknown = consumeAuthenticatedResult();
    if (!result || typeof result !== 'object') return false;

    const candidate = result as Record<string, unknown>;
    const user = candidate.user;
    if (
      candidate.portal !== expectedPortal
      || typeof candidate.accessToken !== 'string' || !candidate.accessToken.trim()
      || typeof candidate.refreshToken !== 'string' || !candidate.refreshToken.trim()
      || !user || typeof user !== 'object'
    ) return false;

    const profile = user as Record<string, unknown>;
    if (
      typeof profile.id !== 'string' || !profile.id.trim()
      || typeof profile.email !== 'string' || !profile.email.trim()
      || typeof profile.fullName !== 'string' || !profile.fullName.trim()
    ) return false;

    if (expectedPortal === 'INTERNAL') {
      if (!['ADMIN', 'LEADER', 'INSPECTOR'].includes(String(profile.role))) return false;
      setAuth(candidate.accessToken, {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role as 'ADMIN' | 'LEADER' | 'INSPECTOR',
        ...(typeof profile.areaCode === 'string' ? { areaCode: profile.areaCode } : {}),
      }, candidate.refreshToken);
    } else {
      if (profile.role !== 'OWNER' || typeof candidate.mustChangePassword !== 'boolean') return false;
      setAuth(
        candidate.accessToken,
        {
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          role: 'OWNER',
          mustChangePassword: candidate.mustChangePassword,
          ...(typeof profile.areaCode === 'string' ? { areaCode: profile.areaCode } : {}),
        },
        candidate.refreshToken,
      );
    }

    // setAuth's current inference depends on isTwoFactorEnabled, which auth responses omit.
    // This point is reached only after direct authentication or successful MFA verification.
    setMfaAuthenticated(true);
    return true;
  }

  function completeLogin(expectedPortal: 'INTERNAL' | 'OWNER', successMessage: string) {
    if (!commitAuthenticatedHandoff(expectedPortal)) {
      setMessage('Không thể hoàn tất phiên đăng nhập do kết quả xác thực không hợp lệ. Vui lòng thử lại.');
      return;
    }
    setPassword('');
    setPasswordVisible(false);
    setMessage(successMessage);
    const committed = useAuthStore.getState();
    if (!hasAuthenticatedSession(committed) || !committed.user) return;
    // Until the Router is protected, a mandatory password change stays on the locked screen.
    if (committed.user.mustChangePassword === true && !ownerRoutesProtected) return;
    navigate(getRoleLandingPage(committed.user.role), { replace: true });
  }

  useEffect(() => {
    if (!focusErrorAfterRender.current) return;
    focusErrorAfterRender.current = false;
    if (errors.email) emailInputRef.current?.focus();
    else if (errors.password) passwordInputRef.current?.focus();
  }, [errors]);

  useEffect(() => () => {
    loginRequestId.current += 1;
    activeLoginRequest.current?.abort();
    activeLoginRequest.current = null;
    clearPendingMfaToken();
    clearVerifiedMfaResult();
  }, []);

  const resetPortal = useCallback((nextPortal: Portal) => {
    loginRequestId.current += 1;
    activeLoginRequest.current?.abort();
    activeLoginRequest.current = null;
    clearPendingMfaToken();
    clearVerifiedMfaResult();
    setIsOtpModalOpen(false);
    setMfaExpiresAt(null);
    setPortal(nextPortal);
    setPassword('');
    setPasswordVisible(false);
    setErrors({});
    setMessage('');
    setIsSubmitting(false);
  }, []);

  useLayoutEffect(() => {
    if (!['/login', '/admin-portal/login', '/doanh-nghiep/login'].includes(pathname)) return;
    resetPortal(getLoginPortal(pathname));
  }, [pathname, resetPortal]);

  function selectPortal(nextPortal: Portal) {
    if (nextPortal === portal) return;
    resetPortal(nextPortal);
    if (pathname === '/admin-portal/login' || pathname === '/doanh-nghiep/login') {
      navigate(nextPortal === 'business' ? '/doanh-nghiep/login' : '/admin-portal/login');
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextPortal = portal === 'officer' ? 'business' : 'officer';
    selectPortal(nextPortal);
    tabRefs.current[nextPortal]?.focus();
  }

  function handleEmailChange(value: string) {
    cancelActiveLoginRequest();
    clearPendingMfaToken();
    clearVerifiedMfaResult();
    setEmail(value);
    setMessage('');
    setErrors((currentErrors) => currentErrors.email
      ? { ...currentErrors, email: validateEmail(value) }
      : currentErrors);
  }

  function handlePasswordChange(value: string) {
    cancelActiveLoginRequest();
    clearPendingMfaToken();
    clearVerifiedMfaResult();
    setPassword(value);
    setMessage('');
    setErrors((currentErrors) => currentErrors.password
      ? { ...currentErrors, password: validatePassword(value) }
      : currentErrors);
  }

  function cancelActiveLoginRequest() {
    if (!activeLoginRequest.current) return;
    loginRequestId.current += 1;
    activeLoginRequest.current.abort();
    activeLoginRequest.current = null;
    setIsSubmitting(false);
  }

  function handleBlur(field: LoginField) {
    if (field === 'email') {
      const normalizedEmail = email.trim();
      setEmail(normalizedEmail);
      const error = validateEmail(normalizedEmail);
      setErrors((currentErrors) => ({ ...currentErrors, email: error }));
      return;
    }

    const error = validatePassword(password);
    setErrors((currentErrors) => ({ ...currentErrors, password: error }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeLoginRequest.current) return;

    const normalizedEmail = email.trim();
    const emailError = validateEmail(normalizedEmail);
    const passwordError = validatePassword(password);
    const nextErrors: LoginErrors = {
      ...(emailError ? { email: emailError } : {}),
      ...(passwordError ? { password: passwordError } : {}),
    };

    setEmail(normalizedEmail);
    setErrors(nextErrors);
    setMessage('');

    if (nextErrors.email || nextErrors.password) {
      focusErrorAfterRender.current = true;
      return;
    }

    clearPendingMfaToken();
    clearVerifiedMfaResult();
    const controller = new AbortController();
    const requestId = ++loginRequestId.current;
    activeLoginRequest.current = controller;
    setIsSubmitting(true);
    setMessage(portal === 'business' ? 'Đang xác thực tài khoản doanh nghiệp.' : 'Đang xác thực thông tin đăng nhập.');

    if (portal === 'business') {
      void submitOwnerLogin(normalizedEmail, password, controller, requestId);
    } else {
      void submitInternalLogin(normalizedEmail, password, controller, requestId);
    }
  }

  async function submitInternalLogin(emailValue: string, passwordValue: string, controller: AbortController, requestId: number) {
    try {
      const result = await loginInternal({ email: emailValue, password: passwordValue }, controller.signal);
      if (requestId !== loginRequestId.current || controller.signal.aborted || portal !== 'officer') return;

      if (result.kind === 'mfa-required') {
        retainPendingMfaToken(result.tempToken);
        const expiresAt = getPendingMfaExpiresAt();
        if (!expiresAt) {
          clearPendingMfaToken();
          setMessage('Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại để nhận phiên MFA mới.');
          return;
        }
        setMfaExpiresAt(expiresAt);
        setIsOtpModalOpen(true);
      } else {
        clearPendingMfaToken();
        retainVerifiedMfaResult({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        });
        completeLogin('INTERNAL', 'Đăng nhập thành công.');
      }
    } catch (error) {
      if (requestId !== loginRequestId.current || controller.signal.aborted || portal !== 'officer') return;
      setMessage(getInternalLoginErrorMessage(error));
    } finally {
      if (requestId === loginRequestId.current) {
        activeLoginRequest.current = null;
        setIsSubmitting(false);
      }
    }
  }

  async function submitOwnerLogin(emailValue: string, passwordValue: string, controller: AbortController, requestId: number) {
    try {
      const result = await loginOwner({ email: emailValue, password: passwordValue }, controller.signal);
      if (requestId !== loginRequestId.current || controller.signal.aborted || portal !== 'business') return;

      retainAuthenticatedResult(result);
      completeLogin('OWNER', 'Đăng nhập thành công.');
    } catch (error) {
      if (requestId !== loginRequestId.current || controller.signal.aborted || portal !== 'business') return;
      setMessage(getOwnerLoginErrorMessage(error));
    } finally {
      if (requestId === loginRequestId.current) {
        activeLoginRequest.current = null;
        setIsSubmitting(false);
      }
    }
  }

  function cancelMfaVerification() {
    clearPendingMfaToken();
    setIsOtpModalOpen(false);
    setMfaExpiresAt(null);
    setMessage('Bạn đã hủy xác thực hai bước. Hãy đăng nhập lại để tiếp tục.');
  }

  function handleMfaExpired() {
    clearPendingMfaToken();
  }

  function handleMfaVerified(_result: VerifiedMfaResult) {
    retainAuthenticatedResult({ portal: 'INTERNAL', ..._result });
    clearPendingMfaToken();
    setIsOtpModalOpen(false);
    setMfaExpiresAt(null);
    completeLogin('INTERNAL', 'Xác thực hai bước thành công. Đăng nhập thành công.');
  }

  if (hydrated && hasAuthenticatedSession(session) && session.user?.mustChangePassword === true) {
    return <PasswordChangeRequired key={session.user.id} />;
  }

  return (
    <main className="login-page">
      <div className="login-shell" aria-hidden={isOtpModalOpen}>
        <section className="login-intro" aria-label="Giới thiệu hệ thống">
          <a className="login-brand" href="/login" aria-label="Quản lý cơ sở PCCC, trang đăng nhập">
            <span className="login-brand-mark" aria-hidden="true">
              <img src={pcccLogo} alt="" />
            </span>
            <span className="login-brand-name">QUẢN LÝ CƠ SỞ <b>PCCC</b></span>
          </a>

          <div className="login-intro-copy">
            <div className="login-intro-content">
              <h2 className="login-intro-title">Chủ động phòng cháy,<br /><span>sẵn sàng chữa cháy.</span></h2>
            </div>
          </div>

          <div className="login-building-art" aria-hidden="true">
            <img
              className="login-building-image"
              src={buildingImage}
              alt=""
            />
          </div>
        </section>

        <section className="login-form-side" aria-label="Biểu mẫu đăng nhập">
          <div className="login-form-wrap">
            <div className="login-mobile-brand">
              <span className="login-brand-mark"><img src={pcccLogo} alt="Logo Quản lý cơ sở PCCC" /></span>
            </div>

            <div className="login-heading">
              <h1>Đăng nhập hệ thống</h1>
              <p>Chọn cổng phù hợp với tài khoản của bạn để tiếp tục.</p>
            </div>

            <div className="login-tabs" role="tablist" aria-label="Chọn cổng đăng nhập">
              <button
                ref={(element) => { tabRefs.current.officer = element; }}
                id="login-tab-officer"
                className={`login-tab${portal === 'officer' ? ' is-active' : ''}`}
                type="button" role="tab" aria-selected={portal === 'officer'} aria-controls="login-panel"
                tabIndex={portal === 'officer' ? 0 : -1}
                onClick={() => selectPortal('officer')} onKeyDown={handleTabKeyDown}
              >Cổng Cán bộ PCCC</button>
              <button
                ref={(element) => { tabRefs.current.business = element; }}
                id="login-tab-business"
                className={`login-tab${portal === 'business' ? ' is-active' : ''}`}
                type="button" role="tab" aria-selected={portal === 'business'} aria-controls="login-panel"
                tabIndex={portal === 'business' ? 0 : -1}
                onClick={() => selectPortal('business')} onKeyDown={handleTabKeyDown}
              >Cổng Doanh nghiệp</button>
            </div>

            <div id="login-panel" role="tabpanel" aria-labelledby={portal === 'officer' ? 'login-tab-officer' : 'login-tab-business'}>
              <div className="login-portal-copy">
                <h2>{copy.title}</h2>
                <p>{copy.description}</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
                <div className={`login-field${errors.email ? ' has-error' : ''}`}>
                  <label htmlFor="login-email">Email</label>
                  <div className="login-input-wrap">
                    <Mail className="login-input-icon" size={18} aria-hidden="true" />
                    <input ref={emailInputRef} id="login-email" type="email" name="email" autoComplete="username" inputMode="email"
                      placeholder="name@company.com" value={email} onChange={(event) => handleEmailChange(event.target.value)}
                      onBlur={() => handleBlur('email')} required aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'login-email-error' : undefined} />
                  </div>
                  {errors.email && <p className="login-field-error" id="login-email-error"><CircleAlert size={15} aria-hidden="true" /><span>{errors.email}</span></p>}
                </div>

                <div className={`login-field${errors.password ? ' has-error' : ''}`}>
                  <label htmlFor="login-password">Mật khẩu</label>
                  <div className="login-input-wrap">
                    <LockKeyhole className="login-input-icon" size={18} aria-hidden="true" />
                    <input ref={passwordInputRef} id="login-password" type={passwordVisible ? 'text' : 'password'} name="password"
                      autoComplete="current-password" placeholder="Nhập mật khẩu" value={password}
                      onChange={(event) => handlePasswordChange(event.target.value)} onBlur={() => handleBlur('password')}
                      required aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'login-password-error' : undefined} />
                    <button className="login-password-toggle" type="button" onClick={() => setPasswordVisible(!passwordVisible)}
                      aria-label={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={passwordVisible}>
                      {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="login-field-error" id="login-password-error"><CircleAlert size={15} aria-hidden="true" /><span>{errors.password}</span></p>}
                </div>

                <div className="login-audience"><ShieldCheck size={16} aria-hidden="true" /><span>{copy.audience}</span></div>
                <button className="login-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang xác thực...' : <>Đăng nhập <ArrowRight size={17} aria-hidden="true" /></>}
                </button>
                <p className="login-status" role="status">{message}</p>
              </form>
            </div>

            <p className="login-help">Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.</p>
          </div>
          <footer className="login-copyright">© 2026 Quản lý cơ sở PCCC <span aria-hidden="true">·</span> Cổng thông tin an toàn</footer>
        </section>
      </div>
      {isOtpModalOpen && mfaExpiresAt !== null && (
        <OtpVerificationModal
          expiresAt={mfaExpiresAt}
          onCancel={cancelMfaVerification}
          onExpired={handleMfaExpired}
          onVerified={handleMfaVerified}
        />
      )}
    </main>
  );
}
