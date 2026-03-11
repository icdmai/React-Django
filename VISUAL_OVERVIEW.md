# BI Dashboard - Visual Overview

## 🎯 Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         BrowserRouter                        │
├─────────────────────────────────────────────────────────────┤
│                       AuthProvider                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              AuthContext                            │  │
│  │  ├─ user: User | null                               │  │
│  │  ├─ token: string | null                            │  │
│  │  ├─ isLoading: boolean                              │  │
│  │  ├─ login()                                         │  │
│  │  ├─ logout()                                        │  │
│  │  └─ fetchUser()                                     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
            ┌───────▼─────────┐  ┌─▼─────────────────┐
            │   Public Route  │  │  Protected Route  │
            │   /login        │  │  (ProtectedRoute) │
            │   LoginPage     │  │  ├─ /dashboard    │
            │                 │  │  ├─ /reports      │
            │                 │  │  ├─ /report/:id   │
            │                 │  │  └─ /profile      │
            └─────────────────┘  └────────┬──────────┘
                                          │
                                    ┌─────▼──────────┐
                                    │   MainLayout   │
                                    ├─ Navbar        │
                                    ├─ Sidebar       │
                                    └─ Page Content  │
                                          │
                    ┌─────────────────────┼──────────────────┐
                    │                     │                  │
            ┌───────▼────────┐   ┌───────▼────────┐  ┌──────▼──────────┐
            │  DashboardPage │   │ ReportsListPage│  │  ProfilePage    │
            ├─ Stats Cards   │   ├─ DataTable     │  ├─ User Info      │
            └─ Quick Actions │   └─ Click → Report│  └─ Logout Button  │
                             │                     │
                             └────────┬────────────┘
                                      │
                            ┌─────────▼──────────┐
                            │ ReportViewerPage   │
                            ├─ Report Details   │
                            ├─ Execute Button   │
                            └─ DataTable Result │
```

## 📱 UI Layout

```
┌─────────────────────────────────────────────────────┐
│                      Navbar                         │
│  BI Dashboard          User Menu ▼                  │
├──────────────┬─────────────────────────────────────┤
│              │                                     │
│  Sidebar     │           Main Content Area        │
│ Navigation   │                                     │
│              │  ┌─────────────────────────────┐   │
│  Dashboard   │  │                             │   │
│  Reports     │  │      Page Content           │   │
│  Profile     │  │    (DashboardPage,          │   │
│              │  │     ReportsListPage, etc)   │   │
│              │  │                             │   │
│              │  └─────────────────────────────┘   │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
```

## 🔄 Authentication Flow

```
User                App                   Django API
│                   │                          │
├─ Enter Email/Pw ─>│                          │
│                   │                          │
│                   ├─ POST /api/auth/login/ ─>│
│                   │                          │
│                   │  {access: token}    <────┤
│                   <────────────────────      │
│                   │                          │
│                   ├─ Save token to localStorage
│                   │                          │
│                   ├─ GET /api/auth/users/me/─>│
│                   │ (with Bearer token)       │
│                   │                          │
│                   │  {user data}          <────
│                   <──────────────────────     │
│                   │                          │
│                   ├─ Load AuthContext        │
│                   ├─ Redirect to /dashboard  │
│                   │                          │
│ User logged in ◄──┤                          │
│                   │                          │
│  (All requests include Bearer token via Axios interceptor)
│                   │                          │
│                   ├─ GET /api/reports/ ────>│
│                   │ (with Bearer token)      │
│                   │                          │
│                   │  {reports}           <────
│                   <──────────────────────     │
│                   │                          │
│  Reports display ◄┤                          │
│                   │                          │
│  (Click Report)   │                          │
├──────────────────>│                          │
│                   ├─ GET /api/reports/{id}/ ─>│
│                   │ (with Bearer token)      │
│                   │                          │
│                   │  {report}             <────
│                   <──────────────────────     │
│                   │                          │
│  Report displayed ◄┤                          │
│                   │                          │
│ (Click Execute)   │                          │
├──────────────────>│                          │
│                   ├─ POST /api/reports/{id}/execute/
│                   │ (with Bearer token)      │
│                   │                          │
│                   │  {data: [...]}        <────
│                   <──────────────────────     │
│                   │                          │
│ Results show  ◄───┤                          │
│                   │                          │
│  (Logout)         │                          │
├──────────────────>│                          │
│                   ├─ Remove token            │
│                   ├─ Redirect to /login      │
│                   │                          │
│ Back at login ◄───┤                          │
```

## 🏗️ Component Tree

```
App
├── BrowserRouter
│   └── AuthProvider
│       ├── Routes
│       │   ├── Route: /login
│       │   │   └── LoginPage
│       │   │       ├── form input email
│       │   │       ├── form input password
│       │   │       ├── ErrorNotification
│       │   │       └── Submit button
│       │   │
│       │   ├── Route: /dashboard (Protected)
│       │   │   └── MainLayout
│       │   │       ├── Navbar
│       │   │       │   └── User dropdown menu
│       │   │       ├── Sidebar
│       │   │       │   └── Nav links
│       │   │       └── DashboardPage
│       │   │           ├── Welcome message
│       │   │           ├── Stats cards
│       │   │           └── Quick action buttons
│       │   │
│       │   ├── Route: /reports (Protected)
│       │   │   └── MainLayout
│       │   │       ├── Navbar
│       │   │       ├── Sidebar
│       │   │       └── ReportsListPage
│       │   │           ├── LoadingSpinner
│       │   │           ├── ErrorNotification
│       │   │           └── DataTable
│       │   │               └── Report rows
│       │   │
│       │   ├── Route: /report/:id (Protected)
│       │   │   └── MainLayout
│       │   │       ├── Navbar
│       │   │       ├── Sidebar
│       │   │       └── ReportViewerPage
│       │   │           ├── Report details
│       │   │           ├── Execute button
│       │   │           ├── LoadingSpinner
│       │   │           ├── SuccessNotification
│       │   │           ├── ErrorNotification
│       │   │           └── DataTable
│       │   │               └── Result rows
│       │   │
│       │   └── Route: /profile (Protected)
│       │       └── MainLayout
│       │           ├── Navbar
│       │           ├── Sidebar
│       │           └── ProfilePage
│       │               ├── User avatar
│       │               ├── User info
│       │               └── Logout button
│       │
│       └── ProtectedRoute component
│           (Guards routes, redirects to /login if no token)
```

## 📊 Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    App State                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │            AuthContext (Global State)              │ │
│  │                                                    │ │
│  │  ├─ user: {id, email, first_name, last_name}     │ │
│  │  ├─ token: "eyJhbGciOiJIUzI1NiIs..."             │ │
│  │  └─ isLoading: false                             │ │
│  └─────────────┬──────────────────────────────────────┘ │
└────────────────┼──────────────────────────────────────────┘
                 │
        ┌────────┴────────┬─────────────┬──────────────┐
        │                 │             │              │
    Used in          Used in        Used in        Used in
   LoginPage      DashboardPage   ReportsListPage  ProfilePage
        │                 │             │              │
    ├─ Login()        ├─ User name   ├─ Check auth   ├─ Display user
    ├─ Error display  ├─ Stats       ├─ Fetch data   ├─ Logout
    └─ Redirect to    └─ Welcome     └─ Show table   └─ Confirmation
      dashboard                          data


┌──────────────────────────────────────────────────────────┐
│              Component Local State                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ LoginPage          ReportViewerPage    ProfilePage       │
│ ├─ email          ├─ report           ├─ showLogout     │
│ ├─ password       ├─ data                Confirm        │
│ ├─ error          ├─ isExecuting                        │
│ └─ isLoading      ├─ error             Navbar           │
│                   ├─ success           ├─ isDropdown    │
│ ReportsListPage   └─ isLoading           Open           │
│ ├─ reports                                              │
│ ├─ isLoading      DashboardPage        Sidebar          │
│ └─ error          ├─ stats             ├─ location      │
│                   ├─ error             └─ useLocation() │
│                   └─ isLoading
│
└──────────────────────────────────────────────────────────┘
```

## 🔌 API Integration Points

```
┌────────────────────────────────────────────────────┐
│         Axios Instance (src/services/api.ts)       │
│  ┌──────────────────────────────────────────────┐ │
│  │   Request Interceptor                        │ │
│  │   ├─ Get token from localStorage            │ │
│  │   ├─ Add Authorization header                │ │
│  │   └─ Add Content-Type header                 │ │
│  └────────────────────────────────────────────┤ │
│                                                  │ │
│  ┌──────────────────────────────────────────────┐ │
│  │   Response Interceptor                       │ │
│  │   ├─ Check for 401                          │ │
│  │   ├─ If 401: Clear token, redirect to login │ │
│  │   └─ Otherwise: Return response              │ │
│  └────────────────────────────────────────────┤ │
│                                                  │
└────────────────────────────────────────────────┬─┘
                                                  │
                            ┌─────────────────────┴──────────┐
                            │                                │
                ┌───────────▼────────────┐  ┌──────────────▼────────┐
                │    authAPI module      │  │   reportsAPI module   │
                ├───────────────────────┤  ├──────────────────────┤
                │ ├─ login()            │  │ ├─ listReports()     │
                │ ├─ getProfile()       │  │ ├─ getReport()       │
                │ └─ logout()           │  │ └─ executeReport()   │
                └───────┬───────────────┘  └──────────┬───────────┘
                        │                             │
                        └─────────┬───────────────────┘
                                  │
                    ┌─────────────▼──────────────────┐
                    │                                │
              Called by components:            Called by:
              ├─ LoginPage                   ├─ DashboardPage
              └─ AuthContext                 ├─ ReportsListPage
                                             ├─ ReportViewerPage
                                             └─ All protected pages

                    All requests include Bearer token
                    Authorization: Bearer <token>
```

## 🎯 Route Navigation Map

```
Start
  │
  ├─ Has token? ────NO──> /login (LoginPage)
  │                         │
  │                      Submit form
  │                         │
  │                      Get token
  │                         │
  └─ YES ──────────────────>└──> /dashboard (DashboardPage)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                 Click          Click          Click
              "Reports"       "Profile"     Navigation
                 │              │              │
                 ▼              ▼              ▼
            /reports        /profile      Other Pages
         (ReportsList)     (ProfilePage)
                 │
              Click row
                 │
                 ▼
            /report/:id
           (ReportViewer)
                 │
              ┌──┴──┐
              │     │
            Back  Execute
              │     │
         /reports  Show Data
```

## 🔐 Protected Route Logic

```
ProtectedRoute component
│
├─ Check useAuth()
│  │
│  ├─ token exists? ─YES─> Render children (protected page)
│  │
│  └─ NO ─> <Navigate to="/login" />
│
Results:
├─ If logged in → Can access /dashboard, /reports, /report/:id, /profile
└─ If not logged in → Redirected to /login automatically
```

## 💾 Data Storage

```
┌─────────────────────────────────────┐
│      Browser Storage                │
├─────────────────────────────────────┤
│                                     │
│  localStorage                       │
│  ├─ access_token: "jwt_token..."   │
│  └─ (Set by: AuthContext.login())  │
│     (Used by: Axios interceptor)    │
│     (Cleared by: AuthContext.logout())
│                                     │
│  sessionStorage                     │
│  └─ (Not used in current app)      │
│                                     │
│  Memory (React State)               │
│  ├─ AuthContext.user                │
│  ├─ AuthContext.token               │
│  ├─ AuthContext.isLoading           │
│  └─ Component local state           │
│                                     │
└─────────────────────────────────────┘
```

## 🎨 Color Scheme

```
├─ Primary Blue
│  ├─ #2563eb (bright blue)
│  └─ #1e40af (dark blue)
│
├─ Success Green
│  └─ #10b981
│
├─ Error Red
│  ├─ #ef4444 (notifications)
│  └─ #dc2626 (hover)
│
├─ Neutral Gray
│  ├─ #ffffff (white backgrounds)
│  ├─ #f3f4f6 (light gray)
│  ├─ #e5e7eb (borders)
│  ├─ #9ca3af (secondary text)
│  ├─ #6b7280 (primary text)
│  └─ #1f2937 (dark gray sidebar)
│
└─ Dark
   └─ #111827 (very dark gray)
```

---

This visual overview helps understand the complete architecture and data flow of the BI Dashboard application.
