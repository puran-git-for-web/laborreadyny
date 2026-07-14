import type { NextConfig } from "next";

const htmlRoutes = [
  "about",
  "apply",
  "clients",
  "contact",
  "dispatch",
  "industries",
  "onboarding",
  "payroll",
  "portal",
  "services",
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/index.html",
      },
      {
        source: "/admin",
        destination: "/admin.html",
      },
      ...htmlRoutes.map((route) => ({
        source: `/${route}`,
        destination: `/${route}.html`,
      })),
    ];
  },
};

export default nextConfig;
