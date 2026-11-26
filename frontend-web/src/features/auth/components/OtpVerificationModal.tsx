import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  clearPendingMfaToken,
  getMfaVerifyErrorCode,
  getMfaVerifyErrorMessage,
  getPendingMfaToken,
  verifyInternalMfa,
  type VerifiedMfaResult,
} from '../authApi';
import './otpVerificationModal.css';

interface OtpVerificationModalProps {
  expiresAt: number;
  onCancel: () => void;
  onExpired: () => void;
  onVerified: (result: VerifiedMfaResult) => void;
}

function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function OtpVerificationModal({ expiresAt, onCancel, onExpired, onVerified }: OtpVerificationModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeInputIndex, setActiveInputIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAt - Date.now()));
  const dialogRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef('');
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const expirationHandledRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  function expireSession() {
    if (expirationHandledRef.current) return;
    expirationHandledRef.current = true;
    requestIdRef.current += 1;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setIsExpired(true);
    codeRef.current = '';
    setCode('');
    setIsCodeInvalid(false);
    setError('Phiên xác thực đã hết hạn. Vui lòng hủy bước này và đăng nhập lại để nhận phiên MFA mới.');
    clearPendingMfaToken();
    onExpiredRef.current();
  }

  useLayoutEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    codeInputRef.current?.focus();

    return () => {
      requestIdRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      document.body.style.overflow = previousBodyOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const updateRemaining = () => {
      const nextRemaining = Math.max(0, expiresAt - Date.now());
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0) expireSession();
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'input:not([disabled]), button:not([disabled])',
    ));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleCodeChange(value: string) {
    if (!/^\d{0,6}$/.test(value)) return;
    codeRef.current = value;
    setCode(value);
    setError('');
    setIsCodeInvalid(false);
  }

  function handleCodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key.length === 1 && !/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current || isExpired) return;
    if (!/^\d{6}$/.test(code)) {
      setIsCodeInvalid(true);
      setError('Vui lòng nhập đủ 6 chữ số của mã xác thực.');
      codeInputRef.current?.focus();
      return;
    }

    const tempToken = getPendingMfaToken();
    if (!tempToken || Date.now() >= expiresAt) {
      expireSession();
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const submittedCode = code;
    activeRequestRef.current = controller;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError('');
    setIsCodeInvalid(false);

    try {
      const result = await verifyInternalMfa(tempToken, code, controller.signal);
      if (requestId !== requestIdRef.current || controller.signal.aborted) return;
      clearPendingMfaToken();
      codeRef.current = '';
      setCode('');
      onVerified(result);
    } catch (requestError) {
      if (requestId !== requestIdRef.current || controller.signal.aborted) return;
      const errorCode = getMfaVerifyErrorCode(requestError);
      if (errorCode === 'MFA_EXPIRED') {
        expireSession();
      } else {
        if (errorCode === 'OTP_INVALID') {
          if (codeRef.current === submittedCode) {
            codeRef.current = '';
            setCode('');
            setIsCodeInvalid(true);
            setActiveInputIndex(0);
            setError('Mã OTP chưa chính xác. Vui lòng kiểm tra và thử lại.');
            codeInputRef.current?.focus();
          } else {
            setIsCodeInvalid(false);
            setError('Mã vừa gửi chưa chính xác. Mã mới chưa được gửi; chọn Xác nhận để thử lại.');
          }
        } else {
          setIsCodeInvalid(false);
          setError(getMfaVerifyErrorMessage(requestError));
        }
      }
    } finally {
      if (requestId === requestIdRef.current) {
        activeRequestRef.current = null;
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div className="otp-modal-backdrop">
      <div
        ref={dialogRef}
        className="otp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-modal-title"
        aria-describedby="otp-modal-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id="otp-modal-title">Xác thực hai bước</h2>
        <p className="otp-modal-description" id="otp-modal-description">
          Nhập mã gồm 6 chữ số từ ứng dụng xác thực để tiếp tục đăng nhập.
        </p>

        <form className="otp-modal-form" onSubmit={handleSubmit} noValidate>
          <label className="otp-code-label" htmlFor="otp-code">Mã xác thực</label>
          <div className={`otp-code-control${isInputFocused ? ' is-focused' : ''}${isCodeInvalid ? ' has-error' : ''}`}>
            <div className="otp-code-cells" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  className={`otp-code-cell${index === activeInputIndex && isInputFocused ? ' is-current' : ''}`}
                  key={index}
                >
                  {code[index] ?? ''}
                </span>
              ))}
            </div>
            <input
              ref={codeInputRef}
              className="otp-code-input"
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => handleCodeChange(event.target.value)}
              onKeyDown={handleCodeKeyDown}
              onFocus={(event) => {
                setIsInputFocused(true);
                setActiveInputIndex(Math.min(event.currentTarget.selectionStart ?? 0, 5));
              }}
              onBlur={() => setIsInputFocused(false)}
              onSelect={(event) => setActiveInputIndex(Math.min(event.currentTarget.selectionStart ?? 0, 5))}
              onKeyUp={(event) => setActiveInputIndex(Math.min(event.currentTarget.selectionStart ?? 0, 5))}
              aria-label="Mã xác thực gồm 6 chữ số"
              aria-invalid={isCodeInvalid}
              aria-describedby={error ? 'otp-code-hint otp-code-error' : 'otp-code-hint'}
              disabled={isExpired}
            />
          </div>
          <p className="otp-code-hint" id="otp-code-hint">Mã có hiệu lực trong {formatRemainingTime(remainingMs)}.</p>
          {error && <p className="otp-code-error" id="otp-code-error" role="alert">{error}</p>}

          <div className="otp-modal-actions">
            <button className="otp-confirm-button" type="submit" disabled={isSubmitting || isExpired}>
              {isSubmitting ? 'Đang xác thực...' : 'Xác nhận'}
            </button>
            <button className="otp-cancel-button" type="button" onClick={onCancel}>
              Hủy xác thực
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
