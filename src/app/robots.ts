import type { MetadataRoute } from "next";

const BASE_URL = "https://deltoi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/profile",
          "/admin/",
          "/contribute",
          "/*/edit",
          "/*/edit-source",
          "/*/history",
          "/*/discussion",
          "/*/discussion/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap-index.xml`,
  };
}
