/**
 * apiClient.ts
 *
 * Centralized HTTP client for ScannerApp backend API.
 * Handles access token attachment, automatic token refresh on 401,
 * and unified error reporting.
 */

import { getApiBaseUrl } from './apiConfig';

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type UserProfile = {
  _id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  authProvider: 'email_otp' | 'google' | 'hybrid';
  isEmailVerified: boolean;
  deviceCount?: number;
  lastLoginAt?: string;
  createdAt: string;
};

export type DeviceRecord = {
  _id: string;
  userId: string;
  deviceId: string;
  platform: 'android' | 'windows' | 'ios' | 'web';
  deviceName: string;
  osVersion: string;
  appVersion: string;
  specs: {
    totalStorageBytes: number | null;
    freeStorageBytes: number | null;
    totalMemoryBytes: number | null;
    cpuCores: number | null;
  };
  lastActiveAt: string;
  createdAt: string;
};

// In-memory token store (persisted in session)
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

export function setAuthTokens(tokens: { accessToken: string | null; refreshToken: string | null }) {
  currentAccessToken = tokens.accessToken;
  currentRefreshToken = tokens.refreshToken;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function getRefreshToken(): string | null {
  return currentRefreshToken;
}

/**
 * Core HTTP request handler
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: `HTTP ${response.status}: Failed to parse server response`,
      },
    }));

    // Auto refresh token if access token expired (401)
    if (
      response.status === 401 &&
      !isRetry &&
      currentRefreshToken &&
      endpoint !== '/api/v1/auth/refresh' &&
      endpoint !== '/api/v1/auth/otp/verify'
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(endpoint, options, true);
      }
    }

    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network connection failed';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Cannot reach server at ${baseUrl}. Ensure backend is running. (${message})`,
      },
    };
  }
}

/**
 * Exchange refresh token for fresh access token
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!currentRefreshToken) return false;

  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    const result = await res.json();
    if (result.success && result.data?.accessToken) {
      currentAccessToken = result.data.accessToken;
      if (result.data.refreshToken) {
        currentRefreshToken = result.data.refreshToken;
      }
      return true;
    }
  } catch {
    // Refresh failed
  }

  // Clear stale tokens
  currentAccessToken = null;
  currentRefreshToken = null;
  return false;
}

// ─── Exported API Modules ───────────────────────────────────────────────────

export const api = {
  auth: {
    sendOtp: (email: string, purpose: 'login' | 'register' = 'login') =>
      request<{ email: string; cooldownSeconds: number; expiresInMinutes: number }>(
        '/api/v1/auth/otp/send',
        {
          method: 'POST',
          body: JSON.stringify({ email, purpose }),
        }
      ),

    verifyOtp: async (email: string, otp: string) => {
      const res = await request<{
        user: UserProfile;
        accessToken: string;
        refreshToken: string;
      }>('/api/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });

      if (res.success && res.data?.accessToken) {
        setAuthTokens({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
      }
      return res;
    },

    googleAuth: async (idToken: string) => {
      const res = await request<{
        user: UserProfile;
        accessToken: string;
        refreshToken: string;
      }>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });

      if (res.success && res.data?.accessToken) {
        setAuthTokens({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
      }
      return res;
    },

    logout: async () => {
      const res = await request<Record<string, never>>('/api/v1/auth/logout', {
        method: 'POST',
      });
      setAuthTokens({ accessToken: null, refreshToken: null });
      return res;
    },
  },

  user: {
    getMe: () => request<UserProfile>('/api/v1/users/me'),
    updateMe: (data: { name?: string; avatarUrl?: string | null }) =>
      request<UserProfile>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  device: {
    register: (payload: {
      deviceId: string;
      platform: 'android' | 'windows' | 'ios' | 'web';
      deviceName?: string;
      osVersion?: string;
      appVersion?: string;
      specs?: {
        totalStorageBytes?: number | null;
        freeStorageBytes?: number | null;
        totalMemoryBytes?: number | null;
        cpuCores?: number | null;
      };
    }) =>
      request<DeviceRecord>('/api/v1/devices/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    list: () => request<DeviceRecord[]>('/api/v1/devices'),
    delete: (deviceId: string) =>
      request<{ deviceId: string }>(`/api/v1/devices/${deviceId}`, {
        method: 'DELETE',
      }),
  },
};
