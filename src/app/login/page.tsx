"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.message ?? "로그인에 실패했습니다.");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.assign(destination);
    } catch {
      setStatus("error");
      setMessage("서버에 연결할 수 없습니다.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef6fb] px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-7 shadow-[0_20px_60px_rgba(9,34,53,0.12)] sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-semibold text-marine">KUDALABS</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">사내 운영 ERP</h1>
          <p className="mt-2 text-sm text-steel">등록된 계정으로 로그인하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-steel">이메일</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-3 text-sm text-ink outline-none focus:border-marine"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-steel">비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-3 text-sm text-ink outline-none focus:border-marine"
            />
          </label>

          {status === "error" ? <p className="text-sm font-medium text-danger-fg">{message}</p> : null}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            로그인
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 rounded-md bg-paper px-3 py-3 text-xs leading-5 text-steel">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-marine" />
          계정이 없으면 시스템 관리자에게 계정 발급을 요청하세요.
        </p>
      </section>
    </main>
  );
}
