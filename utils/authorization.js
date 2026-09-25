// Authorization utility functions
import {
  isMathLabAdminUser,
  isSiteAdminUser,
  isWritingCenterAdminUser,
} from "@/lib/auth/productAdmins";
import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";

const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  TUTOR: "tutor",
};

const PERMISSIONS = {
  READ: "read",
  WRITE: "write",
  MANAGE: "manage",
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    users: [PERMISSIONS.MANAGE],
    mathlab: [PERMISSIONS.MANAGE],
    settings: [PERMISSIONS.MANAGE],
    requests: [PERMISSIONS.MANAGE],
    sessions: [PERMISSIONS.MANAGE],
  },
  [ROLES.TEACHER]: {
    users: [PERMISSIONS.READ],
    mathlab: [PERMISSIONS.MANAGE],
    settings: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    requests: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    sessions: [PERMISSIONS.READ, PERMISSIONS.WRITE],
  },
  [ROLES.TUTOR]: {
    users: [PERMISSIONS.READ],
    mathlab: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    settings: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    requests: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    sessions: [PERMISSIONS.READ, PERMISSIONS.WRITE],
  },
  [ROLES.STUDENT]: {
    users: [PERMISSIONS.READ],
    mathlab: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    settings: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    requests: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    sessions: [PERMISSIONS.READ],
  },
};

function hasPermission(userRole, resource, permission) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }

  const userPermissions = ROLE_PERMISSIONS[userRole][resource] || [];

  if (userPermissions.includes(permission)) {
    return true;
  }

  if (permission === PERMISSIONS.READ) {
    return (
      userPermissions.includes(PERMISSIONS.WRITE) ||
      userPermissions.includes(PERMISSIONS.MANAGE)
    );
  }

  if (permission === PERMISSIONS.WRITE) {
    return userPermissions.includes(PERMISSIONS.MANAGE);
  }

  return false;
}

export const canAccess = (userRole, resource, mathLabRole = null) => {
  if (hasPermission(userRole, resource, PERMISSIONS.READ)) {
    return true;
  }

  if (resource === "mathlab" && mathLabRole === "tutor") {
    return true;
  }

  return false;
};

export const isAdminByEmail = (email) => {
  return isAdminEmail(normalizeEmail(email));
};

/** Site super admin (config allowlist). Prefer passing full userData when available. */
export const isSiteAdmin = (userData, email) => {
  if (userData && typeof userData === "object" && "role" in userData) {
    return isSiteAdminUser(userData, email ?? userData.email);
  }
  return isAdminByEmail(email);
};

/** Site super admin only (config allowlist). Math Lab deputies use isMathLabAdmin. */
export const isAdminUser = (_userRole, email) => isAdminByEmail(email);

export { isMathLabAdminUser, isSiteAdminUser, isWritingCenterAdminUser };

/** Math Lab /mathlab/admin and Math Lab staff elevation (not Writing Center admin). */
export const isMathLabAdmin = (userData, email) =>
  isMathLabAdminUser(userData, email ?? userData?.email);

/** Writing Center admin dashboard. */
export const isWritingCenterAdmin = (userData, email) =>
  isWritingCenterAdminUser(userData, email ?? userData?.email);

export const isTeacherOrAdmin = (userRole) => {
  return userRole === ROLES.TEACHER || userRole === ROLES.ADMIN;
};

export const isTutorOrHigher = (userRole, mathLabRole = null) => {
  // Math Lab tutoring is mathLabRole (or teacher/admin). role===tutor is Writing Center only.
  if ([ROLES.TEACHER, ROLES.ADMIN].includes(userRole)) {
    return true;
  }

  if (mathLabRole === "tutor") {
    return true;
  }

  return false;
};
