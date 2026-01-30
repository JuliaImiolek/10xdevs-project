import { defineMiddleware } from 'astro:middleware';

import { supabaseClient, DEFAULT_USER_ID } from '../db/supabase.client';

const FLASHCARDS_PATH = '/flashcards';
const SESSION_PATH = '/session';

const isProtectedPath = (pathname: string): boolean =>
  pathname === FLASHCARDS_PATH ||
  pathname.startsWith(`${FLASHCARDS_PATH}/`) ||
  pathname === SESSION_PATH ||
  pathname.startsWith(`${SESSION_PATH}/`);

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;

  // Until auth is implemented: treat DEFAULT_USER_ID as current user for protected routes.
  // When auth is implemented: set context.locals.userId from session and redirect to /login when missing.
  const pathname = context.url.pathname;
  if (isProtectedPath(pathname)) {
    context.locals.userId = context.locals.userId ?? DEFAULT_USER_ID ?? undefined;
    if (!context.locals.userId) {
      return context.redirect('/login');
    }
  }

  return next();
});
