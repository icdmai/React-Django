import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import { getClientMacForRequest } from "./clientMac";

// Prefer environment variable for API base URL; fallback to localhost
const API_BASE_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "http://127.0.0.1:8000/api";

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: runs before EVERY request. Adds token + X-Client-MAC for report URLs.
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Report MAC lock: for any /reports/ request, add X-Client-MAC if we have a MAC (from sessionStorage or local service).
    const url = config.url ?? "";
    if (url.includes("/reports/")) {
      const mac = await getClientMacForRequest();
      if (mac) {
        config.headers["X-Client-MAC"] = mac;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Auto logout on 401
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth API calls
export const authAPI = {
  login: (identifier: string, password: string) => {
    const payload: Record<string, string> = {
      password,
      email: identifier,
      username: identifier,
    };
    // If the identifier is numeric, also send as user_id
    if (/^\d+$/.test(identifier.trim())) {
      payload.user_id = identifier.trim();
    }
    return apiClient.post("/auth/login/", payload);
  },

  getProfile: () => apiClient.get("/auth/users/me/"),

  logout: () => apiClient.post("/auth/logout/"),
  changePassword: (old_password: string, new_password: string) =>
    apiClient.post("/auth/password/change/", { old_password, new_password }),
};

// Reports API calls
export const reportsAPI = {
  listReports: () => apiClient.get("/reports/reports/"),

  getReport: (id: number) => apiClient.get(`/reports/reports/${id}/`),

  // Dashboard by id (returns name + dashboard_widgets[])
  getDashboard: (dashboardId: number) =>
    apiClient.get(`/reports/${dashboardId}/`),

  // Fetch report data with pagination from parquet file
  fetchReportData: (
    id: number,
    params?: {
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      date_column?: string;
    },
  ) => apiClient.post(`/reports/${id}/execute/`, params || {}),

  // Legacy: kept for backward compatibility
  executeReport: (id: number, params?: Record<string, any>) =>
    apiClient.post(`/reports/${id}/execute/`, params || {}),

  // Columnwise search API
  searchByColumn: (
    id: number,
    payload: {
      search_field?: string; // Keep for backward compatibility
      column?: string; // Backend expects 'column'
      search_value: string;
      search_type?: "exact" | "contains" | "startswith";
      page?: number;
      page_size?: number;
    },
  ) => {
    // Map search_field to column if column is not provided
    const requestPayload = {
      column: payload.column || payload.search_field,
      search_value: payload.search_value,
      search_type: payload.search_type || "exact",
      page: payload.page || 1,
      page_size: payload.page_size || 50,
    };
    return apiClient.post(`/reports/${id}/search_by_column/`, requestPayload);
  },

  // Cascade search API for multi-column filters
  searchCascade: (
    id: number,
    payload: {
      filters: Record<
        string,
        {
          type: string;
          search_type: string;
          value: string;
          value2?: string;
        }
      >;
      page?: number;
      page_size?: number;
    },
  ) => apiClient.post(`/reports/${id}/search_cascade/`, payload),

  // Paginated data API - optimized for browsing large datasets
  // Uses chunked loading from Parquet files (memory efficient)
  getPaginatedData: (
    id: number,
    params?: {
      page?: number;
      page_size?: number;
      filter_values?: Record<string, any>; // Runtime filters as key-value pairs
    },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.filter_values) {
      // Convert filter_values object to JSON string for query params
      queryParams.append("filter_values", JSON.stringify(params.filter_values));
    }
    const queryString = queryParams.toString();
    return apiClient.get(
      `/reports/${id}/data${queryString ? `?${queryString}` : ""}`,
    );
  },

  // Fetch report data by single branch code
  getDataByBranch: (
    reportName: string,
    branchCode: string,
    params?: { page?: number; page_size?: number },
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("report_name", reportName);
    queryParams.append("branch_code", branchCode);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    return apiClient.get(`/reports/data-by-branch/?${queryParams.toString()}`);
  },

  // Fetch report data for multiple branch codes at once
  getDataByBranches: (
    reportName: string,
    branchCodes: string,
    params?: { page?: number; page_size?: number },
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("report_name", reportName);
    queryParams.append("branch_codes", branchCodes);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    return apiClient.get(`/reports/data-by-branches/?${queryParams.toString()}`);
  },

  // Get cache status for a report
  getCacheStatus: (id: number) =>
    apiClient.get(`/reports/reports/${id}/cache_status/`),

  // Get sync status for a report
  getSyncStatus: (id: number) =>
    apiClient.get(`/reports/reports/${id}/sync_status/`),

  // Get sync history for a report
  getSyncHistory: (id: number, params?: { limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    return apiClient.get(
      `/reports/reports/${id}/sync_history/${queryString ? `?${queryString}` : ""}`,
    );
  },

  // Get execution history for a report
  getExecutions: (id: number, params?: { limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    return apiClient.get(
      `/reports/reports/${id}/executions/${queryString ? `?${queryString}` : ""}`,
    );
  },

  // Force refresh cache (admin only)
  forceRefresh: (id: number) =>
    apiClient.post(`/reports/reports/${id}/force_refresh/`),

  // Clear cache (admin only)
  clearCache: (id: number) =>
    apiClient.delete(`/reports/reports/${id}/clear_cache/`),
};

export default apiClient;
