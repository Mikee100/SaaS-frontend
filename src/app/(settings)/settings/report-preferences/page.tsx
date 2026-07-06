import { redirect } from 'next/navigation';

export default function ReportPreferencesPage() {
  redirect('/settings/pdf-templates#downloadable-report-preferences');
}
