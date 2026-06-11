import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  // top-level app routes (final structure)
  '/home(.*)',
  '/calendar(.*)',
  '/customers(.*)',
  '/services(.*)',
  '/team(.*)',
  '/availability(.*)',
  '/settings(.*)',
  // legacy routes — kept until Phase 2 cleanup
  '/dashboard(.*)',
  '/mobile(.*)',
  // admin — isolated, always protected
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte?|ttf|woff2?|png|jpg|jpeg|gif|svg|webp|ico|avif|mp4|mp3)).*)',
    '/(api|trpc)(.*)',
  ],
};
