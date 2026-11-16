import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Flame,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Map,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  TriangleAlert,
  UnlockKeyhole,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useAuthStore } from "../../stores/useAuthStore";
import pcccLogo from "../../assets/pccc-logo.png";
import "./userManagement.css";
import {
  ChangePasswordModal,
  ProvisionOwnerModal,
} from "./UserManagementModals";
import type {
  ApiEnvelope,
  ChangePasswordPayload,
  ManagedUser,
  ProvisionOwnerPayload,
  StatusPayload,
} from "./userManagement.types";

type UserFilter = "ALL" | "ADMIN" | "LEADER" | "INSPECTOR" | "OWNER";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type PaginationItem = number | "ellipsis";

const USERS_PER_PAGE = 10;
const paginationFixtureEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_USER_MANAGEMENT_FIXTURE === "pagination-23";
const paginationFixtureModulePath =
  "./userManagement.pagination.fixture";

const roleLabels: Record<ManagedUser["role"], string> = {
  ADMIN: "Quản trị viên",
  LEADER: "Lãnh đạo",
  INSPECTOR: "Cán bộ kiểm tra",
  OWNER: "Chủ cơ sở",
};

const roleBadgeClasses: Record<ManagedUser["role"], string> = {
  ADMIN: "bg-violet-50 text-violet-700",
  LEADER: "bg-indigo-50 text-indigo-700",
  INSPECTOR: "bg-cyan-50 text-cyan-700",
  OWNER: "bg-amber-50 text-amber-700",
};

const managedUserRoles = new Set<ManagedUser["role"]>([
  "ADMIN",
  "LEADER",
  "INSPECTOR",
  "OWNER",
]);

const navItems = [
  { label: "Tổng quan", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Bản đồ PCCC", icon: Map, path: "/map" },
  { label: "Cơ sở PCCC", icon: Building2, path: "/facilities" },
  { label: "Thiết bị PCCC", icon: Flame, path: "/equipments" },
  { label: "Lịch kiểm tra", icon: CalendarDays, path: "/schedules" },
  {
    label: "Vi phạm & Sự cố",
    icon: TriangleAlert,
    path: "/violations-incidents",
  },
  { label: "Quản trị User", icon: Users, path: "/admin/users" },
];

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

function BrandMark() {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm">
      <img src={pcccLogo} alt="" className="h-full w-full rounded-xl object-contain" />
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa đăng nhập";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    return (
      response?.data?.message ??
      "Không thể hoàn tất thao tác. Vui lòng thử lại."
    );
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Không thể kết nối máy chủ. Vui lòng kiểm tra API và thử lại.";
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.success === "boolean" &&
    typeof candidate.message === "string" &&
    "data" in candidate
  );
}

function isApiErrorEnvelope(
  value: unknown,
): value is { success: false; message: string } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.success === false && typeof candidate.message === "string";
}

function extractApiData<T>(response: unknown): T {
  let envelope: ApiEnvelope<T> | null = null;

  if (isApiErrorEnvelope(response)) {
    throw new Error(response.message);
  }

  if (isApiEnvelope<T>(response)) {
    envelope = response;
  } else if (typeof response === "object" && response !== null) {
    const candidate = response as { data?: unknown };
    if (isApiErrorEnvelope(candidate.data)) {
      throw new Error(candidate.data.message);
    }
    if (isApiEnvelope<T>(candidate.data)) {
      envelope = candidate.data;
    }
  }

  if (!envelope) {
    throw new Error("Phản hồi API không đúng định dạng.");
  }

  if (!envelope.success) {
    throw new Error(envelope.message || "API không thể trả về dữ liệu.");
  }

  return envelope.data;
}

function isManagedUser(value: unknown): value is ManagedUser {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  const optionalStrings = [
    "phone",
    "areaCode",
    "facilityId",
    "lastLoginAt",
    "createdAt",
  ];

  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.fullName === "string" &&
    typeof candidate.isActive === "boolean" &&
    typeof candidate.role === "string" &&
    managedUserRoles.has(candidate.role as ManagedUser["role"]) &&
    optionalStrings.every(
      (field) =>
        candidate[field] === undefined ||
        candidate[field] === null ||
        typeof candidate[field] === "string",
    ) &&
    (candidate.mustChangePassword === undefined ||
      candidate.mustChangePassword === null ||
      typeof candidate.mustChangePassword === "boolean")
  );
}

function isManagedUserList(value: unknown): value is ManagedUser[] {
  return Array.isArray(value) && value.every(isManagedUser);
}

export function UserManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tableSearchRef = useRef<HTMLInputElement>(null);
  const headerSearchContainerRef = useRef<HTMLDivElement>(null);
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      if (paginationFixtureEnabled) {
        const fixtureModulePath = paginationFixtureModulePath;
        const { paginationFixtureUsers } = await import(
          /* @vite-ignore */ fixtureModulePath
        );
        setUsers(paginationFixtureUsers);
        return;
      }

      const response: unknown =
        await apiClient.get<ApiEnvelope<ManagedUser[]>>("/v1/users");
      const usersData = extractApiData<unknown>(response);
      if (!isManagedUserList(usersData)) {
        throw new Error("Dữ liệu danh sách người dùng không đúng định dạng.");
      }
      setUsers(usersData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Quản trị người dùng | Hệ thống PCCC G1.8";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.fullName.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE),
  );
  const effectivePage = Math.min(
    Math.max(currentPage, 1),
    totalPages,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [query, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (effectivePage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [effectivePage, filteredUsers]);

  const displayStart =
    filteredUsers.length === 0 ? 0 : (effectivePage - 1) * USERS_PER_PAGE + 1;
  const displayEnd = Math.min(
    effectivePage * USERS_PER_PAGE,
    filteredUsers.length,
  );
  const paginationItems = getPaginationItems(effectivePage, totalPages);

  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  const provisionOwner = async (payload: ProvisionOwnerPayload) => {
    setModalError(null);
    setActionId("provision");
    try {
      await apiClient.post<ApiEnvelope<ManagedUser>>(
        "/v1/users/provision-owner",
        payload,
      );
      setProvisionOpen(false);
      setNotice("Đã cấp tài khoản chủ cơ sở thành công.");
      await loadUsers();
    } catch (requestError) {
      setModalError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  };

  const changePassword = async (payload: ChangePasswordPayload) => {
    setModalError(null);
    setActionId("password");
    try {
      await apiClient.patch<ApiEnvelope<null>>(
        "/v1/auth/change-password",
        payload,
      );
      setPasswordOpen(false);
      setNotice("Mật khẩu đã được cập nhật.");
    } catch (requestError) {
      setModalError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  };

  const updateStatus = async (user: ManagedUser) => {
    const action = user.isActive ? "khóa" : "kích hoạt";
    if (
      !window.confirm(
        `Bạn có chắc muốn ${action} tài khoản "${user.fullName}"?`,
      )
    )
      return;
    setActionId(user.id);
    setError(null);
    try {
      const payload: StatusPayload = { isActive: !user.isActive };
      await apiClient.patch<ApiEnvelope<ManagedUser>>(
        `/v1/users/${user.id}/status`,
        payload,
      );
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, isActive: payload.isActive } : item,
        ),
      );
      setNotice(
        payload.isActive ? "Đã kích hoạt tài khoản." : "Đã khóa tài khoản.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  };

  const resetPassword = async (user: ManagedUser) => {
    if (
      !window.confirm(
        `Reset mật khẩu cho "${user.fullName}"? Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập tiếp theo.`,
      )
    )
      return;
    setActionId(user.id);
    setError(null);
    try {
      await apiClient.post<ApiEnvelope<ManagedUser>>(
        `/v1/users/${user.id}/reset-password`,
      );
      setNotice(`Đã reset mật khẩu cho ${user.fullName}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans text-slate-900">
      <aside
        id="primary-sidebar"
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#0d3b6e] text-white transition-[width] duration-200 ease-out lg:flex ${sidebarCollapsed ? "w-[72px]" : "w-[264px]"}`}
      >
        <div className="h-[72px] border-b border-white/10">
          <div className={`flex h-[72px] items-center gap-3 ${sidebarCollapsed ? "justify-center px-3" : "px-5"}`}>
            {sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="group/brand-toggle relative flex h-11 w-11 items-center justify-center rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Mở rộng thanh bên"
                aria-expanded={false}
                aria-controls="primary-sidebar"
                title="Mở rộng thanh bên"
              >
                <BrandMark />
                <span className="brand-toggle-icon">
                  <PanelLeftOpen size={20} strokeWidth={2.2} />
                </span>
                <span className="sidebar-tooltip">Mở rộng thanh bên</span>
              </button>
            ) : (
              <BrandMark />
            )}
            <div className={sidebarCollapsed ? "hidden" : "min-w-0"}>
              <p className="text-[13px] font-extrabold leading-tight tracking-tight">
                QUẢN LÝ CƠ SỞ PCCC
              </p>
            </div>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-blue-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Thu gọn thanh bên"
                aria-expanded
                aria-controls="primary-sidebar"
                title="Thu gọn thanh bên"
              >
                <PanelLeftClose size={20} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
        <nav className={`flex-1 space-y-1 py-5 ${sidebarCollapsed ? "px-2" : "px-3"}`} aria-label="Điều hướng chính">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active =
              location.pathname === path ||
              location.pathname.startsWith(`${path}/`);

            return (
              <button
                key={label}
                type="button"
                onClick={() => navigate(path)}
                className={`group/sidebar-item relative flex w-full items-center rounded-lg py-3 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/40 ${
                  sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"
                } ${
                  active
                    ? "bg-white/20 font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                    : "text-blue-100 hover:bg-white/10"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={2.1} />
                {!sidebarCollapsed && label}
                {sidebarCollapsed && (
                  <span className="sidebar-tooltip">{label}</span>
                )}
                {active && (
                  <span
                    aria-hidden="true"
                    className="sidebar-active-marker"
                  />
                )}
              </button>
            );
          })}
        </nav>
        <div className={`border-t border-white/10 p-4 ${sidebarCollapsed ? "px-2" : ""}`}>
          <button
            type="button"
            onClick={logout}
            className={`group/sidebar-item relative flex w-full items-center rounded-lg py-3 text-sm text-blue-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"}`}
            aria-label="Đăng xuất"
          >
            <LogOut size={20} strokeWidth={2.1} />
            {!sidebarCollapsed && "Đăng xuất"}
            {sidebarCollapsed && <span className="sidebar-tooltip">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <main className={`transition-[padding] duration-200 ease-out ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[264px]"}`}>
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-8">
          <nav
            aria-label="Breadcrumb"
            className="min-w-0 flex-1"
          >
            <ol className="flex min-w-0 items-center gap-2 text-[13px] leading-5">
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="cursor-pointer rounded-md px-1 text-[13px] font-medium text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  title="Quay lại trang quản trị hệ thống"
                  aria-label="Quay lại trang quản trị hệ thống"
                >
                  Quản trị hệ thống
                </button>
              </li>
              <li
                aria-hidden="true"
                className="shrink-0 text-lg font-semibold leading-5 text-slate-300"
              >
                ›
              </li>
              <li className="min-w-0 truncate">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="max-w-full cursor-pointer truncate rounded-md px-1 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  title="Tải lại trang Người dùng"
                  aria-label="Tải lại trang Người dùng"
                  aria-current="page"
                >
                  Người dùng
                </button>
              </li>
            </ol>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <div
              ref={headerSearchContainerRef}
              className="relative h-10 w-10"
              onMouseEnter={() => setHeaderSearchOpen(true)}
              onMouseLeave={() => setHeaderSearchOpen(false)}
              onBlur={(event) => {
                if (
                  !headerSearchContainerRef.current?.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setHeaderSearchOpen(false);
                }
              }}
            >
              {headerSearchOpen ? (
                <form
                  className="absolute right-0 top-0 z-10 flex h-10 w-64 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setError(
                      headerQuery.trim()
                        ? "Tìm kiếm toàn hệ thống chưa được kết nối API."
                        : "Vui lòng nhập từ khóa tìm kiếm.",
                    );
                    setNotice(null);
                  }}
                >
                  <input
                    type="search"
                    value={headerQuery}
                    onChange={(event) => setHeaderQuery(event.target.value)}
                    placeholder="Tìm kiếm toàn hệ thống..."
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    aria-label="Tìm kiếm toàn hệ thống"
                  />
                  <button
                    type="submit"
                    className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    aria-label="Thực hiện tìm kiếm toàn hệ thống"
                    title="Tìm kiếm"
                  >
                    <Search size={18} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setHeaderSearchOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  aria-label="Mở tìm kiếm toàn hệ thống"
                  title="Tìm kiếm toàn hệ thống"
                >
                  <Search size={20} />
                </button>
              )}
            </div>
            <button
              type="button"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
              aria-label="Thông báo"
            >
              <Bell size={19} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="flex items-center gap-2 rounded-lg p-1.5 pr-2 text-left hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              aria-label="Mở menu tài khoản"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {currentUser?.fullName?.charAt(0) ?? "A"}
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-semibold text-slate-800">
                  {currentUser?.fullName ?? "Quản trị viên"}
                </span>
                <span className="block text-xs text-slate-400">
                  {currentUser?.role ?? "ADMIN"}
                </span>
              </span>
              <ChevronDown size={15} className="text-slate-400" />
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="page-title">
                Quản trị người dùng
              </h1>
              <p className="page-description">
                Quản lý tài khoản, phân quyền và trạng thái truy cập hệ thống.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setModalError(null);
                setProvisionOpen(true);
              }}
              className="button-primary w-fit whitespace-nowrap"
            >
              <Plus size={17} />
              Cấp tài khoản chủ cơ sở
            </button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Tổng người dùng",
                value: users.length,
                icon: Users,
                tone: "text-blue-700 bg-blue-50",
              },
              {
                label: "Đang hoạt động",
                value: activeCount,
                icon: CheckCircle2,
                tone: "text-emerald-700 bg-emerald-50",
              },
              {
                label: "Bị khóa",
                value: inactiveCount,
                icon: LockKeyhole,
                tone: "text-red-700 bg-red-50",
              },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="body-copy font-medium text-slate-500">{label}</p>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
                  >
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold leading-9 tracking-tight text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {(error || notice) && (
            <div
              className={`mb-5 flex items-start justify-between gap-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
              role="status"
            >
              <div className="flex items-start gap-2">
                {error ? (
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                )}
                <span>{error ?? notice}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                }}
                aria-label="Đóng thông báo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <button
                  type="button"
                  onClick={() => tableSearchRef.current?.focus()}
                  className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  aria-label="Tập trung vào ô tìm kiếm người dùng"
                >
                  <Search size={17} aria-hidden="true" />
                </button>
                <input
                  ref={tableSearchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo tên hoặc email..."
                  className="field-control pl-10"
                  aria-label="Tìm người dùng"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value as UserFilter);
                    setCurrentPage(1);
                  }}
                  className="filter-control"
                  aria-label="Lọc theo vai trò"
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="LEADER">Lãnh đạo</option>
                  <option value="INSPECTOR">Cán bộ kiểm tra</option>
                  <option value="OWNER">Chủ cơ sở</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  className="filter-control"
                  aria-label="Lọc theo trạng thái"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Bị khóa</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="table-heading px-5 py-3">Người dùng</th>
                    <th className="table-heading px-5 py-3">Vai trò</th>
                    <th className="table-heading px-5 py-3">Liên hệ</th>
                    <th className="table-heading px-5 py-3">Trạng thái</th>
                    <th className="table-heading px-5 py-3">
                      Đăng nhập gần nhất
                    </th>
                    <th className="table-heading px-5 py-3 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center text-slate-500"
                      >
                        <Loader2
                          size={22}
                          className="mx-auto mb-2 animate-spin text-blue-600"
                        />
                        Đang tải danh sách người dùng...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center text-slate-500"
                      >
                        Không tìm thấy người dùng phù hợp.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    paginatedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-blue-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                              {user.fullName.charAt(0)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {user.fullName}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${roleBadgeClasses[user.role]}`}
                          >
                            {roleLabels[user.role]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {user.phone ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.isActive ? "text-emerald-700" : "text-red-700"}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-red-500"}`}
                            />
                            {user.isActive ? "Đang hoạt động" : "Bị khóa"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(user.lastLoginAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void updateStatus(user)}
                              disabled={actionId === user.id}
                              className="icon-button"
                              title={
                                user.isActive
                                  ? "Khóa tài khoản"
                                  : "Kích hoạt tài khoản"
                              }
                              aria-label={
                                user.isActive
                                  ? "Khóa tài khoản"
                                  : "Kích hoạt tài khoản"
                              }
                            >
                              {actionId === user.id ? (
                                <Loader2 size={17} className="animate-spin" />
                              ) : user.isActive ? (
                                <LockKeyhole size={17} />
                              ) : (
                                <UnlockKeyhole size={17} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void resetPassword(user)}
                              disabled={actionId === user.id}
                              className="icon-button"
                              title="Reset mật khẩu"
                              aria-label="Reset mật khẩu"
                            >
                              <KeyRound size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="shrink-0">
                Hiển thị {displayStart}–{displayEnd} trên tổng{" "}
                {filteredUsers.length} người dùng
              </span>
              {!loading && filteredUsers.length > 0 && (
                <nav
                  className="flex flex-wrap items-center justify-start gap-1 sm:justify-end"
                  aria-label="Phân trang danh sách người dùng"
                >
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(effectivePage - 1, 1))}
                  disabled={effectivePage === 1}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-slate-400"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                        item === effectivePage
                          ? "border-[#0d3b6e] bg-[#0d3b6e] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      aria-label={`Trang ${item}`}
                      aria-current={
                        item === effectivePage ? "page" : undefined
                      }
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(Math.min(effectivePage + 1, totalPages))
                  }
                  disabled={effectivePage === totalPages}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
                  aria-label="Trang sau"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                </nav>
              )}
            </div>
          </div>
        </section>
      </main>

      {provisionOpen && (
        <ProvisionOwnerModal
          isSubmitting={actionId === "provision"}
          error={modalError}
          onClose={() => setProvisionOpen(false)}
          onSubmit={provisionOwner}
        />
      )}
      {passwordOpen && (
        <ChangePasswordModal
          isSubmitting={actionId === "password"}
          error={modalError}
          onClose={() => setPasswordOpen(false)}
          onSubmit={changePassword}
        />
      )}
    </div>
  );
}
