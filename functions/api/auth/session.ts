import { authConfigured, hasValidSession, type AuthEnv } from "../../_auth";

export const onRequestGet: PagesFunction<AuthEnv> = async ({ env, request }) => {
  const authenticated = authConfigured(env) && await hasValidSession(request, env.SESSION_SECRET);
  return Response.json({ authenticated }, { headers: { "Cache-Control": "no-store" } });
};
