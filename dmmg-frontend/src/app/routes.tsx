import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";

import Login from "../features/auth/Login";
import ForgotPassword from "../features/auth/ForgotPassword";
import OrgSetup from "../features/auth/OrgSetup";
import DashboardHome from "../features/dashboard/DashboardHome";

import MeetingsList from "../features/meetings/MeetingsList";
import CreateMeeting from "../features/meetings/CreateMeeting";
import MeetingDetails from "../features/meetings/MeetingDetails";
import EditMeeting from "../features/meetings/EditMeeting"; // ✅ ADD
import AdminRequests from "@/features/dashboard/AdminRequests";
import RequireAdmin from "@/features/auth/RequireAdmin";
import { getSessionToken } from "@/lib/session";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getSessionToken();
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const token = getSessionToken();
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: (
          <PublicOnly>
            <Login />
          </PublicOnly>
        ),
      },
      { path: "/auth/forgot-password", element: <ForgotPassword /> },
      { path: "/auth/org", element: <OrgSetup /> },

      {
        path: "/dashboard",
        element: (
          <RequireAuth>
            <DashboardHome />
          </RequireAuth>
        ),
      },

      {
        path: "/meetings",
        element: (
          <RequireAuth>
            <MeetingsList />
          </RequireAuth>
        ),
      },
      {
        path: "/meetings/new",
        element: (
          <RequireAuth>
            <CreateMeeting />
          </RequireAuth>
        ),
      },
      {
        path: "/meetings/:id",
        element: (
          <RequireAuth>
            <MeetingDetails />
          </RequireAuth>
        ),
      },

      // ✅ NEW: Edit Meeting page
      {
        path: "/meetings/:id/edit",
        element: (
          <RequireAuth>
            <EditMeeting />
          </RequireAuth>
        ),
      },

      {
        path: "/admin/requests",
        element: (
          <RequireAdmin>
            <AdminRequests />
          </RequireAdmin>
        ),
      }
    ],
  },
]);
