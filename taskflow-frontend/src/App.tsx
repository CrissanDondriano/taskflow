import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { MarketingLayout } from "./components/marketing/MarketingLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { TasksProvider } from "./context/TasksContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { MeetingsProvider } from "./context/MeetingsContext";
import { TeamProvider } from "./context/TeamContext";

const FeaturesPage = lazy(() => import("./pages/marketing/FeaturesPage").then((m) => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import("./pages/marketing/PricingPage").then((m) => ({ default: m.PricingPage })));
const AboutPage = lazy(() => import("./pages/marketing/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/marketing/ContactPage").then((m) => ({ default: m.ContactPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout").then((m) => ({ default: m.DashboardLayout })));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome").then((m) => ({ default: m.DashboardHome })));
const KanbanPage = lazy(() => import("./pages/dashboard/KanbanPage").then((m) => ({ default: m.KanbanPage })));
const CalendarPage = lazy(() => import("./pages/dashboard/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const MeetingNotesPage = lazy(() => import("./pages/dashboard/MeetingNotesPage").then((m) => ({ default: m.MeetingNotesPage })));
const TeamPage = lazy(() => import("./pages/dashboard/TeamPage").then((m) => ({ default: m.TeamPage })));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-[28px] font-semibold">Page not found</h1>
      <p className="mt-3 text-[14px]" style={{ color: "var(--tf-ink-muted)" }}>That address doesn't exist. Go back to the home page.</p>
      <Link to="/" className="mt-6 inline-block underline underline-offset-4">Back to home</Link>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading" style={{ minHeight: "100vh", background: "var(--tf-void)" }} />}>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

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
    </Suspense>
  );
}