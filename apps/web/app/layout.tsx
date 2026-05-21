import "./globals.css";

export const metadata = {
  title: "BrokerOps Platform",
  description: "Audit-ready carrier commission reconciliation for insurance operations teams"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
