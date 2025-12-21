import type {
  BaseRecord,
  CreateManyResponse,
  DataProvider,
  DeleteManyResponse,
  GetManyResponse,
  GetManyParams,
  CreateManyParams,
  UpdateManyParams,
  DeleteManyParams,
  UpdateManyResponse,
} from '@refinedev/core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const mapResourceToEndpoint = (resource: string) => {
  // Handle nested resources like 'books/123/chapters'
  if (resource.includes('/')) {
    return resource;
  }

  switch (resource) {
    case 'users':
      return 'auth/admin/users';
    case 'audit-logs':
      return 'auth/admin/audit-logs';
    case 'books':
      return 'books';
    case 'pipelines':
      return 'pipelines';
    case 'courses':
      return 'courses';
    default:
      return resource;
  }
};

const parseResponse = async (response: Response, fallbackMessage: string) => {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || fallbackMessage);
  }

  return body;
};

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const { current = 1, pageSize = 25 } = pagination ?? {};

    const params = new URLSearchParams();
    params.append('page', String(current));
    // API uses 'pageSize' for courses, 'limit' for others
    if (resource === 'courses') {
      params.append('pageSize', String(pageSize));
    } else {
      params.append('limit', String(pageSize));
    }

    filters?.forEach((filter) => {
      if ('field' in filter && filter.value !== undefined && filter.value !== '') {
        params.append(filter.field, String(filter.value));
      }
    });

    if (sorters && sorters.length > 0) {
      params.append('sortBy', sorters[0].field);
      params.append('sortOrder', sorters[0].order);
    }

    const userStr = localStorage.getItem('user');
    if (resource === 'users' && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'B2B_MANAGER') {
          params.set('userType', 'B2B');
        }
      } catch {
        // ignore invalid user
      }
    }

    const endpoint = mapResourceToEndpoint(resource);

    const response = await fetch(`${API_URL}/${endpoint}?${params.toString()}`, {
      headers: getHeaders(),
    });

    const data = await parseResponse(response, `Failed to fetch ${resource}`);

    return {
      data: data.data || data.books || data.chapters || data.pipelines || data.courses || data,
      total: data.meta?.total || data.total || data.totalChapters || 0,
    };
  },

  getOne: async ({ resource, id }) => {
    const endpoint = mapResourceToEndpoint(resource);

    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      headers: getHeaders(),
    });

    const data = await parseResponse(response, `Failed to fetch ${resource}/${id}`);

    return {
      data: data.data || data,
    };
  },

  getMany: async <TData extends BaseRecord = BaseRecord>({ resource, ids }: GetManyParams) => {
    const results = await Promise.all(
      ids.map((id) => dataProvider.getOne({ resource, id })),
    );

    return { data: results.map((result) => result.data as TData) } as unknown as GetManyResponse<TData>;
  },

  create: async ({ resource, variables }) => {
    const endpoint = mapResourceToEndpoint(resource);

    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(variables),
    });

    const data = await parseResponse(response, `Failed to create ${resource}`);

    return {
      data: data.data || data,
    };
  },

  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    variables,
  }: CreateManyParams<TVariables>) => {
    const items = Array.isArray(variables) ? variables : [];
    const results = await Promise.all(
      items.map((vars) => dataProvider.create({ resource, variables: vars })),
    );

    return { data: results.map((result) => result.data as TData) } as unknown as CreateManyResponse<TData>;
  },

  update: async ({ resource, id, variables }) => {
    const endpoint = mapResourceToEndpoint(resource);

    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(variables),
    });

    const data = await parseResponse(
      response,
      `Failed to update ${resource}/${id}`,
    );

    return {
      data: data.data || data,
    };
  },

  updateMany: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    ids,
    variables,
  }: UpdateManyParams<TVariables>) => {
    const results = await Promise.all(
      ids.map((id) => dataProvider.update({ resource, id, variables })),
    );

    return { data: results.map((result) => result.data as TData) } as unknown as UpdateManyResponse<TData>;
  },

  deleteOne: async ({ resource, id }) => {
    const endpoint = mapResourceToEndpoint(resource);

    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await parseResponse(
      response,
      `Failed to delete ${resource}/${id}`,
    );

    return {
      data: data.data || data,
    };
  },

  deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    ids,
  }: DeleteManyParams<TVariables>) => {
    const results = await Promise.all(
      ids.map((id) => dataProvider.deleteOne({ resource, id })),
    );

    return { data: results.map((result) => result.data as TData) } as unknown as DeleteManyResponse<TData>;
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method, payload, headers }) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: (method || 'GET').toUpperCase(),
      headers: {
        ...getHeaders(),
        ...(headers ?? {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await parseResponse(response, 'Request failed');
    return { data };
  },
};

