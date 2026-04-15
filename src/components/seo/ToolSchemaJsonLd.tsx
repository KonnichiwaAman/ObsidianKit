import { Helmet } from "react-helmet-async";
import { toAbsoluteUrl } from "@/lib/seo";

interface ToolSchemaJsonLdProps {
  name: string;
  description: string;
  applicationCategory: string;
  path: string;
}

export function ToolSchemaJsonLd({
  name,
  description,
  applicationCategory,
  path,
}: ToolSchemaJsonLdProps) {
  const url = toAbsoluteUrl(path);

  const payload = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name,
      url,
      description,
      applicationCategory,
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "100% local browser processing",
        "No network request required for processing",
        "No server upload",
      ],
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Network Requirement",
          value: "No Network Request",
        },
        {
          "@type": "PropertyValue",
          name: "Pricing",
          value: "Free",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      additionalType: "https://schema.org/Tool",
      name,
      url,
      description,
      applicationCategory,
      operatingSystem: "Web Browser",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Privacy",
          value: "Client-side only",
        },
      ],
    },
  ];

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(payload)}</script>
    </Helmet>
  );
}
