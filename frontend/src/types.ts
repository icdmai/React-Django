/**
 * Type Definitions for BI Dashboard Frontend
 *
 * This file documents the TypeScript types used throughout the application.
 */

// ============================================
// Authentication Types
// ============================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

// ============================================
// Report Types
// ============================================

export interface Report {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

export interface ReportsListResponse {
  results: Report[];
  count: number;
  next?: string;
  previous?: string;
}

export interface ReportExecuteResponse {
  data: Record<string, any>[];
  total_rows?: number;
  columns?: string[];
  data_source?: string; // 'parquet' or 'synapse'
}

export interface ReportDetail extends Report {
  query?: string;
  parameters?: Record<string, any>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  detail?: string;
  error?: string;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ============================================
// Component Props Types
// ============================================

export interface DataTableProps {
  columns: ColumnConfig[];
  data: Record<string, any>[];
  isLoading?: boolean;
  onRowClick?: (row: Record<string, any>) => void;
  className?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (value: any) => React.ReactNode;
  width?: string;
}

export interface NotificationProps {
  message: string;
  onClose?: () => void;
  duration?: number;
  type?: "error" | "success" | "info" | "warning";
}

export interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "medium" | "large";
}

// ============================================
// Form Types
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface FormError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormError[];
}

// ============================================
// Navigation Types
// ============================================

export interface NavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
  protected: boolean;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

export interface PaginationParams {
  page: number;
  page_size: number;
  search?: string;
  ordering?: string;
}

export interface PaginatedReportDataResponse {
  results: Record<string, any>[];
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

// ============================================
// Usage Examples
// ============================================

/*
// Using in a component:
import { User, Report, DataTableProps } from 'src/types';

interface MyComponentProps {
  user: User;
  reports: Report[];
}

const MyComponent: React.FC<MyComponentProps> = ({ user, reports }) => {
  const tableProps: DataTableProps = {
    columns: [
      { key: 'name', label: 'Report Name' },
      { key: 'description', label: 'Description' },
    ],
    data: reports,
    onRowClick: () => {},
  };

  return <DataTable {...tableProps} />;
};

// Using in API calls:
const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await axios.post('/auth/login/', credentials);
  return response.data;
};

// Using in context:
const authValue: AuthContextType = {
  user,
  token,
  isLoading,
  login,
  logout,
  fetchUser,
};
*/
