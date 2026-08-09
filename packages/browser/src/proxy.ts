export type ParsedProxy = {
  server: string;
  username?: string;
  password?: string;
};

export function parseProxyUrl(url: string): ParsedProxy {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("proxy_url_empty");
  const parsed = new URL(trimmed);
  const server = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
  return { server, username, password };
}
