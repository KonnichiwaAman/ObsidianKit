export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  tags: string[];
  isPublished: boolean;
  sections: BlogSection[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "client-side-tools-seo-playbook-2026",
    title: "Client-Side Tools SEO Playbook (2026)",
    description:
      "A practical playbook for ranking client-side utility sites: metadata systems, sitemap automation, Core Web Vitals, and monetization-safe UX.",
    publishedAt: "2026-04-10",
    updatedAt: "2026-04-12",
    readingMinutes: 8,
    tags: ["SEO", "Core Web Vitals", "Monetization", "Client-Side"],
    isPublished: true,
    sections: [
      {
        heading: "1. Build SEO as a system, not a checklist",
        paragraphs: [
          "Tool-heavy websites scale fast, so static meta tags break quickly. Build a reusable SEO layer that generates title, description, canonical URL, Open Graph, Twitter Card data, and JSON-LD from route data.",
          "When your metadata is generated from the same source of truth as your routes, every new tool ships with SEO coverage by default.",
        ],
      },
      {
        heading: "2. Core Web Vitals win or lose utility search traffic",
        paragraphs: [
          "Most utility traffic is impatient and mobile-first. Lazy-load expensive routes, keep bundle boundaries clean, and avoid shipping heavyweight UI effects on initial paint.",
          "Small improvements to layout stability and interaction latency can compound into higher rankings and stronger retention.",
        ],
      },
      {
        heading: "3. Monetization should support trust, not fight it",
        paragraphs: [
          "Revenue placement matters. Keep ads non-intrusive, label sponsorship areas clearly, and preserve fast access to the tool UI. For privacy-first products, explain tracking and respect DNT where possible.",
          "A clean, honest monetization layer preserves user trust and helps long-term SEO performance through better engagement signals.",
        ],
      },
    ],
  },
];

const blogPostsBySlug = new Map(blogPosts.map((post) => [post.slug, post]));

export const publishedBlogPosts: BlogPost[] = blogPosts.filter((post) => post.isPublished);

export function getPublishedBlogPostBySlug(slug: string): BlogPost | undefined {
  const post = blogPostsBySlug.get(slug);
  if (!post || !post.isPublished) return undefined;
  return post;
}
