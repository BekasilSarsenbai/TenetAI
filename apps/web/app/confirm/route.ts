import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const token = req.nextUrl.searchParams.get("token");

  if (!token || !process.env.DATABASE_URL) {
    return NextResponse.redirect(`${base}/?confirm=invalid`);
  }

  const { getDb, waitlistSignups } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();

  const [row] = await db
    .update(waitlistSignups)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(waitlistSignups.confirmToken, token))
    .returning({ email: waitlistSignups.email });

  return NextResponse.redirect(`${base}/?confirm=${row ? "ok" : "invalid"}`);
}
