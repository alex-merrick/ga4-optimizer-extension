// Same-origin proxy for the Stape sGTM custom loader.
// Maps https://www.gaoptimizer.com/gakpi/<path>?<query> to https://tcqjwhhs.gaoptimizer.com/<path>?<query>.
// Headers follow the Stape guide: https://stape.io/helpdesk/documentation/how-to-use-same-origin-through-netlify

const PATH_PREFIX = "/gakpi";
const TARGET_ORIGIN = "https://tcqjwhhs.gaoptimizer.com";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// Responses without a body (HEAD, 204, 205, 304) must not receive one.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

export default async (request, context) => {
  const incoming = new URL(request.url);
  const targetPath = incoming.pathname.slice(PATH_PREFIX.length) || "/";
  const targetUrl = `${TARGET_ORIGIN}${targetPath}${incoming.search}`;

  const clientIp = context.ip || "unknown";
  const headers = new Headers(request.headers);
  headers.set("Host", new URL(TARGET_ORIGIN).host);
  headers.set("X-Forwarded-For", clientIp);
  headers.set("CF-Connecting-Ip", clientIp);
  headers.set("X-From-Cdn", "cf-stape");
  // Ask for an uncompressed body so the response headers match the bytes we return.
  headers.set("Accept-Encoding", "identity");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  for (const [name, value] of upstream.headers) {
    if (HOP_BY_HOP_HEADERS.has(name)) continue;
    if (name === "content-encoding" || name === "content-length") continue;
    responseHeaders.append(name, value);
  }

  const noBody = request.method === "HEAD" || NULL_BODY_STATUSES.has(upstream.status);
  const responseBody = noBody ? null : await upstream.arrayBuffer();

  return new Response(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

export const config = { path: "/gakpi/*" };
