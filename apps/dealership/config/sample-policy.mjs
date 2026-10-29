export function samplePolicy(environment = {}) {
  const deployment = environment.DEALERSHIP_ENVIRONMENT || (["development", "test"].includes(environment.NODE_ENV) ? "development" : "public-production");
  const requested = environment.DEALERSHIP_PREVIEW_DATA === "1";
  let error = null;
  if (!["development", "private-review", "public-production"].includes(deployment)) error = "Unknown dealership deployment environment.";
  else if (environment.DEALERSHIP_PREVIEW_DATA && !["0", "1"].includes(environment.DEALERSHIP_PREVIEW_DATA)) error = "Sample mode must be explicitly 0 or 1.";
  else if (deployment === "public-production" && (requested || environment.DEALERSHIP_HOSTED_REVIEW === "1" || environment.NEXT_PUBLIC_REVIEW_BASE_PATH)) error = "Public production cannot enable sample data or private-review configuration.";
  else if (deployment === "development" && environment.NODE_ENV === "production") error = "Production builds must use private-review or public-production, not development.";
  else if (environment.DEALERSHIP_HOSTED_REVIEW === "1" && deployment !== "private-review") error = "Hosted samples require the explicit private-review environment.";
  else if (deployment === "private-review" && environment.DEALERSHIP_HOSTED_REVIEW !== "1") error = "Private review requires the staff gateway configuration.";
  else if (requested && environment.DEALERSHIP_LISTINGS_PATH) error = "Sample data and a live inventory feed cannot be combined.";
  if (!error && requested && deployment === "private-review") {
    try {
      const origin = new URL(environment.DEALERSHIP_REVIEW_ORIGIN || "");
      if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || (environment.DEALERSHIP_REVIEW_KEY?.length || 0) < 32) throw new Error();
    } catch {
      error = "Private samples require a strong gateway key and an HTTPS review origin.";
    }
  }
  return { deployment, enabled: requested && !error, error };
}

export function assertSamplePolicy(environment = {}) {
  const policy = samplePolicy(environment);
  if (policy.error) throw new Error(policy.error);
  return policy;
}
