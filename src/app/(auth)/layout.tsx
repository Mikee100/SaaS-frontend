import { UserProvider } from "@/components/UserContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider skipUserFetch={true}>
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        {children}
      </div>
    </UserProvider>
  );
}
