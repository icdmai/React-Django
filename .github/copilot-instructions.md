# React + Vite BI Dashboard Frontend

This workspace contains a React 18 + Vite + TypeScript frontend application for a BI Dashboard with JWT authentication.

## Project Structure

- **frontend/**: Main frontend application
  - **src/components/**: Reusable UI components (Navbar, Sidebar, Table, etc.)
  - **src/pages/**: Page components (Login, Dashboard, Reports, etc.)
  - **src/contexts/**: React Context for state management (AuthContext)
  - **src/services/**: API services and Axios configuration
  - **src/utils/**: Helper utilities

## Tech Stack

- React 18
- Vite
- TypeScript
- TailwindCSS
- React Router v6
- Axios

## Backend API

- Base URL: http://localhost:8000
- Authentication: JWT tokens stored in localStorage
- Protected routes with Bearer token authentication
