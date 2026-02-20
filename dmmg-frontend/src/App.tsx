import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MeetingsList from "./features/meetings/MeetingsList";
import MeetingsDashboard from "./features/meetings/MeetingsDashboard";
import CreateMeeting from "./features/meetings/CreateMeeting";
import MeetingDetails from "./features/meetings/MeetingDetails";
import EditMeeting from "./features/meetings/EditMeeting";

import AdminRequests from "./features/dashboard/AdminRequests";
import RequireAdmin from "./features/auth/RequireAdmin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/meetings" replace />} />

        <Route path="/meetings" element={<MeetingsList />} />
        <Route path="/meetings/dashboard" element={<MeetingsDashboard />} />
        <Route path="/meetings/new" element={<CreateMeeting />} />
        <Route path="/meetings/:meetingId" element={<MeetingDetails />} />
        <Route path="/meetings/:meetingId/edit" element={<EditMeeting />} />

        {/* ✅ Admin-only */}
        <Route
          path="/admin/requests"
          element={
            <RequireAdmin>
              <AdminRequests />
            </RequireAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
