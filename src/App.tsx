import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createItem,
  getReport,
  logout,
  removeItem,
  saveSection,
  updateItem,
} from "./api";
import {
  addDays,
  displayDate,
  getMonday,
  shanghaiToday,
} from "./date-utils";
import {
  ASSIGNEES,
  SECTION_NAMES,
  STATUSES,
  type ProjectItem,
  type SaveState,
  type SectionName,
  type Status,
  type WeeklyReport,
} from "./types";

const EMPTY_SECTIONS = { summary: "", plan: "", other: "" };
const SECTION_INFO: Record<SectionName, { index: string; title: string; hint: string }> = {
  summary: { index: "01", title: "本周工作总结", hint: "记录本周完成的重点工作、关键成果与问题…" },
  plan: { index: "02", title: "下周工作计划", hint: "列出下周目标、优先级与预期交付…" },
  other: { index: "03", title: "其他事项", hint: "补充需要同步的风险、资源需求或团队事项…" },
};

function makeRequestId() {
  return crypto.randomUUID();
}

function emptyItem(): ProjectItem {
  return {
    id: crypto.randomUUID(),
    task: "新待办事项",
    assignee: ASSIGNEES[0],
    startDate: shanghaiToday(),
    dueDate: addDays(shanghaiToday(), 7),
    completedDate: "",
    statusOverride: "未启动",
    note: "",
    updatedAt: new Date().toISOString(),
    requestId: makeRequestId(),
  };
}

type SortField = "task" | "assignee" | "startDate" | "dueDate"
  | "completedDate" | "statusOverride" | "note" | "updatedAt";
type SortDirection = "asc" | "desc";

function displayUpdatedAt(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function MarkdownNote({
  item,
  onChange,
  onBlur,
}: {
  item: ProjectItem;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const [editing, setEditing] = useState(!item.note);
  if (editing) {
    return <AutoGrowTextarea autoFocus value={item.note} maxLength={1000}
      placeholder="添加备注，支持 Markdown"
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => { onBlur(); setEditing(false); }} />;
  }
  return (
    <button className="markdown-note" type="button" onClick={() => setEditing(true)}
      aria-label="编辑 Markdown 备注">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.note || "点击添加备注"}</ReactMarkdown>
    </button>
  );
}

function MarkdownSection({
  value,
  label,
  placeholder,
  onChange,
}: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(!value);
  return (
    <div className="markdown-section">
      <button className="markdown-toggle" type="button" onClick={() => setEditing((current) => !current)}>
        {editing ? "预览 Markdown" : "编辑 Markdown"}
      </button>
      {editing ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder} maxLength={10000} aria-label={label} />
      ) : (
        <div className="markdown-preview" onDoubleClick={() => setEditing(true)}>
          {value
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            : <p className="markdown-empty">暂无内容，点击“编辑 Markdown”开始填写。</p>}
        </div>
      )}
      <div className="char-count">{value.length} / 10,000</div>
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const labels: Record<SaveState, string> = {
    idle: "",
    dirty: "未保存",
    saving: "保存中…",
    saved: "已保存",
    error: "保存失败",
  };
  if (state === "idle") return null;
  return <span className={`save-badge save-${state}`}>{labels[state]}</span>;
}

function AutoGrowTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  useEffect(resize, [props.value, resize]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      onInput={(event) => {
        resize();
        props.onInput?.(event);
      }}
    />
  );
}

export default function App() {
  const [week, setWeek] = useState(getMonday());
  const [report, setReport] = useState<WeeklyReport>({
    week,
    sections: EMPTY_SECTIONS,
    items: [],
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sectionStates, setSectionStates] = useState<Record<SectionName, SaveState>>({
    summary: "idle",
    plan: "idle",
    other: "idle",
  });
  const [itemStates, setItemStates] = useState<Record<string, SaveState>>({});
  const [toast, setToast] = useState("");
  const [sortField, setSortField] = useState<SortField>("assignee");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const timers = useRef<Partial<Record<SectionName, ReturnType<typeof setTimeout>>>>({});

  const load = useCallback(async (targetWeek: string) => {
    setLoading(true);
    setLoadError("");
    Object.values(timers.current).forEach(clearTimeout);
    try {
      const data = await getReport(targetWeek);
      setReport(data);
      setSectionStates({ summary: "idle", plan: "idle", other: "idle" });
      setItemStates({});
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "无法加载周报");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(week);
  }, [load, week]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const changeSection = (section: SectionName, content: string) => {
    setReport((current) => ({
      ...current,
      sections: { ...current.sections, [section]: content },
    }));
    setSectionStates((current) => ({ ...current, [section]: "dirty" }));
    if (timers.current[section]) clearTimeout(timers.current[section]);
    timers.current[section] = setTimeout(async () => {
      setSectionStates((current) => ({ ...current, [section]: "saving" }));
      try {
        await saveSection(week, section, content, makeRequestId());
        setSectionStates((current) => ({ ...current, [section]: "saved" }));
      } catch {
        setSectionStates((current) => ({ ...current, [section]: "error" }));
      }
    }, 1500);
  };

  const addItem = async () => {
    const item = emptyItem();
    setReport((current) => ({ ...current, items: [...current.items, item] }));
    setItemStates((current) => ({ ...current, [item.id]: "saving" }));
    try {
      const saved = await createItem(week, item);
      setReport((current) => ({
        ...current,
        items: current.items.map((value) => (value.id === item.id ? saved : value)),
      }));
      setItemStates((current) => ({ ...current, [item.id]: "saved" }));
    } catch (error) {
      setItemStates((current) => ({ ...current, [item.id]: "error" }));
      setToast(error instanceof Error ? error.message : "新增失败");
    }
  };

  const changeItem = <K extends keyof ProjectItem>(
    id: string,
    field: K,
    value: ProjectItem[K],
  ) => {
    setReport((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
    setItemStates((current) => ({ ...current, [id]: "dirty" }));
  };

  const persistItem = async (id: string) => {
    const item = report.items.find((value) => value.id === id);
    if (!item || itemStates[id] !== "dirty") return;
    if (!item.task.trim()) {
      setItemStates((current) => ({ ...current, [id]: "error" }));
      setToast("请先填写待办事项");
      return;
    }
    if (item.dueDate < item.startDate) {
      setItemStates((current) => ({ ...current, [id]: "error" }));
      setToast("截止日期不能早于开始时间");
      return;
    }
    const payload = {
      ...item,
      completedDate: item.completedDate || "",
      statusOverride: item.statusOverride || "未启动",
      requestId: makeRequestId(),
      updatedAt: new Date().toISOString(),
    };
    setItemStates((current) => ({ ...current, [id]: "saving" }));
    try {
      const saved = await updateItem(week, payload);
      setReport((current) => ({
        ...current,
        items: current.items.map((value) => (value.id === id ? saved : value)),
      }));
      setItemStates((current) => ({ ...current, [id]: "saved" }));
    } catch (error) {
      setItemStates((current) => ({ ...current, [id]: "error" }));
      setToast(error instanceof Error ? error.message : "保存失败");
    }
  };

  const deleteItem = async (item: ProjectItem) => {
    if (!window.confirm(`确定删除“${item.task || "未命名事项"}”吗？此操作无法撤销。`)) return;
    const before = report.items;
    setReport((current) => ({
      ...current,
      items: current.items.filter((value) => value.id !== item.id),
    }));
    try {
      await removeItem(week, item.id, makeRequestId());
      setToast("项目已删除");
    } catch (error) {
      setReport((current) => ({ ...current, items: before }));
      setToast(error instanceof Error ? error.message : "删除失败");
    }
  };

  const moveWeek = (days: number) => setWeek((current) => addDays(current, days));
  const weekEnd = addDays(week, 6);
  const currentWeek = week === getMonday();
  const sortValue = (item: ProjectItem): string | number => {
    return item[sortField] || "";
  };
  const sortedItems = [...report.items].sort((left, right) => {
    const a = sortValue(left);
    const b = sortValue(right);
    const result = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "zh-CN");
    return (sortDirection === "asc" ? result : -result) || left.id.localeCompare(right.id);
  });
  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const sortHeader = (field: SortField, label: string) => (
    <button className="sort-button" type="button" onClick={() => toggleSort(field)}>
      {label}<span aria-hidden="true">{sortField === field ? (sortDirection === "asc" ? " ↑" : " ↓") : " ↕"}</span>
    </button>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="业务开发一部周报首页">
          <span className="brand-mark">T</span>
          <span>业务开发一部周报</span>
        </a>
        <div className="topbar-right">
          <span className="sync-note"><i /> 团队共享</span>
          <button className="text-button" onClick={() => void load(week)} disabled={loading}>
            ↻ 刷新最新数据
          </button>
          <button className="logout-button" onClick={() => void logout()}>退出</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-heading">
            <p className="eyebrow">BUSINESS DEVELOPMENT · DIVISION 1 · {week.slice(0, 4)}</p>
            <div className="hero-title-line">
              <h1>业务开发一部周报</h1>
              <span>{currentWeek ? "本周进行中" : "历史归档"}</span>
            </div>
            <p className="hero-copy">汇总工作进展、下周计划与项目节奏，让团队目标清晰、协作有序。</p>
          </div>
          <div className="week-card">
            <div>
              <span>当前周次</span>
              <small>{currentWeek ? "CURRENT WEEK" : "ARCHIVE"}</small>
            </div>
            <strong>{displayDate(week)} <i>—</i> {displayDate(weekEnd)}</strong>
          </div>
        </section>

        <nav className="week-nav" aria-label="周报日期切换">
          <button onClick={() => moveWeek(-7)} aria-label="上一周">←</button>
          <div>
            <span>{week.slice(0, 4)} 年</span>
            <strong>{displayDate(week)} — {displayDate(weekEnd)}</strong>
          </div>
          <button onClick={() => moveWeek(7)} aria-label="下一周">→</button>
          {!currentWeek && <button className="today-button" onClick={() => setWeek(getMonday())}>回到本周</button>}
        </nav>

        {loadError ? (
          <div className="error-panel">
            <strong>周报加载失败</strong>
            <p>{loadError}</p>
            <button onClick={() => void load(week)}>重新加载</button>
          </div>
        ) : loading ? (
          <div className="loading-panel"><span /> 正在加载周报…</div>
        ) : (
          <>
            <div className="sections-grid">
              {SECTION_NAMES.map((section) => {
                const info = SECTION_INFO[section];
                return (
                  <section className={`report-card card-${section}`} key={section}>
                    <div className="card-head">
                      <span className="card-index">{info.index}</span>
                      <div><h2>{info.title}</h2><p>{info.hint}</p></div>
                      <SaveBadge state={sectionStates[section]} />
                    </div>
                    <MarkdownSection value={report.sections[section]} label={info.title}
                      placeholder={info.hint}
                      onChange={(value) => changeSection(section, value)} />
                  </section>
                );
              })}
            </div>

            <section className="progress-section">
              <div className="section-title">
                <div><span className="card-index">04</span><div><h2>项目进度跟踪</h2><p>聚焦节点，及时同步项目风险与状态。</p></div></div>
                <button className="primary-button" onClick={() => void addItem()}>＋ 新增事项</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th className="sticky-col">{sortHeader("task", "待办事项")}</th>
                    <th>{sortHeader("assignee", "执行人")}</th>
                    <th>{sortHeader("startDate", "开始时间")}</th>
                    <th>{sortHeader("dueDate", "截止日期")}</th>
                    <th>{sortHeader("completedDate", "完成时间")}</th>
                    <th>{sortHeader("updatedAt", "更新时间")}</th>
                    <th>{sortHeader("statusOverride", "状态")}</th>
                    <th>{sortHeader("note", "备注")}</th>
                    <th>操作</th>
                  </tr></thead>
                  <tbody>
                    {sortedItems.map((item) => {
                      const status = item.statusOverride || "未启动";
                      return (
                        <tr key={item.id}>
                          <td className="sticky-col">
                            <AutoGrowTextarea value={item.task} maxLength={200} placeholder="输入待办事项，支持换行"
                              onChange={(e) => changeItem(item.id, "task", e.target.value)}
                              onBlur={() => void persistItem(item.id)} />
                          </td>
                          <td><select value={item.assignee}
                            onChange={(e) => changeItem(item.id, "assignee", e.target.value)}
                            onBlur={() => void persistItem(item.id)}>
                            {ASSIGNEES.map((name) => <option key={name}>{name}</option>)}</select></td>
                          <td><input type="date" value={item.startDate} onChange={(e) => changeItem(item.id, "startDate", e.target.value)}
                            onBlur={() => void persistItem(item.id)} /></td>
                          <td><input type="date" value={item.dueDate} min={item.startDate} onChange={(e) => changeItem(item.id, "dueDate", e.target.value)}
                            onBlur={() => void persistItem(item.id)} /></td>
                          <td><input type="date" value={item.completedDate || ""}
                            onChange={(e) => changeItem(item.id, "completedDate", e.target.value)}
                            onBlur={() => void persistItem(item.id)} /></td>
                          <td><time className="updated-time" dateTime={item.updatedAt}>
                            {displayUpdatedAt(item.updatedAt)}
                          </time></td>
                          <td>
                            <div className="status-cell">
                              <select className={`status-select status-${status}`} value={status}
                                onChange={(e) => changeItem(item.id, "statusOverride", e.target.value as Status)}
                                onBlur={() => void persistItem(item.id)}>
                                {STATUSES.map((value) => <option key={value}>{value}</option>)}
                              </select>
                            </div>
                          </td>
                          <td><MarkdownNote item={item}
                            onChange={(value) => changeItem(item.id, "note", value)}
                            onBlur={() => void persistItem(item.id)} /></td>
                          <td><div className="row-actions"><SaveBadge state={itemStates[item.id] || "idle"} />
                            <button className="delete-button" onClick={() => void deleteItem(item)} aria-label={`删除${item.task}`}>×</button></div></td>
                        </tr>
                      );
                    })}
                    {!report.items.length && <tr><td colSpan={9} className="empty-cell">
                      <span>⌁</span><strong>本周还没有项目事项</strong><p>点击“新增事项”开始记录项目进度</p>
                    </td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="table-footnote">状态由用户手动指定；点击任意字段表头可切换升序或降序，默认按执行人降序排列。</p>
            </section>
          </>
        )}
      </main>
      <footer><span>BUSINESS DEVELOPMENT · DIVISION 1</span><p>数据保存在 Cloudflare KV，跨设备共享。</p></footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
