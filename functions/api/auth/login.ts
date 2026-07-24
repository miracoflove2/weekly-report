import {
  authConfigured,
  createSessionCookie,
  passwordMatches,
  type AuthEnv,
} from "../../_auth";

export const onRequestPost: PagesFunction<AuthEnv> = async ({ env, request }) => {
  if (!authConfigured(env)) {
    return Response.json(
      { error: { code: "AUTH_NOT_CONFIGURED", message: "认证环境变量尚未配置" } },
      { status: 503 },
    );
  }
  let password = "";
  try {
    const body = await request.json<{ password?: unknown }>();
    if (typeof body.password === "string") password = body.password;
  } catch {
    return Response.json({ error: { code: "INVALID_JSON", message: "请求格式无效" } }, { status: 400 });
  }
  if (!await passwordMatches(password, env.APP_PASSWORD)) {
    return Response.json(
      { error: { code: "INVALID_PASSWORD", message: "密码错误，请重新输入" } },
      { status: 401 },
    );
  }
  return Response.json(
    { authenticated: true },
    { headers: { "Set-Cookie": await createSessionCookie(env.SESSION_SECRET), "Cache-Control": "no-store" } },
  );
};
