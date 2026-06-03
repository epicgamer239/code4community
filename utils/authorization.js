// Authorization utility functions
import { isAdminEmail } from "@/config/admin";
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

function isAdmin(userRole) {
  return userRole === ROLES.ADMIN;
}

export const isAdminByEmail = (email) => {
  return isAdminEmail(normalizeEmail(email));
};

export const isAdminUser = (userRole, email) => {
  return isAdmin(userRole) || isAdminByEmail(email);
};

export const isTeacherOrAdmin = (userRole) => {
  return userRole === ROLES.TEACHER || userRole === ROLES.ADMIN;
};

export const isTutorOrHigher = (userRole, mathLabRole = null) => {
  if ([ROLES.TUTOR, ROLES.TEACHER, ROLES.ADMIN].includes(userRole)) {
    return true;
  }

  if (mathLabRole === "tutor") {
    return true;
  }

  return false;
};
