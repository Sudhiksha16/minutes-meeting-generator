import { useParams } from "react-router-dom";
import CreateMeeting from "./CreateMeeting";

export default function EditMeeting() {
  const { id } = useParams();
  const meetingId = String(id ?? "");

  if (!meetingId) return <div className="p-6">Meeting not found</div>;
  return <CreateMeeting editMeetingId={meetingId} />;
}
