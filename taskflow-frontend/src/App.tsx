import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { LandingPage } from "./pages/LandingPage";
import { MarketingLayout } from "./components/marketing/MarketingLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RouteEffects } from "./components/layout/RouteEffects";
import { LoadingScreen } from "./components/ui/LoadingScreen";

// Everything except the home page is code-split to keep the first load small.
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const FeaturesPage = lazy(() => import("./pages/marketing/FeaturesPage").then((m) => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import("./pages/marketing/PricingPage").then((m) => ({ default: m.PricingPage })));
const AboutPage = lazy(() => import("./pages/marketing/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/marketing/ContactPage").then((m) => ({ default: m.ContactPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((m) => ({ default: m.SignupPage })));

const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));

const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout").then((m) => ({ default: m.DashboardLayout })));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome").then((m) => ({ default: m.DashboardHome })));
const KanbanPage = lazy(() => import("./pages/dashboard/KanbanPage").then((m) => ({ default: m.KanbanPage })));
const CalendarPage = lazy(() => import("./pages/dashboard/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const MeetingNotesPage = lazy(() => import("./pages/dashboard/MeetingNotesPage").then((m) => ({ default: m.MeetingNotesPage })));
const TeamPage = lazy(() => import("./pages/dashboard/TeamPage").then((m) => ({ default: m.TeamPage })));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage").then((m) => ({ default: m.SettingsPage })));

const AdminPage = lazy(() => import("./pages/dashboard/AdminPage").then((m) => ({ default: m.AdminPage })));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      {/* reducedMotion="user" makes every framer-motion transition below
          honor the OS "reduce motion" setting (CSS animations are already
          covered by prefers-reduced-motion blocks in index.css/marketing.css). */}
      <MotionConfig reducedMotion="user">
        <RouteEffects />
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            {/* Any other URL (/112, /features/abc, ...) lands on the 404 page */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="meeting-notes" element={<MeetingNotesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage compact />} />
          </Route>
        </Routes>
      </MotionConfig>
    </Suspense>
  );
}