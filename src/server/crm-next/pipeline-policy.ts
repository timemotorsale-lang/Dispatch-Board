/** Initial store policy uses calendar minutes until a business calendar is approved. */
export function pipelinePolicy(env: NodeJS.ProcessEnv = process.env) {
  const minutes = (key: string, fallback: number, max = 1440) => {
    const value = Number(env[key] ?? fallback);
    return Number.isInteger(value) && value >= 1 && value <= max ? value : fallback;
  };
  return { clock: "Calendar minutes · America/Chicago boundaries", assignmentMinutes: minutes("CRM_PIPELINE_ASSIGNMENT_MINUTES", 15), responseMinutes: minutes("CRM_PIPELINE_RESPONSE_MINUTES", 30), handoffMinutes: minutes("CRM_PIPELINE_HANDOFF_MINUTES", 120), stalledDays: minutes("CRM_PIPELINE_STALLED_DAYS", 14, 365) };
}
