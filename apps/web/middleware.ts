import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// One Vercel project serves both:
//   tenet.blog      → the marketing landing  (app/(marketing)/*)
//   app.tenet.blog  → the product            (app/(product)/product/*)
// Requests to the app host are auth-gated, then rewritten under /product/* so
// the (product) route group renders them. The URL the user sees never changes.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_READY = url.startsWith("https://") && key.startsWith("eyJ");

const isAppHost = (host: string) => host.startsWith("app.");

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // ---- Marketing host (tenet.blog) ----
  if (!isAppHost(host)) {
    // Keep the internal /product prefix off the landing domain.
    if (pathname === "/product" || pathname.startsWith("/product/")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ---- App host (app.tenet.blog) ----
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/welcome") ||
    pathname.startsWith("/api/transcribe") ||
    pathname.startsWith("/api/summarize") ||
    pathname.startsWith("/api/chat");

  const target = request.nextUrl.clone();
  target.pathname = "/product" + (pathname === "/" ? "" : pathname);

  if (!SUPABASE_READY) return NextResponse.rewrite(target);

  let response = NextResponse.rewrite(target);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.rewrite(target);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    // Preserve the destination (incl. ?n=<note> deep-links from the extension)
    // through the login round-trip — losing it strands users on an empty home.
    const login = new URL("/login", request.url);
    const dest = pathname + request.nextUrl.search;
    if (dest !== "/") login.searchParams.set("next", dest);
    return NextResponse.redirect(login);
  }
  if (user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(safe, request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|txt|xml)$).*)",
  ],
};
