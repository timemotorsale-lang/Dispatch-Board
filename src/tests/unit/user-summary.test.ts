import { describe, expect, it } from "vitest";

import { listActiveUserSummaries } from "@/server/services/user-summary";

describe("user summary service", () => {
  it("returns active staff with role and duty summaries for the board", async () => {
    const summaries = await listActiveUserSummaries({
      async listActiveUsers() {
        return [
          {
            id: "user-eli",
            name: "Eli Manager",
            email: "morgan.manager@local.test",
            userRoles: [
              {
                role: {
                  name: "General Manager",
                  roleDuties: [
                    { duty: { name: "Review today's dispatch board" } },
                    { duty: { name: "Review blocked tasks" } }
                  ]
                }
              }
            ],
            userDuties: []
          },
          {
            id: "user-walter",
            name: "Walter Mechanic",
            email: "casey.mechanic@local.test",
            userRoles: [
              {
                role: {
                  name: "Mechanic",
                  roleDuties: [{ duty: { name: "Review assigned repair and diagnostic tasks" } }]
                }
              }
            ],
            userDuties: [
              {
                duty: {
                  name: "Move finished repair work to Ready for Review"
                }
              }
            ]
          }
        ];
      }
    });

    expect(summaries).toEqual([
      {
        id: "user-eli",
        name: "Eli Manager",
        email: "morgan.manager@local.test",
        roles: ["General Manager"],
        dutySource: "role_default",
        dutyPreview: ["Review blocked tasks", "Review today's dispatch board"],
        dutyCount: 2
      },
      {
        id: "user-walter",
        name: "Walter Mechanic",
        email: "casey.mechanic@local.test",
        roles: ["Mechanic"],
        dutySource: "custom",
        dutyPreview: ["Move finished repair work to Ready for Review"],
        dutyCount: 1
      }
    ]);
  });
});
