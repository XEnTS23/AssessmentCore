import { Link } from "react-router";
import { Activity, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "../../../contexts/ThemeContext";

type AuthScaffoldProps = {
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

function LogRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "base";
}) {
  const color =
    tone === "ok"
      ? "text-success"
      : tone === "warn"
        ? "text-warning"
        : "text-chart-1";
  return (
    <div className="text-[11px] leading-6 text-muted-foreground">
      <span>[14:02:11]</span> <span className={color}>{label}</span> {value}
    </div>
  );
}

export function AuthScaffold({
  title,
  subtitle,
  footer,
  children,
}: AuthScaffoldProps) {
  const { isDark } = useTheme();
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <section className="flex flex-col border-r border-border bg-card px-7 py-8 sm:px-12">
        <Link to="/" className="inline-flex items-center gap-2">
          <img
            src={isDark ? "/logo-dark-1.png" : "/AC_logo.png"}
            alt="AssessmentCore logo"
            className="h-8 w-8 rounded-md object-contain"
          />
          <span className="text-sm font-semibold text-foreground">
            AssessmentCore
          </span>
        </Link>

        <div className="my-auto w-full max-w-xl py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? (
          <div className="text-xs text-muted-foreground">{footer}</div>
        ) : null}
      </section>

      <section className="relative hidden overflow-hidden bg-muted/30 lg:flex lg:items-center lg:justify-center lg:p-10">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)"
              : "radial-gradient(circle at 1px 1px, rgba(100,116,139,0.28) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] text-muted-foreground">
              validation.log
            </span>
          </div>
          <div className="space-y-0.5 p-4 font-mono">
            <LogRow
              label="parse"
              value="questions.xlsx · 2418 rows"
              tone="base"
            />
            <LogRow
              label="detect"
              value="13 columns · confidence high"
              tone="base"
            />
            <LogRow
              label="validate"
              value="pass 2341 · caution 54 · reject 23"
              tone="ok"
            />
            <LogRow
              label="duplicate"
              value="11 exact · 3 near · 0 conflict"
              tone="warn"
            />
            <LogRow
              label="clean"
              value="pass-1 · 1204 rows normalized"
              tone="base"
            />
            <LogRow
              label="clean"
              value="pass-2 · 48 answers aligned"
              tone="base"
            />
            <LogRow
              label="audit"
              value="2395 certified · 23 flagged"
              tone="ok"
            />
            <LogRow label="generate" value="QTI 3.0 · 2395 items" tone="ok" />
            <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ready for import in 8.2s
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
