/\*\*

- API Configuration Guide
-
- This file documents how to configure API endpoints for different environments.
- Currently, all API URLs are hardcoded in the application.
  \*/

// Current API Configuration
// =======================
// Base URL: http://localhost:8000
//
// Endpoints:
// - POST http://localhost:8000/api/auth/login/ (Login)
// - GET http://localhost:8000/api/auth/users/me/ (Get User Profile)
// - GET http://localhost:8000/api/reports/reports/ (List Reports)
// - POST http://localhost:8000/api/reports/reports/{id}/execute/ (Execute Report)

// To Change API Endpoint
// ======================
// 1. Open src/services/api.ts
// 2. Update API_BASE_URL constant:
//
// Old:
// const API_BASE_URL = 'http://localhost:8000/api';
//
// New:
// const API_BASE_URL = 'https://your-production-api.com/api';
//
// 3. Save and restart dev server

// Alternative: Environment Variables
// ====================================
// To use environment variables, follow these steps:
//
// 1. Create .env file in frontend/ directory:
// VITE_API_URL=http://localhost:8000/api
//
// 2. Update src/services/api.ts:
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
//
// 3. Create .env.production for production build:
// VITE_API_URL=https://your-production-api.com/api
//
// 4. Access in code:
// const apiUrl = import.meta.env.VITE_API_URL;

// Files That Need API URL Updates
// ================================
// 1. src/services/api.ts
// - API_BASE_URL constant (line ~3)
//
// 2. src/contexts/AuthContext.tsx
// - Hard-coded URLs in login and fetchUser functions
// - Search for 'http://localhost:8000'
//
// 3. src/pages/DashboardPage.tsx
// - Hard-coded URL in fetchStats function
//
// 4. src/pages/ReportsListPage.tsx
// - Hard-coded URL in fetchReports function
//
// 5. src/pages/ReportViewerPage.tsx
// - Hard-coded URLs in handleExecuteReport function

// Django Backend Requirements
// ===========================
// Your Django backend should have:
//
// 1. CORS Configuration
// CORS_ALLOWED_ORIGINS = [
// "http://localhost:5173", // Development
// "https://your-domain.com", // Production
// ]
//
// 2. JWT Authentication
// - POST /api/auth/login/ should return:
// {
// "access": "jwt_token_here",
// "refresh": "refresh_token_here" // optional
// }
//
// 3. User Profile Endpoint
// - GET /api/auth/users/me/ should return:
// {
// "id": 1,
// "email": "user@example.com",
// "first_name": "John",
// "last_name": "Doe"
// }
//
// 4. Reports Endpoints
// - GET /api/reports/reports/ should return:
// {
// "results": [
// {
// "id": 1,
// "name": "Sales Report",
// "description": "Monthly sales data"
// }
// ],
// "count": 1
// }
//
// - POST /api/reports/reports/{id}/execute/ should return:
// {
// "data": [
// { "column1": "value1", "column2": "value2" },
// { "column1": "value1", "column2": "value2" }
// ]
// }

// Development vs Production
// ==========================
//
// Development:
// - API URL: http://localhost:8000
// - Frontend: http://localhost:5173
// - CORS: Configure Django to allow http://localhost:5173
// - Tokens: Stored in localStorage
//
// Production:
// - API URL: https://your-api.com
// - Frontend: https://your-domain.com
// - CORS: Configure Django to allow https://your-domain.com
// - Build: npm run build → deploy dist/ folder
// - Tokens: Same localStorage approach
//
// Note: For production HTTPS, ensure your backend also uses HTTPS
// and has secure CORS configuration.

// Token Refresh (Optional Enhancement)
// =====================================
// The current implementation doesn't include token refresh logic.
// To add it, modify src/services/api.ts:
//
// interceptors.response.use(
// response => response,
// async error => {
// if (error.response?.status === 401) {
// try {
// // Call refresh endpoint
// const refreshToken = localStorage.getItem('refresh_token');
// const response = await axios.post('/api/auth/refresh/', {
// refresh: refreshToken
// });
// const newToken = response.data.access;
// localStorage.setItem('access_token', newToken);
//  
// // Retry original request
// error.config.headers.Authorization = `Bearer ${newToken}`;
// return axios(error.config);
// } catch {
// // Refresh failed, redirect to login
// localStorage.removeItem('access_token');
// window.location.href = '/login';
// }
// }
// return Promise.reject(error);
// }
// );
