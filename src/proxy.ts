import { NextResponse, type NextRequest } from "next/server";

// One app, two sites:
//   accounts.dreamymonk.xyz  → sign-in, plans, account, extension connect, API
//   dashboard.dreamymonk.xyz → admin dashboard (served from /admin)
// Locally, open /admin directly.
export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const { pathname } = req.nextUrl;

  if (host.startsWith("dashboard.")) {
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
      const url = req.nextUrl.clone();
      url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
    return;
  }

  // Keep the admin dashboard off the public accounts site.
  if (host.startsWith("accounts.") && (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
    return new NextResponse("Not found", { status: 404 });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
