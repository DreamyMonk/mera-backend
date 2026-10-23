import { NextResponse } from "next/server";
import { HttpError, readJson, route } from "@/lib/server/http";
import { ADMIN_COOKIE, checkPassword, createSession, isAdmin } from "@/lib/server/admin-session";

// GET: is the admin signed in? POST: sign in with the password. DELETE: sign out.
export const GET = route(async (req: Request) => Response.json({ admin: isAdmin(req) }));

export const POST = route(async (req: Request) => {
  const { password } = await readJson(req);
  if (typeof password !== "string" || !checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    throw new HttpError(401, "authentication_error", "Wrong password.");
  }
  const session = createSession();
  const res = NextResponse.json({ admin: true });
  res.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
});

export const DELETE = route(async () => {
  const res = NextResponse.json({ admin: false });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
});
