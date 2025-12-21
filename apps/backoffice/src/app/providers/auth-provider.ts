import type { AuthBindings, HttpError } from '@refinedev/core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const authProvider: AuthBindings = {
  login: async ({ email, password }: { email: string; password: string }) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend expects idToken-style login; for local dev send email as idToken.
        body: JSON.stringify({
          idToken: email,
          deviceType: 'WEB',
          deviceName: 'backoffice',
          deviceId: 'backoffice-local',
          rememberMe: true,
          // password included for future compatibility
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        return {
          success: false,
          error: {
            name: 'LoginError',
            message: error?.message || 'Invalid credentials',
          },
        };
      }

      const data = await response.json();

      const storedUser = {
        ...data.user,
        role: data.user?.role ?? 'SUPER_ADMIN',
      };

      // Backend currently doesn't return a JWT; fall back to a dev token for session tracking.
      const accessToken = data.accessToken || 'dev-token';
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('user', JSON.stringify(storedUser));

      return {
        success: true,
        redirectTo: '/admin/books',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'LoginError',
          message: 'An error occurred during login',
        },
      };
    }
  },

  logout: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    return {
      success: true,
      redirectTo: '/login',
    };
  },

  check: async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return { authenticated: false, redirectTo: '/login' };
    }

    // Backend /auth/me not implemented; trust local token for dev.
    return { authenticated: true };
  },

  getIdentity: async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr);
      return {
        id: user.id,
        name: user.displayName || user.email,
        email: user.email,
        avatar: user.avatarUrl,
        role: user.role,
      };
    } catch {
      return null;
    }
  },

  getPermissions: async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr);
      return { role: user.role };
    } catch {
      return null;
    }
  },

  onError: async (error: HttpError) => {
    if (error?.statusCode === 401) {
      return {
        logout: true,
        redirectTo: '/login',
      };
    }
    return { error };
  },
};

