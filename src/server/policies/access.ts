import type { AuthenticatedUser } from "@/server/auth/store";

export const GENERAL_MANAGER_ROLE_NAME = "General Manager";
export const DELEGATED_MANAGER_DUTY_NAME = "Delegated manager capabilities";

export type AssignedWorkPermissionInput = {
  actor: AuthenticatedUser | null;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  requestedAction: "comment" | "status" | "complete" | "reassign";
};

export function assertAuthenticatedUser(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

export function isManager(user: AuthenticatedUser | null) {
  if (!user) {
    return false;
  }

  return isGeneralManager(user) || user.duties.all.includes(DELEGATED_MANAGER_DUTY_NAME);
}

export function isGeneralManager(user: AuthenticatedUser | null) {
  if (!user) {
    return false;
  }

  return user.roles.includes(GENERAL_MANAGER_ROLE_NAME);
}

export function canGrantManagerPowers(user: AuthenticatedUser | null) {
  return isGeneralManager(user);
}

export function canManageUsers(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageRoles(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageDuties(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageAssignments(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageSettings(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageBoardGeneration(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageTaskTemplates(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canManageAppointmentConfiguration(user: AuthenticatedUser | null) {
  return isGeneralManager(user);
}

export type AppointmentLocationAccessGrant = {
  canViewSchedule: boolean;
  canParticipate: boolean;
  canOwnAppointments: boolean;
  canManageAppointments: boolean;
  canViewLimitedData: boolean;
};

export type AppointmentPermissionInput = {
  actor: AuthenticatedUser | null;
  ownerUserId: string | null;
  locationAccess: AppointmentLocationAccessGrant | null;
};

export function canCreateAppointment(input: AppointmentPermissionInput) {
  if (!input.actor || !input.locationAccess?.canViewSchedule) {
    return false;
  }

  const managerAtLocation =
    isManager(input.actor) && input.locationAccess.canManageAppointments;
  const eligibleOwner =
    input.ownerUserId === input.actor.id &&
    input.locationAccess.canOwnAppointments &&
    input.locationAccess.canParticipate;

  return managerAtLocation || eligibleOwner;
}

export function canMutateAppointment(input: AppointmentPermissionInput) {
  if (!input.actor || !input.locationAccess?.canViewSchedule) {
    return false;
  }

  const managerAtLocation =
    isManager(input.actor) && input.locationAccess.canManageAppointments;
  const eligibleOwner =
    input.ownerUserId === input.actor.id &&
    input.locationAccess.canOwnAppointments &&
    input.locationAccess.canParticipate;

  return managerAtLocation || eligibleOwner;
}

export type AppointmentLocationManagerPermissionInput = {
  actor: AuthenticatedUser | null;
  locationAccess: AppointmentLocationAccessGrant | null;
};

export function canApproveAppointment(input: AppointmentLocationManagerPermissionInput) {
  return Boolean(
    isManager(input.actor) &&
      input.locationAccess?.canViewSchedule &&
      input.locationAccess.canManageAppointments
  );
}

export function canTransferAppointmentOwnership(
  input: AppointmentLocationManagerPermissionInput
) {
  return canApproveAppointment(input);
}

export function canOverrideAppointmentWarning(
  input: AppointmentLocationManagerPermissionInput
) {
  return canApproveAppointment(input);
}

export function canViewAppointmentSchedule(
  input: AppointmentLocationManagerPermissionInput
) {
  return Boolean(input.actor && input.locationAccess?.canViewSchedule);
}

export function canViewAppointmentLimitedData(input: AppointmentPermissionInput) {
  if (!input.actor || !input.locationAccess?.canViewLimitedData) {
    return false;
  }

  const managerAtLocation =
    isManager(input.actor) && input.locationAccess.canManageAppointments;
  const ownerAtLocation =
    input.ownerUserId === input.actor.id && input.locationAccess.canOwnAppointments;

  return managerAtLocation || ownerAtLocation;
}

export function canReviewWorkflows(user: AuthenticatedUser | null) {
  return isManager(user);
}

export function canViewFullBoard(user: AuthenticatedUser | null) {
  return Boolean(user);
}

export function canViewCustomerContact(user: AuthenticatedUser | null, ownerUserId: string | null) {
  return Boolean(user && (isManager(user) || ownerUserId === user.id));
}

export function canCommentOnTask(user: AuthenticatedUser | null) {
  return canViewFullBoard(user);
}

export function canUseStaffSelfService(user: AuthenticatedUser | null, subjectUserId: string) {
  if (!user) {
    return false;
  }

  if (isManager(user)) {
    return true;
  }

  return user.id === subjectUserId;
}

export function canUpdateAssignedWork(input: AssignedWorkPermissionInput) {
  const { actor, assignedUserId, requestedAction, requiresManagerApproval } = input;

  if (!actor) {
    return false;
  }

  if (requestedAction === "comment") {
    return canCommentOnTask(actor);
  }

  if (isManager(actor)) {
    return true;
  }

  if (actor.id !== assignedUserId) {
    return false;
  }

  if (requestedAction === "reassign") {
    return false;
  }

  if (requestedAction === "complete" && requiresManagerApproval) {
    return false;
  }

  return true;
}
