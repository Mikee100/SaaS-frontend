export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {children}
    </div>
  );
} 