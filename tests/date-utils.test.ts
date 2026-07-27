import { describe, expect, it } from "vitest";
import {
  addDays,
  automaticStatus,
  compareProjectItems,
  dayDifference,
  deadlineLabel,
  getMonday,
} from "../src/date-utils";
import type { ProjectItem } from "../src/types";

describe("周报日期工具", () => {
  it("计算自然周的周一", () => {
    expect(getMonday("2026-07-24")).toBe("2026-07-20");
    expect(getMonday("2026-07-20")).toBe("2026-07-20");
    expect(getMonday("2026-07-26")).toBe("2026-07-20");
  });

  it("跨月与跨年增加天数", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("计算距离截止日", () => {
    expect(dayDifference("2026-07-24", "2026-07-27")).toBe(3);
    expect(deadlineLabel("2026-07-27", "2026-07-24")).toBe("剩余 3 天");
    expect(deadlineLabel("2026-07-24", "2026-07-24")).toBe("今天截止");
    expect(deadlineLabel("2026-07-22", "2026-07-24")).toBe("已逾期 2 天");
  });

  it("覆盖三种自动状态边界", () => {
    expect(automaticStatus("2026-07-25", "2026-07-30", "2026-07-24")).toBe("未启动");
    expect(automaticStatus("2026-07-24", "2026-07-30", "2026-07-24")).toBe("进行中");
    expect(automaticStatus("2026-07-20", "2026-07-24", "2026-07-24")).toBe("进行中");
    expect(automaticStatus("2026-07-20", "2026-07-23", "2026-07-24")).toBe("已延期");
  });

  it("按开始时间、截止日期升序排列项目", () => {
    const makeItem = (id: string, startDate: string, dueDate: string) => ({
      id, startDate, dueDate, task: id, assignee: "曾鑫", statusOverride: null,
      completedDate: "", note: "", updatedAt: "", requestId: id,
    }) as ProjectItem;
    const items = [
      makeItem("c", "2026-07-22", "2026-07-30"),
      makeItem("b", "2026-07-20", "2026-07-29"),
      makeItem("a", "2026-07-20", "2026-07-25"),
    ];
    expect(items.sort(compareProjectItems).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});
