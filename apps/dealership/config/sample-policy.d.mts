export type SamplePolicy = { deployment: string; enabled: boolean; error: string | null };
export function samplePolicy(environment?: Record<string, string | undefined>): SamplePolicy;
export function assertSamplePolicy(environment?: Record<string, string | undefined>): SamplePolicy;
