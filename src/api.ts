import type { ProjectItem, SectionName, WeeklyReport } from "./types";

type ApiErrorBody = { error?: { message?: string } };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401 && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error?.message || "请求失败，请稍后重试");
  }
  return response.json() as Promise<T>;
}

export async function logout() {
  await request<{ authenticated: boolean }>("/api/auth/logout", { method: "POST" });
  window.location.assign("/login");
}

export function getReport(week: string) {
  return request<WeeklyReport>(`/api/reports/${week}`);
}

export function saveSection(
  week: string,
  section: SectionName,
  content: string,
  requestId: string,
) {
  return request<{ content: string; updatedAt: string }>(
    `/api/reports/${week}/sections/${section}`,
    { method: "PUT", body: JSON.stringify({ content, requestId }) },
  );
}

export function createItem(week: string, item: ProjectItem) {
  return request<ProjectItem>(`/api/reports/${week}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function updateItem(week: string, item: ProjectItem) {
  return request<ProjectItem>(`/api/reports/${week}/items/${item.id}`, {
    method: "PUT",
    body: JSON.stringify(item),
  });
}

export function removeItem(week: string, id: string, requestId: string) {
  return request<{ deleted: boolean }>(
    `/api/reports/${week}/items/${id}?requestId=${encodeURIComponent(requestId)}`,
    { method: "DELETE" },
  );
}
