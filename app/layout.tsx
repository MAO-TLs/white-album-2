import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: new URL("https://mao-tls.github.io/white-album-2/"),
  title: {
    default: "WHITE ALBUM 2 English Translation | MAO",
    template: "%s | MAO Translations",
  },
  description:
    "Download the complete WHITE ALBUM 2 English translation, including the main game, Special Contents, eleven audio dramas, and two translated PDF novels.",
  alternates: {
    canonical: "https://mao-tls.github.io/white-album-2/",
  },
  icons: {
    icon: "./favicon.png",
    shortcut: "./favicon.png",
  },
  openGraph: {
    title: "WHITE ALBUM 2 English Translation",
    description:
      "The complete main game, Special Contents, eleven audio dramas, and two translated PDF novels in English.",
    url: "https://mao-tls.github.io/white-album-2/",
    siteName: "MAO Translations",
    images: [
      {
        url: "./wa2-winter-night.png",
        width: 1731,
        height: 909,
        alt: "A snowflake over quiet snowfields at night",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WHITE ALBUM 2 English Translation",
    description:
      "Download the complete release or browse all 77,198 Japanese and English lines.",
    images: ["./wa2-winter-night.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
