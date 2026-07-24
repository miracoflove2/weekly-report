import { useState, type FormEvent } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError("请输入访问密码");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || "登录失败");
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <a className="brand login-brand" href="/login">
          <span className="brand-mark">T</span>
          <span>业务开发一部周报</span>
        </a>
        <div>
          <p className="eyebrow">BUSINESS DEVELOPMENT · DIVISION 1</p>
          <h1>团队进展，<br />仅供内部访问。</h1>
          <p>请输入访问密码，进入业务开发一部周报与项目进度工作台。</p>
        </div>
        <small>SECURE TEAM WORKSPACE</small>
      </section>
      <section className="login-form-panel">
        <form onSubmit={(event) => void submit(event)}>
          <span className="login-index">ACCESS / 01</span>
          <h2>欢迎回来</h2>
          <p>使用团队访问密码登录</p>
          <label htmlFor="password">访问密码</label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            aria-describedby={error ? "login-error" : undefined}
          />
          {error && <div id="login-error" className="login-error" role="alert">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "正在验证…" : "进入周报 →"}
          </button>
          <small>登录状态将在此设备保留 7 天</small>
        </form>
      </section>
    </main>
  );
}
