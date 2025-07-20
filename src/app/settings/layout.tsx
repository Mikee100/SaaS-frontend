import SettingsSidebar from '../../components/SettingsSidebar';
import Spinner from '../../components/Spinner';
import { Suspense } from 'react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SettingsSidebar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <Suspense fallback={<Spinner size={48} className="my-24" />}>{children}</Suspense>
      </main>
    </div>
  );
} 