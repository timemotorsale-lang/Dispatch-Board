export function currentCustomerPageHref(pathname: string, search: string, hash: string) {
  if (!/^\/crm\/customers\/[^/?#]+$/.test(pathname)) {
    return null;
  }

  const query = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  const fragment = hash.startsWith("#") ? hash : `#${hash}`;
  return `${pathname}${query}${fragment}`;
}
