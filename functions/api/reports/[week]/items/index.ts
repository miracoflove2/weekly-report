import {
  error, getMeta, itemKey, json, metaKey, parseBody, readJson,
  requestKey, validWeek, validateItem, type Env,
} from "../../../../_lib";
import type { ProjectItem } from "../../../../../src/types";

export const onRequestPost: PagesFunction<Env, "week"> = async ({ env, params, request }) => {
  const week = String(params.week);
  if (!validWeek(week)) return error("INVALID_WEEK", "周报日期无效");
  const body = await parseBody(request);
  if (body instanceof Response) return body;
  const item = validateItem(body);
  if (typeof item === "string") return error("INVALID_ITEM", item);
  const duplicateId = await env.WEEKLY_REPORTS.get(requestKey(item.requestId));
  if (duplicateId) {
    const existing = await readJson<ProjectItem>(env.WEEKLY_REPORTS, itemKey(week, duplicateId));
    if (existing) return json(existing);
  }
  const meta = await getMeta(env.WEEKLY_REPORTS, week);
  if (!meta.itemIds.includes(item.id)) meta.itemIds.push(item.id);
  meta.updatedAt = item.updatedAt;
  await Promise.all([
    env.WEEKLY_REPORTS.put(itemKey(week, item.id), JSON.stringify(item)),
    env.WEEKLY_REPORTS.put(metaKey(week), JSON.stringify(meta)),
    env.WEEKLY_REPORTS.put(requestKey(item.requestId), item.id, { expirationTtl: 86400 }),
  ]);
  return json(item, 201);
};
