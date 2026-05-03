import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIH Assistant — Smart India Hackathon RAG",
  description: "AI-powered assistant for Smart India Hackathon problem statements, built with RAG and Groq LLM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
