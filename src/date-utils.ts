import type { Status } from "./types";
import type { ProjectItem } from "./types";

const DAY_MS = 86_400_000;

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shanghaiToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getMonday(value = shanghaiToday()): string {
  const date = parseDateOnly(value);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return formatDateOnly(date);
}

export function addDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

export function dayDifference(from: string, to: string): number {
  return Math.round(
    (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS,
  );
}

export function deadlineLabel(dueDate: string, today = shanghaiToday()): string {
  if (!dueDate) return "—";
  const days = dayDifference(today, dueDate);
  if (days > 0) return `剩余 ${days} 天`;
  if (days === 0) return "今天截止";
  return `已逾期 ${Math.abs(days)} 天`;
}

export function automaticStatus(
  startDate: string,
  dueDate: string,
  today = shanghaiToday(),
): Status {
  if (startDate && today < startDate) return "未启动";
  if (dueDate && today > dueDate) return "已延期";
  return "进行中";
}

export function displayDate(value: string): string {
  const date = parseDateOnly(value);
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

export function compareProjectItems(left: ProjectItem, right: ProjectItem): number {
  return left.startDate.localeCompare(right.startDate)
    || left.dueDate.localeCompare(right.dueDate)
    || left.id.localeCompare(right.id);
}
