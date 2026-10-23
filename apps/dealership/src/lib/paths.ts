export const basePath = process.env.NEXT_PUBLIC_REVIEW_BASE_PATH === "/website-review" ? "/website-review" : "";

export function publicPath(path: string) {
  return `${basePath}${path}`;
}
