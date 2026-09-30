import AuthGate from '@/components/AuthGate';
import ReportView from '@/components/ReportView';
import WeeklyReportCard from '@/components/WeeklyReportCard';

export default function DashboardPage() {
  return (
    <AuthGate>
      {(userId) => (
        <div className="space-y-8">
          <WeeklyReportCard userId={userId} />
          <ReportView />
        </div>
      )}
    </AuthGate>
  );
}
