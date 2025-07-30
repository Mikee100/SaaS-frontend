export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  );
} 