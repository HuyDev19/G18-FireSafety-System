import type { ManagedUser } from "./userManagement.types";

const fixtureRoles: ManagedUser["role"][] = [
  "ADMIN",
  "LEADER",
  "INSPECTOR",
  "OWNER",
];

export const paginationFixtureUsers: ManagedUser[] = Array.from(
  { length: 23 },
  (_, index) => {
    const userNumber = index + 1;

    return {
      id: `pagination-fixture-${userNumber}`,
      email: `nguoi.dung.${userNumber}@example.test`,
      fullName: `Người dùng kiểm thử ${userNumber}`,
      phone: `09000000${String(userNumber).padStart(2, "0")}`,
      role: fixtureRoles[index % fixtureRoles.length],
      areaCode: "HCM",
      facilityId: `CS-FIXTURE-${String(userNumber).padStart(4, "0")}`,
      isActive: userNumber % 4 !== 0,
      mustChangePassword: false,
      lastLoginAt: `2026-01-${String((userNumber % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
      createdAt: `2025-12-${String((userNumber % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
    };
  },
);
