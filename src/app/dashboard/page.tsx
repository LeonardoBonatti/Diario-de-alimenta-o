import ReportView from '@/components/ReportView';
import WeeklyReportCard from '@/components/WeeklyReportCard';
import { OWNER_ID } from '@/lib/schema';

// Lê o banco a cada acesso (o resumo semanal muda aos sábados).
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <WeeklyReportCard userId={OWNER_ID} />
      <ReportView />
    </div>
  );
}
