export const ASSIGNEES = [
  "钟鑫",
  "李爽朗",
  "刘凯",
  "汤康兴",
  "吴永胡",
  "曾鑫",
  "贺凯翔",
  "卢韩金",
  "严祺越",
] as const;

export const STATUSES = ["未启动", "进行中", "已暂停", "已延期", "已完成"] as const;
export const SECTION_NAMES = ["summary", "plan", "other"] as const;

export type Status = (typeof STATUSES)[number];
export type SectionName = (typeof SECTION_NAMES)[number];
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface ProjectItem {
  id: string;
  task: string;
  assignee: string;
  startDate: string;
  dueDate: string;
  completedDate: string;
  statusOverride: Status | null;
  note: string;
  updatedAt: string;
  requestId: string;
}

export interface WeeklyReport {
  week: string;
  sections: Record<SectionName, string>;
  items: ProjectItem[];
  updatedAt: string | null;
}
