export const diagnosisFormId = "repair-diagnosis-form";

export type DiagnosisRequest = {
  route: "IN_HOUSE" | "OUTSIDE_VENDOR";
  instructions: string;
  assigneeId: string;
  assigneeName: string;
  evidenceId?: string;
};

export function diagnosisRequestStatus(request: DiagnosisRequest) {
  return request.route === "OUTSIDE_VENDOR" ? "Arrange vendor diagnosis" : "Awaiting findings";
}
