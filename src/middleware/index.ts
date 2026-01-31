import { createSupabaseServerInstance } from "../db/supabase.client";
import { defineMiddleware } from "astro:middleware";

const PROTECTED_PATHS = ["/generate", "/flashcards", "/session", "/account"];
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password"];

const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PATHS.includes(pathname) ||
  pathname.startsWith("/flashcards/") ||
  pathname.startsWith("/session/");

const isAuthOnlyPath = (pathname: string): boolean => AUTH_ONLY_PATHS.includes(pathname);

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request, redirect } = context;
  const pathname = url.pathname;

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });
  context.locals.supabase = supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    context.locals.userId = user.id;
    context.locals.user = { id: user.id, email: user.email ?? undefined };
  }

  if (isProtectedPath(pathname) && !context.locals.userId) {
    if (!pathname.startsWith("/api")) {
      const redirectTo = encodeURIComponent(pathname);
      return redirect(`/auth/login?redirectTo=${redirectTo}`);
    }
  }

  if (isAuthOnlyPath(pathname) && context.locals.userId) {
    return redirect("/generate");
  }

  return next();
});
