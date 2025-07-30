import SettingsSidebar from '@/components/SettingsSidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f7fafd'
    }}>
      <aside style={{
        width: 240,
        minHeight: '100vh',
        background: '#f7fafd',
        borderRight: '1px solid #e5e7eb',
        padding: '2rem 0.5rem',
        position: 'sticky',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <SettingsSidebar />
      </aside>
      <main style={{
        flex: 1,
        padding: '2.5rem 2rem',
        maxWidth: 900,
        margin: '0 auto',
        background: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  );
} 