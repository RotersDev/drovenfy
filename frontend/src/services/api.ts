import type { Menu, User } from "@/types";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const config: RequestInit = { ...options };

  if (config.body) {
    config.headers = {
      "Content-Type": "application/json",
      ...(config.headers as Record<string, string>),
    };
  }

  const res = await fetch(`${API_BASE}${url}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error || "Ocorreu um erro", res.status);
  }

  return data;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    me: (id: string) =>
      request<{ user: User }>(`/auth/me/${id}`),

    register: (email: string, password: string) =>
      request<{ user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    updateProfile: (id: string, data: { name?: string; email?: string; avatar?: string }) =>
      request<{ user: User }>(`/auth/profile/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    changePassword: (id: string, currentPassword: string, newPassword: string) =>
      request<{ success: boolean }>(`/auth/password/${id}`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  menus: {
    list: (userId: string) =>
      request<Menu[]>(`/menus?userId=${userId}`),

    get: (id: string) =>
      request<Menu>(`/menus/${id}`),

    create: (userId: string, menu: Partial<Menu>) =>
      request<Menu>("/menus", {
        method: "POST",
        body: JSON.stringify({ userId, menu }),
      }),

    update: (id: string, menu: Partial<Menu>) =>
      request<Menu>(`/menus/${id}`, {
        method: "PUT",
        body: JSON.stringify({ menu }),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/menus/${id}`, {
        method: "DELETE",
      }),

    getPublic: (slug: string) =>
      request<Menu>(`/public/menu/${slug}`),
  },

  upload: {
    image: (base64: string, folder = "general") =>
      request<{ url: string }>("/upload", {
        method: "POST",
        body: JSON.stringify({ image: base64, folder }),
      }),
  },

  geo: {
    routeDistance: (fromLat: number, fromLon: number, toLat: number, toLon: number) =>
      request<{ km: number | null }>("/geo/route-distance", {
        method: "POST",
        body: JSON.stringify({ fromLat, fromLon, toLat, toLon }),
      }),
  },
};
