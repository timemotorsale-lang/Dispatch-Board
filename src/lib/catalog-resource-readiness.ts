export function missingCatalogResourceCapabilities(requirements: string[], resources: { code: string; attributes?: unknown }[]) {
  const capabilities = new Set(resources.flatMap(resource => {
    const attributes = resource.attributes && typeof resource.attributes === "object" && !Array.isArray(resource.attributes) ? resource.attributes as Record<string, unknown> : {};
    const declared = Array.isArray(attributes.catalogCapabilities) ? attributes.catalogCapabilities.filter((value): value is string => typeof value === "string") : [];
    return [resource.code, ...declared].map(value => value.toUpperCase());
  }));
  return requirements.filter(requirement => !capabilities.has(requirement.toUpperCase()));
}
