import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments, canViewFullBoard } from "@/server/policies/access";

export function canViewVendorRegistry(user: AuthenticatedUser | null) {
  return canViewFullBoard(user);
}

export function canCreateVendor(user: AuthenticatedUser | null) {
  return canManageAssignments(user);
}

export function canUpdateVendor(user: AuthenticatedUser | null) {
  return canManageAssignments(user);
}

export function canAddVendorNote(user: AuthenticatedUser | null) {
  return canViewVendorRegistry(user);
}

export function canCreateVendorTask(user: AuthenticatedUser | null) {
  return canViewVendorRegistry(user);
}

export function assertVendorRegistryAccess(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!canViewVendorRegistry(user)) {
    throw new Error("Authentication required.");
  }
}

export function assertVendorCreateAccess(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!canCreateVendor(user)) {
    throw new Error("Only managers can add vendors right now.");
  }
}

export function assertVendorUpdateAccess(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!canUpdateVendor(user)) {
    throw new Error("Only managers can update vendor master records right now.");
  }
}

export function assertVendorNoteAccess(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!canAddVendorNote(user)) {
    throw new Error("Authentication required.");
  }
}

export function assertVendorTaskAccess(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!canCreateVendorTask(user)) {
    throw new Error("Authentication required.");
  }
}
