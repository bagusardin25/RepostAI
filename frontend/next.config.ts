import path from "node:path";
import type { NextConfig } from "next";

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000);

function backendOrigin() {
  return process.env.BACKEND_ORIGIN || `http://127.0.0.1:${BACKEND_PORT}`;
}

if (FRONTEND_PORT === BACKEND_PORT) {
  throw new Error(
    `FRONTEND_PORT and BACKEND_PORT are both ${FRONTEND_PORT}. Frontend is 3000, backend is 4000.`,
  );
}

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin()}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@frontend": path.resolve(__dirname),
      "@backend": path.resolve(__dirname, "../backend"),
      "@shared": path.resolve(__dirname, "../shared"),
    };
    return config;
  },
  serverExternalPackages: [
    "@animocabrands/minds-client-lib",
    "@libsql/client",
    "ffmpeg-static",
    "youtubei.js",
  ],
  turbopack: {
    resolveAlias: {
      "@frontend": path.resolve(__dirname),
      "@backend": path.resolve(__dirname, "../backend"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
};

export default nextConfig;