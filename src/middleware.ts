import { defineMiddleware } from 'astro:middleware';

// Dev-only fallback: rewrite any 404 to the SPA shell so React Router can
// handle dynamic routes like /:orgSlug/calendar in `astro dev`.
// In production, Cloudflare Pages `_redirects` handles this instead.
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (response.status === 404) {
    return context.rewrite('/spa/');
  }
  return response;
});
