import type { AuthProvider } from "@refinedev/core";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Backend expects idToken; for local dev we pass email as idToken and attach device info.
        body: JSON.stringify({
          idToken: email,
          deviceType: "WEB",
          deviceName: "client-app",
          deviceId: "client-local",
          rememberMe: true,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            name: "LoginError",
            message: error.message || "Invalid credentials",
          },
        };
      }

      const data = await response.json();

      if (data.user.userType !== "B2B") {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "This portal is for company members only",
          },
        };
      }

      const accessToken = data.accessToken || "dev-token";
      localStorage.setItem("access_token", accessToken);

      localStorage.setItem("user", JSON.stringify(data.user));

      const pendingInvite = sessionStorage.getItem("pending_invite_code");
      if (pendingInvite) {
        sessionStorage.removeItem("pending_invite_code");
        return { success: true, redirectTo: `/invite/${pendingInvite}` };
      }

      return { success: true, redirectTo: "/company/members" };
    } catch {
      return {
        success: false,
        error: { name: "LoginError", message: "An error occurred" },
      };
    }
  },

  logout: async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return { authenticated: false, redirectTo: "/login" };
    try {
      const user = JSON.parse(userStr);
      if (user.userType !== "B2B") throw new Error();
      return { authenticated: true };
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  getIdentity: async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return {
        id: user.id,
        name: user.displayName || user.email,
        email: user.email,
        avatar: user.avatarUrl,
        role: user.b2bRole,
        companyName: user.company?.name,
      };
    } catch {
      return null;
    }
  },

  getPermissions: async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return { role: user.b2bRole };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    if (error.statusCode === 401)
      return { logout: true, redirectTo: "/login" };
    return { error };
  },
};

