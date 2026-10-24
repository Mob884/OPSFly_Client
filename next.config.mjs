/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed old Vite-era proxy rewrite that was forwarding ALL /api/* requests
  // to the Express server at port 5001. This was causing PATCH/DELETE for tasks
  // to silently fail because Express had no task routes. All API routes now live
  // in Next.js Pages Router (src/pages/api/) with direct MongoDB connections.
};

export default nextConfig;
