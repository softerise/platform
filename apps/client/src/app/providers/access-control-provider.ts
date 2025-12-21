import type { AccessControlProvider } from "@refinedev/core";

type B2BRole = "EMPLOYEE" | "TEAM_LEAD" | "HR_MANAGER" | "COMPANY_ADMIN";

const permissions: Record<string, B2BRole[]> = {
  "members.list": ["COMPANY_ADMIN", "HR_MANAGER", "TEAM_LEAD"],
  "members.changeRole": ["COMPANY_ADMIN"],
  "members.remove": ["COMPANY_ADMIN"],
  "invites.list": ["COMPANY_ADMIN", "HR_MANAGER"],
  "invites.create": ["COMPANY_ADMIN", "HR_MANAGER"],
  "invites.cancel": ["COMPANY_ADMIN", "HR_MANAGER"],
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return { can: false };

    let role: B2BRole;
    try {
      const user = JSON.parse(userStr);
      role = user.b2bRole as B2BRole;
    } catch {
      return { can: false };
    }

    if (role === "COMPANY_ADMIN") return { can: true };

    const permissionKey = `${resource}.${action}`;
    const allowedRoles = permissions[permissionKey];
    return { can: allowedRoles?.includes(role) || false };
  },
};

