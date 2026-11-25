import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
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
  getInternalLoginErrorMessage,
  loginInternal,
  retainPendingMfaToken,
} from './authApi';
import './loginPage.css';

type Portal = 'officer' | 'business';
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

export function LoginPage() {
  const [portal, setPortal] = useState<Portal>('officer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tabRefs = useRef<Record<Portal, HTMLButtonElement | null>>({ officer: null, business: null });
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const focusErrorAfterRender = useRef(false);
  const activeLoginRequest = useRef<AbortController | null>(null);
  const loginRequestId = useRef(0);
  const copy = portalCopy[portal];

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
  }, []);

  function selectPortal(nextPortal: Portal) {
    if (nextPortal === portal) return;
    loginRequestId.current += 1;
    activeLoginRequest.current?.abort();
    activeLoginRequest.current = null;
    clearPendingMfaToken();
    setPortal(nextPortal);
    setPassword('');
    setPasswordVisible(false);
    setErrors({});
    setMessage('');
    setIsSubmitting(false);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextPortal = portal === 'officer' ? 'business' : 'officer';
    selectPortal(nextPortal);
    tabRefs.current[nextPortal]?.focus();
  }

  function handleEmailChange(value: string) {
    clearPendingMfaToken();
    setEmail(value);
    setMessage('');
    setErrors((currentErrors) => currentErrors.email
      ? { ...currentErrors, email: validateEmail(value) }
      : currentErrors);
  }

  function handlePasswordChange(value: string) {
    clearPendingMfaToken();
    setPassword(value);
    setMessage('');
    setErrors((currentErrors) => currentErrors.password
      ? { ...currentErrors, password: validatePassword(value) }
      : currentErrors);
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

    if (portal === 'business') {
      setMessage('Đăng nhập Cổng Doanh nghiệp sẽ được tích hợp ở bước tiếp theo. Thông tin chưa được gửi.');
      return;
    }

    clearPendingMfaToken();
    const controller = new AbortController();
    const requestId = ++loginRequestId.current;
    activeLoginRequest.current = controller;
    setIsSubmitting(true);
    setMessage('Đang xác thực thông tin đăng nhập.');

    void submitInternalLogin(normalizedEmail, password, controller, requestId);
  }

  async function submitInternalLogin(emailValue: string, passwordValue: string, controller: AbortController, requestId: number) {
    try {
      const result = await loginInternal({ email: emailValue, password: passwordValue }, controller.signal);
      if (requestId !== loginRequestId.current || controller.signal.aborted || portal !== 'officer') return;

      if (result.kind === 'mfa-required') {
        retainPendingMfaToken(result.tempToken);
        setMessage('Mật khẩu đã được xác thực. Vui lòng tiếp tục bằng mã OTP 2FA.');
      } else {
        clearPendingMfaToken();
        setMessage('Thông tin đăng nhập đã được xác thực. Phiên đăng nhập sẽ được thiết lập ở bước tiếp theo.');
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

  return (
    <main className="login-page">
      <div className="login-shell">
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
    </main>
  );
}
