import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from "react";
import { ChevronDown, Eye, EyeOff, Loader2, X } from "lucide-react";
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

interface ProvisionOwnerFormState {
  email: string;
  fullName: string;
  phoneNumber: string;
  facilityId: string;
}

interface ProvisionOwnerModalProps {
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: ProvisionOwnerPayload) => Promise<void>;
  facilityOptions?: readonly FacilityOption[];
  facilitySourceState?: FacilitySourceState;
  facilitySourceError?: string | null;
}

export interface FacilityOption {
  id: string;
  name: string;
  address?: string | null;
  code?: string | null;
}

export type FacilitySourceState = "unavailable" | "loading" | "ready" | "error";

const defaultFacilityOptions: readonly FacilityOption[] = [];

/**
 * Modal cấp tài khoản OWNER cho chủ cơ sở PCCC.
 * Thu thập thông tin người dùng và mã cơ sở được liên kết.
 */
export function ProvisionOwnerModal({
  isSubmitting,
  error,
  onClose,
  onSubmit,
  facilityOptions = defaultFacilityOptions,
  facilitySourceState = "unavailable",
  facilitySourceError = null,
}: ProvisionOwnerModalProps) {
  const [form, setForm] = useState<ProvisionOwnerFormState>({
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
  const [facilityQuery, setFacilityQuery] = useState("");
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [activeFacilityIndex, setActiveFacilityIndex] = useState(-1);
  const facilityComboboxRef = useRef<HTMLDivElement>(null);
  const facilityInputRef = useRef<HTMLInputElement>(null);
  const facilityListboxId = useId();

  /** Cập nhật từng trường trong biểu mẫu cấp tài khoản OWNER. */
  const update = (field: keyof ProvisionOwnerFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedFacility = facilityOptions.find(
    (facility) => facility.id === form.facilityId,
  );
  const normalizedFacilityQuery = facilityQuery.trim().toLowerCase();
  const filteredFacilities = useMemo(
    () =>
      facilityOptions.filter((facility) => {
        if (!normalizedFacilityQuery) return true;
        return [facility.name, facility.address, facility.code]
          .filter((value): value is string => Boolean(value))
          .some((value) =>
            value.toLowerCase().includes(normalizedFacilityQuery),
          );
      }),
    [facilityOptions, normalizedFacilityQuery],
  );
  const facilitySelectionReady =
    facilitySourceState === "ready" && Boolean(selectedFacility);
  const facilitySelectionEnabled =
    facilitySourceState === "ready" && facilityOptions.length > 0;
  const facilityListboxVisible =
    facilityOpen && facilitySelectionEnabled && filteredFacilities.length > 0;

  const updateFacilityQuery = (value: string) => {
    setFacilityQuery(value);
    setFacilityOpen(true);
    setActiveFacilityIndex(0);
    if (form.facilityId) {
      update("facilityId", "");
    }
  };

  const selectFacility = (facility: FacilityOption) => {
    update("facilityId", facility.id);
    setFacilityQuery(facility.name);
    setFacilityOpen(false);
    setActiveFacilityIndex(-1);
    markTouched("facilityId");
  };

  const resetFacilityQueryToSelection = () => {
    setFacilityQuery(selectedFacility?.name ?? "");
    setFacilityOpen(false);
    setActiveFacilityIndex(-1);
  };

  const handleFacilityKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape" && facilityOpen) {
      event.preventDefault();
      event.stopPropagation();
      resetFacilityQueryToSelection();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFacilityOpen(true);
      setActiveFacilityIndex((index) =>
        Math.min(index + 1, filteredFacilities.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFacilityOpen(true);
      setActiveFacilityIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && facilityOpen) {
      event.preventDefault();
      const activeFacility = filteredFacilities[activeFacilityIndex];
      if (activeFacility) selectFacility(activeFacility);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const payload: ProvisionOwnerPayload = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      // API nhận số điện thoại dạng 10 chữ số liên tiếp sau khi chuẩn hóa.
      phone: normalizedPhone,
      facilityId: selectedFacility?.id ?? "",
    };
    if (provisionInvalid) return;

    await onSubmit(payload);
  };

  const markTouched = (field: keyof typeof touched) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const showFieldError = (field: keyof typeof touched) =>
    touched[field];
  const facilityValidationError =
    showFieldError("facilityId") &&
    facilitySourceState === "ready" &&
    !facilitySelectionReady;
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
    !facilitySelectionReady;
  const facilityStatusMessage =
    facilitySourceState === "loading"
      ? "Đang tải danh sách cơ sở đủ điều kiện..."
      : facilitySourceState === "error"
        ? facilitySourceError ?? "Không thể tải danh sách cơ sở."
        : facilitySourceState === "unavailable"
          ? "Chưa có API danh sách cơ sở đủ điều kiện. Chưa thể cấp tài khoản."
          : facilityOptions.length === 0
            ? "Chưa có cơ sở đủ điều kiện để cấp tài khoản."
            : filteredFacilities.length === 0
              ? "Không tìm thấy cơ sở phù hợp."
              : null;
  const facilityStatusId = "owner-facility-status";
  const facilityDescriptionIds = [
    facilityStatusMessage ? facilityStatusId : null,
    facilityValidationError ? "owner-facility-id-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

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
          <div className="form-label space-y-2">
            <label htmlFor="owner-facility-id">Cơ sở cấp tài khoản</label>
            <div
              ref={facilityComboboxRef}
              className="relative"
              onBlur={(event) => {
                markTouched("facilityId");
                if (
                  !facilityComboboxRef.current?.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  resetFacilityQueryToSelection();
                }
              }}
            >
              <div className="relative">
                <input
                  ref={facilityInputRef}
                  id="owner-facility-id"
                  required
                  disabled={!facilitySelectionEnabled}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={
                    facilityListboxVisible ? facilityListboxId : undefined
                  }
                  aria-expanded={facilityListboxVisible}
                  aria-activedescendant={
                    facilityListboxVisible &&
                    activeFacilityIndex >= 0 &&
                    filteredFacilities[activeFacilityIndex]
                      ? `${facilityListboxId}-option-${activeFacilityIndex}`
                      : undefined
                  }
                  value={facilityQuery}
                  onFocus={() => {
                    setFacilityOpen(true);
                    setActiveFacilityIndex(
                      filteredFacilities.length > 0 ? 0 : -1,
                    );
                  }}
                  onChange={(event) => updateFacilityQuery(event.target.value)}
                  onKeyDown={handleFacilityKeyDown}
                  placeholder="Tìm theo tên hoặc mã cơ sở..."
                  aria-invalid={facilityValidationError}
                  aria-describedby={
                    facilityDescriptionIds || undefined
                  }
                  className="field-control pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!facilitySelectionEnabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setFacilityOpen((open) => !open);
                    setActiveFacilityIndex(
                      filteredFacilities.length > 0 ? 0 : -1,
                    );
                    facilityInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  aria-label={
                    facilityOpen
                      ? "Đóng danh sách cơ sở"
                      : "Mở danh sách cơ sở"
                  }
                  aria-expanded={facilityListboxVisible}
                  aria-controls={
                    facilityListboxVisible ? facilityListboxId : undefined
                  }
                >
                  <ChevronDown
                    size={17}
                    className={facilityOpen ? "rotate-180 transition" : "transition"}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {facilityListboxVisible && (
                  <ul
                    id={facilityListboxId}
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    {filteredFacilities.map((facility, index) => (
                      <li
                        key={facility.id}
                        id={`${facilityListboxId}-option-${index}`}
                        role="option"
                        aria-selected={facility.id === form.facilityId}
                        className={`cursor-pointer px-3 py-2.5 text-sm ${
                          index === activeFacilityIndex
                            ? "bg-blue-50 text-blue-800"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectFacility(facility)}
                      >
                        <span className="block font-semibold">
                          {facility.name}
                        </span>
                        {(facility.code || facility.address) && (
                          <span className="caption-copy mt-0.5 block text-slate-500">
                            {[facility.code, facility.address]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
              )}
            </div>
            {facilityStatusMessage && (
              <span
                id={facilityStatusId}
                role={facilitySourceState === "error" ? "alert" : "status"}
                className={`caption-copy block ${
                  facilitySourceState === "error"
                    ? "font-medium text-red-600"
                    : "text-slate-500"
                }`}
              >
                {facilityStatusMessage}
              </span>
            )}
            {facilityValidationError && (
              <span id="owner-facility-id-error" role="alert" className="caption-copy block font-medium text-red-600">
                Vui lòng chọn một cơ sở từ danh sách.
              </span>
            )}
          </div>
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
    oldPassword: "",
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
  const currentPasswordEmpty = form.oldPassword.length === 0;
  const newPasswordEmpty = form.newPassword.length === 0;
  const confirmPasswordEmpty = confirmPassword.length === 0;
  const reusesCurrentPassword =
    form.oldPassword.length > 0 &&
    form.oldPassword === form.newPassword;
  const newPasswordTooShort =
    form.newPassword.length > 0 && form.newPassword.length < 8;
  const newPasswordHasUppercase = /[A-Z]/.test(form.newPassword);
  const newPasswordHasNumber = /\d/.test(form.newPassword);
  const newPasswordHasSpecialCharacter = /[\p{P}\p{S}]/u.test(
    form.newPassword,
  );
  const confirmPasswordTooShort =
    confirmPassword.length > 0 && confirmPassword.length < 8;
  const passwordsDoNotMatch =
    confirmPassword.length > 0 && form.newPassword !== confirmPassword;
  const isFormInvalid =
    currentPasswordEmpty ||
    newPasswordEmpty ||
    confirmPasswordEmpty ||
    newPasswordTooShort ||
    !newPasswordHasUppercase ||
    !newPasswordHasNumber ||
    !newPasswordHasSpecialCharacter ||
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
      description="Mật khẩu mới cần tối thiểu 8 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt."
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
          value={form.oldPassword}
          visible={visibleFields.currentPassword}
          autoComplete="current-password"
          onChange={(value) =>
            setForm((current) => ({ ...current, oldPassword: value }))
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
                  !newPasswordHasUppercase
              ? "Mật khẩu mới phải có ít nhất 1 chữ hoa."
              : (touched.newPassword || form.newPassword.length > 0) &&
                  !newPasswordHasNumber
              ? "Mật khẩu mới phải có ít nhất 1 chữ số."
              : (touched.newPassword || form.newPassword.length > 0) &&
                  !newPasswordHasSpecialCharacter
              ? "Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt."
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
