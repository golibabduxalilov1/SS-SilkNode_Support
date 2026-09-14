import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { TicketsPage } from './pages/Tickets';
import { TicketDetailPage } from './pages/TicketDetail';
import { RequestersPage } from './pages/Requesters';
import { RequesterDetailPage } from './pages/RequesterDetail';
import { OrganizationsPage } from './pages/Organizations';
import { CategoriesPage } from './pages/Categories';
import { EmployeesPage } from './pages/Employees';
import { LogsPage } from './pages/Logs';

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/dashboard/tickets/:id" element={<TicketDetailPage />} />
                <Route path="/requesters" element={<RequestersPage />} />
                <Route path="/requesters/:key" element={<RequesterDetailPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/logs" element={<LogsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
