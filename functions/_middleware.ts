import { authConfigured, hasValidSession, type AuthEnv } from "./_auth";

type Env = AuthEnv & { WEEKLY_REPORTS: KVNamespace };

export const onRequest: PagesFunction<Env> = async ({ env, request, next }) => {
  const url = new URL(request.url);
  const isAuthApi = url.pathname.startsWith("/api/auth/");
  const isAsset = url.pathname.startsWith("/assets/") || /\.(?:css|js|map|ico|png|jpg|webp|woff2?)$/.test(url.pathname);

  if (isAuthApi || isAsset) return next();
  if (!authConfigured(env)) {
    return Response.json(
      { error: { code: "AUTH_NOT_CONFIGURED", message: "认证环境变量尚未配置" } },
      { status: 503 },
    );
  }

  const authenticated = await hasValidSession(request, env.SESSION_SECRET);
  if (url.pathname.startsWith("/api/")) {
    return authenticated
      ? next()
      : Response.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  if (!authenticated && url.pathname !== "/login") {
    return Response.redirect(new URL("/login", url), 302);
  }
  if (authenticated && url.pathname === "/login") {
    return Response.redirect(new URL("/", url), 302);
  }
  return next();
};
