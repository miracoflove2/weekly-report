import {
  error, json, parseBody, requestKey, sectionKey, validWeek,
  validateRequestId, validateSection, type Env,
} from "../../../../_lib";

export const onRequestPut: PagesFunction<Env, "week" | "section"> = async ({ env, params, request }) => {
  const week = String(params.week);
  const section = String(params.section);
  if (!validWeek(week)) return error("INVALID_WEEK", "周报日期无效");
  if (!validateSection(section)) return error("INVALID_SECTION", "周报部分无效");
  const body = await parseBody(request);
  if (body instanceof Response) return body;
  if (Object.keys(body).some((key) => !["content", "requestId"].includes(key))) return error("INVALID_FIELDS", "包含不支持的字段");
  if (typeof body.content !== "string" || body.content.length > 10000) return error("INVALID_CONTENT", "内容不能超过 10,000 个字符");
  if (!validateRequestId(body.requestId)) return error("INVALID_REQUEST_ID", "requestId 无效");
  const duplicate = await env.WEEKLY_REPORTS.get(requestKey(body.requestId));
  if (duplicate) return json({ content: body.content, updatedAt: duplicate });
  const updatedAt = new Date().toISOString();
  await Promise.all([
    env.WEEKLY_REPORTS.put(sectionKey(week, section), body.content),
    env.WEEKLY_REPORTS.put(requestKey(body.requestId), updatedAt, { expirationTtl: 86400 }),
  ]);
  return json({ content: body.content, updatedAt });
};
