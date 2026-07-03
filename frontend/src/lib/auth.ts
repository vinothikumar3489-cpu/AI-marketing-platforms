import { api } from "./api";

type User = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

export const getAuthUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const userStr = localStorage.getItem("auth_user");
    return userStr ? (JSON.parse(userStr) as User) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(getToken());

export const setAuthData = (token: string, user: User) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};

export const fetchCurrentUser = async () => {
  const response = await api.get<{ success: boolean; user: User }>("/api/auth/me");
  const user = response.data.user;
  setAuthData(getToken() || "", user);
  return user;
};

export const fetchNotifications = async () => {
  const response = await api.get<{ notifications: Array<{ id: string; title: string; message: string; type: string; read: boolean; createdAt: string }> }>("/api/notifications");
  return response.data.notifications || [];
};

export const loginUser = async ({ email, password }: { email: string; password: string }) => {
  const response = await api.post<{ success: boolean; token: string; user: User }>("/api/auth/login", { email, password });
  return response.data;
};

export const registerUser = async ({ name, email, password }: { name: string; email: string; password: string }) => {
  const response = await api.post<{ success: boolean; token: string; user: User }>("/api/auth/register", { name, email, password });
  return response.data;
};
