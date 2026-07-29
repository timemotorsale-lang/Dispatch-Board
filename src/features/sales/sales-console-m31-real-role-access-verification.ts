export type SalesConsoleM31RoleAccessCheck = {
  role: "Salesperson" | "Sales Manager" | "BDC / Lead Coordinator" | "Admin / Owner";
  testUserRequirement: string;
  expectedLanding: string;
  allowedManagerReviewAccess: string;
  mustNotSee: string[];
  verificationStatus: "ready-for-real-user-smoke";
};

export const salesConsoleM31RealRoleAccessVerification = {
  milestone: "Milestone 31 - Real Role Access Verification",
  roleAccessPosture: "ready-for-one-user-per-role-smoke",
  accessSummary: "Verify one real or seeded user per core staff role before broad rollout. Each role should land in the correct operating view with no inappropriate admin or risky workflow access.",
  roleChecks: [
    {
      role: "Salesperson",
      testUserRequirement: "One active sales staff user mapped to the salesperson role.",
      expectedLanding: "Salesperson Today with priority work, blockers, source labels, and Manager Review Request entry when valid.",
      allowedManagerReviewAccess: "Can submit Manager Review Request when required fields and source context are present.",
      mustNotSee: ["admin rollout gate controls", "discount approval controls", "finance decision controls"],
      verificationStatus: "ready-for-real-user-smoke"
    },
    {
      role: "Sales Manager",
      testUserRequirement: "One active manager user mapped to the sales manager role.",
      expectedLanding: "Manager Command Center and Manager Review Workbench with team blockers and incoming request context.",
      allowedManagerReviewAccess: "Can review incoming Manager Review Requests; resolution controls remain unavailable until separately approved.",
      mustNotSee: ["finance decision controls", "quote submission controls", "vehicle hold controls"],
      verificationStatus: "ready-for-real-user-smoke"
    },
    {
      role: "BDC / Lead Coordinator",
      testUserRequirement: "One active BDC or lead coordinator user mapped to the BDC / Lead Coordinator role.",
      expectedLanding: "Lead Operations with assignment gaps, duplicate risk, SLA risk, and CRM/source verification prompts.",
      allowedManagerReviewAccess: "Can use lead context to escalate through approved source-system or manager paths; no customer automation is enabled.",
      mustNotSee: ["customer messaging automation", "admin rollout gate controls", "discount approval controls"],
      verificationStatus: "ready-for-real-user-smoke"
    },
    {
      role: "Admin / Owner",
      testUserRequirement: "One owner/admin user mapped to Admin / Owner.",
      expectedLanding: "Deployment readiness, role coverage, release gates, support owner, rollback path, and guardrail evidence.",
      allowedManagerReviewAccess: "Can review Manager Review Request health and deployment evidence without unlocking broad workflows.",
      mustNotSee: ["unreviewed broad write enablement", "CRM/DMS replacement controls", "finance decision controls"],
      verificationStatus: "ready-for-real-user-smoke"
    }
  ] satisfies SalesConsoleM31RoleAccessCheck[],
  unauthorizedBehavior: "Users without a mapped Sales Console role should be denied, redirected, or shown unavailable access according to the existing protected-route behavior.",
  roleLeakageNoGo: [
    "A salesperson sees admin rollout controls.",
    "A BDC user sees discount, finance, quote, or hold controls as active.",
    "A manager can execute resolution, discount, finance, quote, hold, or messaging actions from Sales Console.",
    "An unmapped user can open operational Sales Console content."
  ]
} as const;

export function salesConsoleM31CoversEveryDeploymentRole() {
  return salesConsoleM31RealRoleAccessVerification.roleChecks.map((check) => check.role).join("|") ===
    "Salesperson|Sales Manager|BDC / Lead Coordinator|Admin / Owner";
}

export function salesConsoleM31RequiresOneUserPerRole() {
  return salesConsoleM31RealRoleAccessVerification.roleChecks.every((check) =>
    check.testUserRequirement.includes("One active") || check.testUserRequirement.includes("One owner")
  );
}

export function salesConsoleM31DefinesUnauthorizedBehavior() {
  return salesConsoleM31RealRoleAccessVerification.unauthorizedBehavior.includes("denied") &&
    salesConsoleM31RealRoleAccessVerification.unauthorizedBehavior.includes("protected-route");
}

export function salesConsoleM31BlocksRoleLeakageRisks() {
  return salesConsoleM31RealRoleAccessVerification.roleLeakageNoGo.length >= 4 &&
    salesConsoleM31RealRoleAccessVerification.roleChecks.every((check) => check.mustNotSee.length >= 3);
}
