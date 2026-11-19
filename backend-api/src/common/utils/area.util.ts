/**
 * Chuẩn hóa chuỗi tiếng Việt sang Unicode NFC.
 */
export function normalizeNfc(text: string): string {
  return text ? text.normalize('NFC').trim() : '';
}

/**
 * Tách và chuẩn hóa chuỗi `areaCode` lưu trong CSDL thành mảng các quận/huyện.
 * Ví dụ: "Quận 1, Quận 3, Quận 10" -> ["Quận 1", "Quận 3", "Quận 10"]
 * Tự động loại bỏ trùng lặp và khoảng trắng thừa, đưa về Unicode NFC.
 */
export function parseAreaCodes(areaCodeStr?: string | null): string[] {
  if (!areaCodeStr) return [];
  const parts = areaCodeStr
    .split(',')
    .map((s) => normalizeNfc(s))
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts));
}

/**
 * Kiểm tra xem người dùng có quyền trên khu vực `targetDistrict` hay không.
 * ADMIN và LEADER hoặc tài khoản có areaCode = 'ALL' có quyền trên toàn bộ địa bàn.
 * So khớp CHÍNH XÁC (Exact Match), không dùng chuỗi con (substring) để tránh trường hợp
 * "Quận 1" bị nhầm lẫn quyền với "Quận 10" hay "Quận 11".
 */
export function isAreaAllowed(
  userAreaCode?: string | null,
  targetDistrict?: string | null,
  userRole?: string,
): boolean {
  if (userRole === 'ADMIN' || userRole === 'LEADER') {
    return true;
  }
  if (!targetDistrict) {
    return false;
  }

  const areas = parseAreaCodes(userAreaCode);
  if (areas.includes('ALL')) {
    return true;
  }

  const normalizedTarget = normalizeNfc(targetDistrict);
  return areas.includes(normalizedTarget);
}

/**
 * Xây dựng điều kiện lọc Prisma theo địa bàn (`district`).
 * ADMIN, LEADER hoặc areaCode 'ALL' trả về object rỗng `{}` (không giới hạn).
 * Cán bộ quản lý khu vực được lọc bằng `{ in: areaCodes }` chính xác.
 */
export function buildAreaFilter(user: { role?: string; areaCode?: string | null }): {
  district?: { in: string[] };
} {
  if (user.role === 'ADMIN' || user.role === 'LEADER') {
    return {};
  }
  const areas = parseAreaCodes(user.areaCode);
  if (areas.includes('ALL') || areas.length === 0) {
    return {};
  }
  return {
    district: {
      in: areas,
    },
  };
}

