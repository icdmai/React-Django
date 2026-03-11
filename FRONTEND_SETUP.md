# BI Dashboard Frontend - Quick Start Guide

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Login

Use these demo credentials:

- **Email**: test@example.com
- **Password**: password

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components (Login, Dashboard, etc.)
│   ├── contexts/       # React Context for authentication
│   ├── services/       # API services (Axios setup)
│   ├── utils/          # Helper utilities
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global Tailwind styles
├── public/             # Static files
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── README.md           # Full documentation
```

## 🔑 Key Features

✅ **JWT Authentication**

- Login page with email/password form
- Token stored in localStorage
- Auto-logout on 401 responses
- Protected routes with redirect to login

✅ **Dashboard**

- Welcome message with user name
- Statistics cards
- Quick action links

✅ **Reports**

- Browse list of available reports
- Click to view report details
- Execute reports and view results in data table

✅ **User Profile**

- Display user information
- Account details
- Logout functionality

✅ **Responsive Design**

- Mobile, tablet, and desktop layouts
- TailwindCSS styling
- Professional UI components

## 🔌 API Endpoints

The app connects to these Django API endpoints:

- `POST /api/auth/login/` - User authentication
- `GET /api/auth/users/me/` - Get current user
- `GET /api/reports/reports/` - List reports
- `POST /api/reports/reports/{id}/execute/` - Execute report
- `POST /api/auth/logout/` - User logout

## 🛠️ Development Scripts

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## 📦 Dependencies

- **react** (18.3) - UI framework
- **react-router-dom** (6.20) - Routing
- **axios** (1.6) - HTTP client
- **tailwindcss** (3.3) - Styling

## 🔐 Authentication Flow

1. User enters email and password on Login page
2. Form submits to `/api/auth/login/`
3. Server returns JWT access token
4. Token stored in localStorage
5. User redirected to dashboard
6. AuthContext fetches user profile
7. All subsequent requests include Bearer token
8. 401 responses trigger auto-logout

## 📊 File Structure Details

### Components (src/components/)

- **Navbar.tsx** - Top navigation with user menu
- **Sidebar.tsx** - Side navigation with active route highlighting
- **DataTable.tsx** - Reusable table component for report data
- **LoadingSpinner.tsx** - Loading indicator
- **Notifications.tsx** - Error and success notifications

### Pages (src/pages/)

- **LoginPage.tsx** - Authentication form
- **DashboardPage.tsx** - Home page with stats
- **ReportsListPage.tsx** - Browse reports
- **ReportViewerPage.tsx** - View and execute report
- **ProfilePage.tsx** - User profile and logout

### Services (src/services/)

- **api.ts** - Axios instance with interceptors for JWT token handling

### Contexts (src/contexts/)

- **AuthContext.tsx** - Authentication state and methods

## 🎨 Styling

The project uses **TailwindCSS** for all styling:

- Responsive grid layouts
- Utility-first CSS classes
- Dark gray sidebar (#1f2937)
- Blue primary color (#2563eb)
- Professional component styling

## ⚙️ Configuration Files

- **vite.config.ts** - Vite bundler configuration
- **tailwind.config.js** - TailwindCSS theme
- **postcss.config.js** - PostCSS with Tailwind and Autoprefixer
- **tsconfig.json** - TypeScript configuration
- **package.json** - Project metadata and dependencies

## 🐛 Troubleshooting

### Port 5173 already in use

Vite will automatically use a different port. Check terminal output.

### CORS errors

Ensure Django backend has CORS enabled for your frontend URL.

### Token not working

Check that the Django API returns `access` key in login response.

### 401 errors

Token may be expired. Implement refresh token logic if needed.

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [React Router Documentation](https://reactrouter.com)
- [Axios Documentation](https://axios-http.com)

## 🚢 Production Deployment

1. Build the project: `npm run build`
2. The `dist/` folder contains static files
3. Serve with any static file server (Nginx, Apache, etc.)
4. Configure your backend CORS to accept requests from your production domain
5. Update API endpoint if needed (currently http://localhost:8000)

## 📝 Notes

- All API calls use the JWT token from localStorage
- The app automatically redirects to login if token is invalid
- Data tables are fully responsive with horizontal scrolling on mobile
- Loading states are shown during API calls
- Error messages are user-friendly

---

Happy coding! 🎉
