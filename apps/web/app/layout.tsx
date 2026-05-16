import "./globals.css";

export const metadata = {
  title: "BrokerOps Platform",
  description: "Production-capable insurance reconciliation platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
