import {
  error, getMeta, itemKey, json, metaKey, parseBody, requestKey,
  validId, validWeek, validateItem, validateRequestId, type Env,
} from "../../../../_lib";

export const onRequestPut: PagesFunction<Env, "week" | "id"> = async ({ env, params, request }) => {
  const week = String(params.week);
  const id = String(params.id);
  if (!validWeek(week) || !validId(id)) return error("INVALID_PATH", "周报日期或项目 ID 无效");
  const body = await parseBody(request);
  if (body instanceof Response) return body;
  const item = validateItem(body, id);
  if (typeof item === "string") return error("INVALID_ITEM", item);
  const duplicate = await env.WEEKLY_REPORTS.get(requestKey(item.requestId));
  if (duplicate) return json(item);
  const exists = await env.WEEKLY_REPORTS.get(itemKey(week, id));
  if (!exists) return error("NOT_FOUND", "项目不存在", 404);
  await Promise.all([
    env.WEEKLY_REPORTS.put(itemKey(week, id), JSON.stringify(item)),
    env.WEEKLY_REPORTS.put(requestKey(item.requestId), id, { expirationTtl: 86400 }),
  ]);
  return json(item);
};

export const onRequestDelete: PagesFunction<Env, "week" | "id"> = async ({ env, params, request }) => {
  const week = String(params.week);
  const id = String(params.id);
  if (!validWeek(week) || !validId(id)) return error("INVALID_PATH", "周报日期或项目 ID 无效");
  const requestId = new URL(request.url).searchParams.get("requestId");
  if (!validateRequestId(requestId)) return error("INVALID_REQUEST_ID", "requestId 无效");
  if (await env.WEEKLY_REPORTS.get(requestKey(requestId))) return json({ deleted: true });
  const meta = await getMeta(env.WEEKLY_REPORTS, week);
  meta.itemIds = meta.itemIds.filter((value) => value !== id);
  meta.updatedAt = new Date().toISOString();
  await Promise.all([
    env.WEEKLY_REPORTS.delete(itemKey(week, id)),
    env.WEEKLY_REPORTS.put(metaKey(week), JSON.stringify(meta)),
    env.WEEKLY_REPORTS.put(requestKey(requestId), id, { expirationTtl: 86400 }),
  ]);
  return json({ deleted: true });
};
