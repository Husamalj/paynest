import type { Metadata } from "next";
import Script from "next/script";
import PublicHomePage from "@/components/public/PublicHomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.paynest.app"),
  title: "PayNest | Smart HR and Payroll Management Platform",
  description:
    "PayNest helps businesses manage employees, attendance, payroll, leave requests, approvals, and workforce insights from one secure platform.",
  alternates: {
    canonical: "https://www.paynest.app",
  },
  openGraph: {
    title: "PayNest | Smart HR and Payroll Management Platform",
    description:
      "Manage employees, attendance, payroll, leave requests, approvals, and workforce insights from one secure HR and payroll platform.",
    url: "https://www.paynest.app",
    siteName: "PayNest",
    images: [
      {
        url: "/analytics-preview.png",
        width: 1200,
        height: 630,
        alt: "PayNest HR and payroll dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayNest | Smart HR and Payroll Management Platform",
    description:
      "A secure HR, payroll, attendance, leave, and employee self-service platform for modern MENA teams.",
    images: ["/analytics-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PayNest",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "PayNest is an HR, payroll, attendance, leave management, and employee self-service platform for multi-company teams.",
  url: "https://www.paynest.app",
  brand: {
    "@type": "Brand",
    name: "PayNest",
  },
  areaServed: ["Jordan", "Saudi Arabia", "MENA"],
};

export default function Page() {
  return (
    <>
      <Script
        id="paynest-software-jsonld"
        strategy="beforeInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <PublicHomePage />
    </>
  );
}
