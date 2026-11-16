import { useEffect, useId, useRef, useState } from "react";
import type {
  FormEvent,
  ReactNode,
} from "react";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import type {
  ChangePasswordPayload,
  ProvisionOwnerPayload,
} from "./userManagement.types";

interface ModalShellProps {
  title: string;
  description: string;
  onClose: () => void;
  canClose?: boolean;
  children: ReactNode;
}

/**Khung giao diện cho các modal trong hệ thống quản trị người dùng. */
function ModalShell({
  title,
  description,
  onClose,
  canClose = true,
  children,
}: ModalShellProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  // Giữ callback mới nhất mà không phải đăng ký lại listener toàn cục mỗi lần render.
  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );

    const firstFocusable = focusableElements()[0];
    (firstFocusable ?? dialog).focus();

    // Khóa vòng Tab trong modal và ngăn Escape đóng modal bắt buộc.
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && canCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const currentFocusable = focusableElements();
      if (currentFocusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (dialog.contains(event.target as Node)) return;
      // Đưa focus quay lại modal nếu trình duyệt hoặc công cụ hỗ trợ đẩy focus ra ngoài.
      const firstAvailable = focusableElements()[0];
      (firstAvailable ?? dialog).focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      previousFocusRef.current?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold leading-7 text-slate-950">
              {title}
            </h2>
            <p className="body-copy mt-1 text-slate-500">{description}</p>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

interface ProvisionOwnerModalProps {
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: ProvisionOwnerPayload) => Promise<void>;
}

/**
 * Modal cấp tài khoản OWNER cho chủ cơ sở PCCC.
 * Thu thập thông tin người dùng và mã cơ sở được liên kết.
 */
export function ProvisionOwnerModal({
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ProvisionOwnerModalProps) {
  const [form, setForm] = useState<ProvisionOwnerPayload>({
    email: "",
    fullName: "",
    phoneNumber: "",
    facilityId: "",
  });
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    phoneNumber: false,
    facilityId: false,
  });

  /** Cập nhật từng trường trong biểu mẫu cấp tài khoản OWNER. */
  const update = (field: keyof ProvisionOwnerPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const payload: ProvisionOwnerPayload = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
        // API nhận số điện thoại dạng 10 chữ số liên tiếp sau khi chuẩn hóa.
      phoneNumber: normalizedPhone,
      facilityId: form.facilityId.trim(),
    };
    if (provisionInvalid) return;

    await onSubmit(payload);
  };

  const markTouched = (field: keyof typeof touched) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const showFieldError = (field: keyof typeof touched) =>
    touched[field];
  const emailInvalid =
    form.email.trim().length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const normalizedPhone = form.phoneNumber.replace(/[\s()-]/g, "");
  // Chỉ chấp nhận số di động Việt Nam 10 chữ số với đầu số hợp lệ.
  const phoneInvalid =
    form.phoneNumber.trim().length > 0 &&
    !/^(03|05|07|08|09)\d{8}$/.test(normalizedPhone);
  const provisionInvalid =
    form.fullName.trim().length === 0 ||
    form.email.trim().length === 0 ||
    emailInvalid ||
    form.phoneNumber.trim().length === 0 ||
    phoneInvalid ||
    form.facilityId.trim().length === 0;

  return (
    <ModalShell
      title="Cấp tài khoản chủ cơ sở"
      description="Tài khoản chỉ được tạo bởi cán bộ có thẩm quyền."
      onClose={onClose}
      canClose={!isSubmitting}
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5 px-6 py-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-label block space-y-2">
            Họ và tên
            <input
              id="owner-full-name"
              required
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              onBlur={() => markTouched("fullName")}
              placeholder="Nguyễn Văn An"
              aria-invalid={showFieldError("fullName") && form.fullName.trim().length === 0}
              aria-describedby={
                showFieldError("fullName") && form.fullName.trim().length === 0
                  ? "owner-full-name-error"
                  : undefined
              }
              className="field-control"
            />
            {showFieldError("fullName") && form.fullName.trim().length === 0 && (
              <span id="owner-full-name-error" role="alert" className="caption-copy block font-medium text-red-600">
                Vui lòng nhập họ và tên hợp lệ.
              </span>
            )}
          </label>
          <label className="form-label block space-y-2">
            Email đăng nhập
            <input
              id="owner-email"
              required
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              onBlur={() => markTouched("email")}
              placeholder="chucoso@doanhnghiep.vn"
              aria-invalid={
                showFieldError("email") &&
                (form.email.trim().length === 0 || emailInvalid)
              }
              aria-describedby={
                showFieldError("email") &&
                (form.email.trim().length === 0 || emailInvalid)
                  ? "owner-email-error"
                  : undefined
              }
              className="field-control"
            />
            {showFieldError("email") &&
              (form.email.trim().length === 0 || emailInvalid) && (
                <span id="owner-email-error" role="alert" className="caption-copy block font-medium text-red-600">
                  {form.email.trim().length === 0
                    ? "Vui lòng nhập email."
                    : "Vui lòng nhập email hợp lệ."}
                </span>
              )}
          </label>
          <label className="form-label block space-y-2">
            Số điện thoại
            <input
              id="owner-phone"
              required
              inputMode="tel"
              value={form.phoneNumber}
              onChange={(event) => update("phoneNumber", event.target.value)}
              onBlur={() => markTouched("phoneNumber")}
              placeholder="090 000 0000"
              aria-invalid={
                showFieldError("phoneNumber") &&
                (form.phoneNumber.trim().length === 0 || phoneInvalid)
              }
              aria-describedby={
                showFieldError("phoneNumber") &&
                (form.phoneNumber.trim().length === 0 || phoneInvalid)
                  ? "owner-phone-error"
                  : undefined
              }
              className="field-control"
            />
            {showFieldError("phoneNumber") &&
              (form.phoneNumber.trim().length === 0 || phoneInvalid) && (
                <span id="owner-phone-error" role="alert" className="caption-copy block font-medium text-red-600">
                  {form.phoneNumber.trim().length === 0
                    ? "Vui lòng nhập số điện thoại."
                    : "Số điện thoại phải có 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09."}
                </span>
              )}
          </label>
          <label className="form-label block space-y-2">
            Mã cơ sở
            <input
              id="owner-facility-id"
              required
              value={form.facilityId}
              onChange={(event) => update("facilityId", event.target.value)}
              onBlur={() => markTouched("facilityId")}
              placeholder="CS-HCM-0001"
              aria-invalid={
                showFieldError("facilityId") &&
                form.facilityId.trim().length === 0
              }
              aria-describedby={
                showFieldError("facilityId") &&
                form.facilityId.trim().length === 0
                  ? "owner-facility-id-error"
                  : undefined
              }
              className="field-control"
            />
            {showFieldError("facilityId") &&
              form.facilityId.trim().length === 0 && (
                <span id="owner-facility-id-error" role="alert" className="caption-copy block font-medium text-red-600">
                  Vui lòng nhập mã cơ sở hợp lệ.
                </span>
              )}
          </label>
        </div>

        <div className="body-copy rounded-xl bg-blue-50 px-4 py-3 text-blue-800">
          Mật khẩu tạm thời sẽ được sinh tự động. Chủ cơ sở bắt buộc đổi mật
          khẩu ở lần đăng nhập đầu tiên.
        </div>

        {error && (
          <p role="alert" className="body-copy rounded-lg bg-red-50 px-4 py-3 text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="button-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting || provisionInvalid}
            className="button-primary"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Đang cấp tài khoản..." : "Cấp tài khoản"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface ChangePasswordModalProps {
  isSubmitting: boolean;
  error: string | null;
  isMandatory?: boolean;
  onClose: () => void;
  onSubmit: (payload: ChangePasswordPayload) => Promise<void>;
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  autoComplete: "current-password" | "new-password";
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  onBlur?: () => void;
  minLength?: number;
  error?: string;
}

/** Trường nhập mật khẩu dùng chung, hỗ trợ ẩn/hiện nội dung. */
function PasswordField({
  id,
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggleVisibility,
  onBlur,
  minLength,
  error,
}: PasswordFieldProps) {
  return (
    <label className="form-label block space-y-2">
      {label}
      <span className="relative block">
        <input
          id={id}
          required
          minLength={minLength}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="field-control pr-11"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          aria-label={
            visible
              ? `Ẩn ${label.toLowerCase()}`
              : `Hiện ${label.toLowerCase()}`
          }
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {error && (
        <span id={`${id}-error`} role="alert" className="caption-copy block font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * Modal thay đổi mật khẩu cá nhân, yêu cầu nhập mật khẩu hiện tại và mật khẩu mới.
 * Mật khẩu mới phải dài tối thiểu 8 ký tự và không được trùng với mật khẩu cũ.
 */
export function ChangePasswordModal({
  isSubmitting,
  error,
  isMandatory = false,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [form, setForm] = useState<ChangePasswordPayload>({
    currentPassword: "",
    newPassword: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const currentPasswordEmpty = form.currentPassword.length === 0;
  const newPasswordEmpty = form.newPassword.length === 0;
  const confirmPasswordEmpty = confirmPassword.length === 0;
  const reusesCurrentPassword =
    form.currentPassword.length > 0 &&
    form.currentPassword === form.newPassword;
  const newPasswordTooShort =
    form.newPassword.length > 0 && form.newPassword.length < 8;
  const confirmPasswordTooShort =
    confirmPassword.length > 0 && confirmPassword.length < 8;
  const passwordsDoNotMatch =
    confirmPassword.length > 0 && form.newPassword !== confirmPassword;
  const isFormInvalid =
    currentPasswordEmpty ||
    newPasswordEmpty ||
    confirmPasswordEmpty ||
    newPasswordTooShort ||
    confirmPasswordTooShort ||
    reusesCurrentPassword ||
    passwordsDoNotMatch;

  // Kiểm tra lại trước khi gọi API để không phụ thuộc riêng vào trạng thái nút.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormInvalid || isSubmitting) return;
    await onSubmit(form);
  };

  const markTouched = (field: keyof typeof touched) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  return (
    <ModalShell
      title="Đổi mật khẩu"
      description="Sử dụng mật khẩu dài tối thiểu 8 ký tự và xác nhận lại mật khẩu mới."
      onClose={onClose}
      canClose={!isMandatory && !isSubmitting}
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5 px-6 py-6"
      >
        <PasswordField
          id="current-password"
          label="Mật khẩu hiện tại"
          value={form.currentPassword}
          visible={visibleFields.currentPassword}
          autoComplete="current-password"
          onChange={(value) =>
            setForm((current) => ({ ...current, currentPassword: value }))
          }
          onToggleVisibility={() =>
            setVisibleFields((current) => ({
              ...current,
              currentPassword: !current.currentPassword,
            }))
          }
          onBlur={() => markTouched("currentPassword")}
          error={
            touched.currentPassword && currentPasswordEmpty
              ? "Vui lòng nhập mật khẩu hiện tại."
              : undefined
          }
        />
        <PasswordField
          id="new-password"
          label="Mật khẩu mới"
          value={form.newPassword}
          visible={visibleFields.newPassword}
          autoComplete="new-password"
          minLength={8}
          onChange={(value) =>
            setForm((current) => ({ ...current, newPassword: value }))
          }
          onToggleVisibility={() =>
            setVisibleFields((current) => ({
              ...current,
              newPassword: !current.newPassword,
            }))
          }
          onBlur={() => markTouched("newPassword")}
          error={
            touched.newPassword && newPasswordEmpty
              ? "Vui lòng nhập mật khẩu mới."
              : (touched.newPassword || form.newPassword.length > 0) &&
                  newPasswordTooShort
              ? "Mật khẩu mới phải có ít nhất 8 ký tự."
              : (touched.newPassword || form.newPassword.length > 0) &&
                  reusesCurrentPassword
              ? "Mật khẩu mới phải khác mật khẩu hiện tại."
              : undefined
          }
        />
        <PasswordField
          id="confirm-password"
          label="Nhập lại mật khẩu mới"
          value={confirmPassword}
          visible={visibleFields.confirmPassword}
          autoComplete="new-password"
          minLength={8}
          onChange={setConfirmPassword}
          onToggleVisibility={() =>
            setVisibleFields((current) => ({
              ...current,
              confirmPassword: !current.confirmPassword,
            }))
          }
          onBlur={() => markTouched("confirmPassword")}
          error={
            touched.confirmPassword && confirmPasswordEmpty
              ? "Vui lòng nhập lại mật khẩu mới."
              : (touched.confirmPassword || confirmPassword.length > 0) &&
                  confirmPasswordTooShort
              ? "Mật khẩu xác nhận phải có ít nhất 8 ký tự."
              : (touched.confirmPassword || confirmPassword.length > 0) &&
                  passwordsDoNotMatch
              ? "Mật khẩu xác nhận không khớp với mật khẩu mới."
              : undefined
          }
        />

        {error && (
          <p role="alert" className="body-copy rounded-lg bg-red-50 px-4 py-3 text-red-700">
            {error}
          </p>
        )}
        {isFormInvalid && !isSubmitting && (
          <p className="caption-copy text-slate-500">
            Nhập đủ thông tin và đáp ứng các điều kiện để lưu mật khẩu.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="button-secondary"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || isFormInvalid}
            className="button-primary"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Đang cập nhật..." : "Lưu mật khẩu"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
