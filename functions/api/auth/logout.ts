import { clearSessionCookie } from "../../_auth";

export const onRequestPost: PagesFunction = async () => Response.json(
  { authenticated: false },
  { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } },
);
