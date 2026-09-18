import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { TasksProvider } from "./context/TasksContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { MeetingsProvider } from "./context/MeetingsContext";
import { TeamProvider } from "./context/TeamContext";
import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { KanbanPage } from "./pages/dashboard/KanbanPage";
import { CalendarPage } from "./pages/dashboard/CalendarPage";
import { MeetingNotesPage } from "./pages/dashboard/MeetingNotesPage";
import { TeamPage } from "./pages/dashboard/TeamPage";
import { ReportsPage } from "./pages/dashboard/ReportsPage";
import { SettingsPage } from "./pages/dashboard/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <TeamProvider>
              <TasksProvider>
                <MeetingsProvider>
                  <NotificationsProvider>
                    <DashboardLayout />
                  </NotificationsProvider>
                </MeetingsProvider>
              </TasksProvider>
            </TeamProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="meeting-notes" element={<MeetingNotesPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
