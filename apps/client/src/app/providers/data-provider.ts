import type { DataProvider } from "@refinedev/core";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const getHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getCompanyId = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user.companyId || user.company?.id || null;
  } catch {
    return null;
  }
};

const resourceMap: Record<string, (companyId: string) => string> = {
  members: (companyId: string) => `auth/company/${companyId}/members`,
  invites: (companyId: string) => `auth/company/${companyId}/invites`,
  company: (companyId: string) => `auth/company/${companyId}`,
};

const resolveEndpoint = (resource: string) => {
  const companyId = getCompanyId();
  const mapper = resourceMap[resource];
  if (mapper) {
    if (!companyId) {
      throw new Error("Missing company context for request");
    }
    return mapper(companyId);
  }
  return resource;
};

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const { current = 1, pageSize = 25 } = pagination ?? {};
    const params = new URLSearchParams();
    params.append("page", String(current));
    params.append("limit", String(pageSize));
    filters?.forEach((f) => {
      if ("field" in f && f.value) params.append(f.field, String(f.value));
    });
    if (sorters?.[0]) {
      params.append("sortBy", sorters[0].field);
      params.append("sortOrder", sorters[0].order);
    }

    const endpoint = resolveEndpoint(resource);
    const response = await fetch(`${API_URL}/${endpoint}?${params}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch ${resource}`);
    const data = await response.json();
    return { data: data.data || data, total: data.meta?.total || data.total || 0 };
  },

  getOne: async ({ resource, id }) => {
    const endpoint = resolveEndpoint(resource);
    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch ${resource}/${id}`);
    const data = await response.json();
    return { data: data.data || data };
  },

  create: async ({ resource, variables }) => {
    const endpoint = resolveEndpoint(resource);
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(variables),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Create failed");
    }
    const data = await response.json();
    return { data: data.data || data };
  },

  update: async ({ resource, id, variables }) => {
    const endpoint = resolveEndpoint(resource);
    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(variables),
    });
    if (!response.ok) throw new Error("Update failed");
    const data = await response.json();
    return { data: data.data || data };
  },

  deleteOne: async ({ resource, id }) => {
    const endpoint = resolveEndpoint(resource);
    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Delete failed");
    return { data: {} as any };
  },

  getApiUrl: () => API_URL,
};

