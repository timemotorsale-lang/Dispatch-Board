export function reusePrismaClient<T>(existing: T | undefined, create: () => T) {
  return existing ?? create();
}
