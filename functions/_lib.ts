import { ASSIGNEES, SECTION_NAMES, STATUSES } from "../src/types";
import type { ProjectItem, SectionName, WeeklyReport } from "../src/types";

export interface Env {
  WEEKLY_REPORTS: KVNamespace;
}

export interface Meta {
  week: string;
  itemIds: string[];
  updatedAt: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[0-9a-f-]{36}$/i;

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function error(code: string, message: string, status = 400): Response {
  return json({ error: { code, message } }, status);
}

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validWeek(value: string): boolean {
  if (!validDate(value)) return false;
  return new Date(`${value}T00:00:00Z`).getUTCDay() === 1;
}

export function validId(value: string): boolean {
  return ID_RE.test(value);
}

export function metaKey(week: string) { return `week:${week}:meta`; }
export function sectionKey(week: string, section: string) { return `week:${week}:section:${section}`; }
export function itemKey(week: string, id: string) { return `week:${week}:item:${id}`; }
export function requestKey(requestId: string) { return `request:${requestId}`; }

export async function readJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  return kv.get<T>(key, "json");
}

export async function getMeta(kv: KVNamespace, week: string): Promise<Meta> {
  return (await readJson<Meta>(kv, metaKey(week))) || {
    week,
    itemIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function parseBody(request: Request): Promise<Record<string, unknown> | Response> {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) return error("INVALID_CONTENT_TYPE", "请提交 JSON 数据", 415);
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    return error("INVALID_JSON", "请求内容不是有效的 JSON");
  }
}

export function validateRequestId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 100;
}

export function validateSection(section: string): section is SectionName {
  return (SECTION_NAMES as readonly string[]).includes(section);
}

export function validateItem(body: Record<string, unknown>, expectedId?: string): string | ProjectItem {
  const allowed = new Set(["id", "task", "assignee", "startDate", "dueDate", "completedDate", "statusOverride", "note", "updatedAt", "requestId"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return "包含不支持的字段";
  if (typeof body.id !== "string" || !validId(body.id) || (expectedId && body.id !== expectedId)) return "项目 ID 无效";
  if (typeof body.task !== "string" || !body.task.trim() || body.task.length > 200) return "待办事项应为 1—200 个字符";
  if (typeof body.assignee !== "string" || !(ASSIGNEES as readonly string[]).includes(body.assignee)) return `执行人“${String(body.assignee)}”不在固定名单中`;
  if (!validDate(body.startDate) || !validDate(body.dueDate)) return "开始时间或截止日期无效";
  if (body.dueDate < body.startDate) return "截止日期不能早于开始时间";
  if (body.completedDate !== "" && !validDate(body.completedDate)) return "完成时间无效";
  if (!(STATUSES as readonly unknown[]).includes(body.statusOverride)) return "状态值无效";
  if (typeof body.note !== "string" || body.note.length > 1000) return "备注不能超过 1000 个字符";
  if (!validateRequestId(body.requestId)) return "requestId 无效";
  return {
    id: body.id,
    task: body.task.trim(),
    assignee: body.assignee,
    startDate: body.startDate,
    dueDate: body.dueDate,
    completedDate: body.completedDate as string,
    statusOverride: body.statusOverride as ProjectItem["statusOverride"],
    note: body.note,
    updatedAt: new Date().toISOString(),
    requestId: body.requestId,
  };
}

export async function buildReport(kv: KVNamespace, week: string): Promise<WeeklyReport> {
  const meta = await getMeta(kv, week);
  const [summary, plan, other, ...items] = await Promise.all([
    kv.get(sectionKey(week, "summary")),
    kv.get(sectionKey(week, "plan")),
    kv.get(sectionKey(week, "other")),
    ...meta.itemIds.map((id) => readJson<ProjectItem>(kv, itemKey(week, id))),
  ]);
  return {
    week,
    sections: { summary: summary || "", plan: plan || "", other: other || "" },
    items: items.filter((item): item is ProjectItem => Boolean(item)),
    updatedAt: meta.updatedAt || null,
  };
}
