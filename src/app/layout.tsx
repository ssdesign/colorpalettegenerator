import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Amplify } from 'aws-amplify';
import awsExports from '../aws-exports';

const inter = Inter({ subsets: ["latin"] });

// Configure Amplify
Amplify.configure(awsExports);

export const metadata: Metadata = {
  title: "WCAG-Accessible Color Palette Generator",
  description: "Generate accessible color palettes for data visualization in both light and dark modes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
