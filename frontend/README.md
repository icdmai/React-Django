# BI Dashboard Frontend

A modern React 18 + Vite + TypeScript frontend application for a Business Intelligence Dashboard with JWT authentication and responsive design.

## Features

✨ **Core Features**

- 🔐 JWT Authentication with localStorage token storage
- 🛡️ Protected routes with automatic redirect to login
- 📊 Dashboard with stats and quick actions
- 📈 Reports browsing and execution
- 👤 User profile management
- 🎨 Responsive design with TailwindCSS
- ⚡ Fast development with Vite
- 🔄 Axios interceptors for JWT token attachment
- 🚀 Auto-logout on 401 responses

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.9
- **Styling**: TailwindCSS 3.3
- **Routing**: React Router v6
- **HTTP Client**: Axios 1.6
- **State Management**: React Context API

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Navbar.tsx       # Top navigation bar with user menu
│   │   ├── Sidebar.tsx      # Side navigation
│   │   ├── DataTable.tsx    # Generic data table component
│   │   ├── LoadingSpinner.tsx # Loading indicator
│   │   ├── Notifications.tsx # Error/Success alerts
│   │   └── index.ts
│   ├── pages/               # Page components
│   │   ├── LoginPage.tsx    # Authentication
│   │   ├── DashboardPage.tsx # Home page
│   │   ├── ReportsListPage.tsx # Reports listing
│   │   ├── ReportViewerPage.tsx # Report execution
│   │   ├── ProfilePage.tsx  # User profile
│   │   └── index.ts
│   ├── contexts/            # React Context
│   │   └── AuthContext.tsx  # Authentication state & logic
│   ├── services/            # API services
│   │   └── api.ts          # Axios setup with interceptors
│   ├── utils/              # Helper utilities
│   ├── App.tsx             # Main app component with routing
│   ├── App.css             # App styles (TailwindCSS)
│   ├── index.css           # Global styles
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # TailwindCSS configuration
├── postcss.config.js      # PostCSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Django backend running at `http://localhost:8000`

### Installation

1. **Install dependencies**:

```bash
npm install
```

2. **Set environment variables** (optional, API URL is hardcoded):
   - Backend API URL: http://localhost:8000

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Build for Production

Create an optimized production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Linting

Check code quality:

```bash
npm run lint
```

## API Integration

### Authentication Flow

1. **Login** → POST `/api/auth/login/`

   - Request: `{ email: string, password: string }`
   - Response: `{ access: string, refresh?: string }`
   - Token stored in localStorage as `access_token`

2. **Fetch User** → GET `/api/auth/users/me/`

   - Header: `Authorization: Bearer <token>`
   - Response: `{ id, email, first_name, last_name }`

3. **List Reports** → GET `/api/reports/reports/`

   - Header: `Authorization: Bearer <token>`
   - Response: `{ results: [...], count: number }`

4. **Execute Report** → POST `/api/reports/reports/{id}/execute/`
   - Header: `Authorization: Bearer <token>`
   - Response: `{ data: [...] }`

### Interceptors

The Axios client automatically:

- ✅ Attaches JWT token to all requests
- ✅ Detects 401 responses and redirects to login
- ✅ Handles CORS headers

## Authentication

### Protected Routes

Routes requiring authentication:

- `/dashboard` - Home page
- `/reports` - Reports list
- `/report/:id` - Report viewer
- `/profile` - User profile

### Public Routes

- `/login` - Authentication page
- `/` - Redirects to dashboard (or login if not authenticated)

### Token Management

- **Storage**: localStorage with key `access_token`
- **Auto-refresh**: Not implemented (use refresh tokens in backend)
- **Auto-logout**: Triggered on 401 response
- **Manual logout**: Available in user profile menu

## UI Components

### Navbar

Top navigation with user menu dropdown.

### Sidebar

Side navigation with active route highlighting.

### DataTable

Generic table component with:

- Column configuration
- Loading state
- Row click handlers
- Empty state

### LoadingSpinner

Centered spinner with optional message.

### ErrorNotification & SuccessNotification

Alert components with dismiss button.

## Page Components

### LoginPage

- Email and password form
- Error handling
- Demo credentials hint

### DashboardPage

- Welcome message
- Statistics cards
- Quick action buttons
- Reports summary

### ReportsListPage

- Paginated list of reports
- Clickable rows to view report details
- Error handling

### ReportViewerPage

- Report details
- Execute button
- Dynamic data table with report results
- Back navigation

### ProfilePage

- User information display
- Account details
- Logout with confirmation

## Error Handling

The application includes:

- ✅ Try-catch blocks in async operations
- ✅ User-friendly error messages
- ✅ Error notification components
- ✅ Graceful 401 handling
- ✅ API error details in notifications

## Styling

### TailwindCSS Classes

The application uses utility classes for styling:

- Responsive design with `md:` and `lg:` breakpoints
- Color scheme: Blue primary, Gray neutrals, Red for danger
- Spacing, borders, shadows from Tailwind defaults

### Color Scheme

- **Primary**: Blue (#2563eb, #1e40af)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Background**: White and Gray-50
- **Text**: Gray-800 and Gray-600

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Responsive Design

- Mobile-first approach
- Responsive grid layouts
- Mobile menu toggle for sidebar
- Tablet and desktop optimizations

## Performance

- Code splitting with React Router
- Lazy loading of routes
- Optimized bundle size with Vite
- Fast refresh during development

## Development Tips

1. **Enable TypeScript strict mode**: Check `tsconfig.json`
2. **Use React DevTools**: Browser extension for debugging
3. **Check Network tab**: Monitor API calls and responses
4. **Use Console**: Error logs from Axios interceptors
5. **Hot Module Replacement**: Save files for instant updates

## Troubleshooting

### CORS Errors

Ensure Django backend has proper CORS configuration.

### Token Expiration

Implement refresh token logic in the Axios interceptor or backend.

### 404 on Refresh

Configure your server to serve `index.html` for all routes.

### Port Already in Use

Vite will automatically use another port if 5173 is taken.

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT

## Support

For issues or questions, please contact the development team.
