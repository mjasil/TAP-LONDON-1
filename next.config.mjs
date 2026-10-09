/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.cloudinary.com" },
    ],
    // Next.js caches each optimized image variant by (source URL + sizes
    // config) at the CDN edge. When the hero's `sizes` attribute changed
    // just now, that alone creates a NEW cache key going forward, but any
    // browser/edge cache holding the OLD blurry variant from before this
    // fix can still linger without an explicit short TTL. Kept low so any
    // future image/sizing fix takes effect quickly instead of being stuck
    // behind a stale cached variant.
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
