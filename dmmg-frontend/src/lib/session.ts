export const SESSION_KEYS = {
  token: "token",
  userName: "session_user_name",
  userEmail: "session_user_email",
  userRole: "session_user_role",
  orgName: "session_org_name",
} as const;

export function getSessionToken() {
  return sessionStorage.getItem(SESSION_KEYS.token);
}

export function saveSessionDetails(input: {
  token: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  orgName?: string | null;
}) {
  sessionStorage.setItem(SESSION_KEYS.token, input.token);
  localStorage.removeItem(SESSION_KEYS.token);

  if (input.userName?.trim()) {
    localStorage.setItem(SESSION_KEYS.userName, input.userName.trim());
  } else {
    localStorage.removeItem(SESSION_KEYS.userName);
  }

  if (input.userEmail?.trim()) {
    localStorage.setItem(SESSION_KEYS.userEmail, input.userEmail.trim());
  } else {
    localStorage.removeItem(SESSION_KEYS.userEmail);
  }

  if (input.userRole?.trim()) {
    localStorage.setItem(SESSION_KEYS.userRole, input.userRole.trim());
  } else {
    localStorage.removeItem(SESSION_KEYS.userRole);
  }

  if (input.orgName?.trim()) {
    localStorage.setItem(SESSION_KEYS.orgName, input.orgName.trim());
  } else {
    localStorage.removeItem(SESSION_KEYS.orgName);
  }
}

export function clearSessionDetails() {
  sessionStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.userName);
  localStorage.removeItem(SESSION_KEYS.userEmail);
  localStorage.removeItem(SESSION_KEYS.userRole);
  localStorage.removeItem(SESSION_KEYS.orgName);
}
