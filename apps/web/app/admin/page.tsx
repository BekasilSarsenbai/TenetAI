import { getSignups } from "@/lib/waitlist-store";

export const dynamic = "force-dynamic";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const admin = process.env.WAITLIST_ADMIN_KEY;

  if (!admin || key !== admin) {
    return <Shell><p style={muted}>Доступ закрыт. Открывай со своим ключом: <code>/admin?key=…</code></p></Shell>;
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <Shell><p style={muted}>База не подключена — нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.</p></Shell>;
  }

  const { count, rows } = await getSignups();

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 28 }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em", color: "#ECEDEF" }}>{count}</div>
        <div style={{ fontSize: 16, color: "#9A9DA6" }}>заявок в листе ожидания</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#62656E", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <th style={th}>Email</th>
            <th style={th}>Статус</th>
            <th style={th}>Когда</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}>
              <td style={td}>{r.email}</td>
              <td style={{ ...td, color: "#9A9DA6" }}>{r.status}</td>
              <td style={{ ...td, color: "#62656E", fontFamily: "monospace" }}>
                {r.created_at ? new Date(r.created_at).toLocaleString("ru-RU") : "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td style={td} colSpan={3}><span style={muted}>Пока никто не подписался.</span></td></tr>
          )}
        </tbody>
      </table>
    </Shell>
  );
}

const muted = { color: "#9A9DA6", fontSize: 15 } as const;
const th = { padding: "10px 12px", fontWeight: 600 } as const;
const td = { padding: "11px 12px", color: "#ECEDEF" } as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0B0C0F", color: "#ECEDEF", fontFamily: "system-ui, sans-serif", padding: "56px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 32, color: "#F4F2EC" }}>Tenet · waitlist</div>
        {children}
      </div>
    </div>
  );
}
