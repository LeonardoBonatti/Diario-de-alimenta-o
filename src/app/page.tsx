import AuthGate from '@/components/AuthGate';
import EntryWorkspace from '@/components/EntryWorkspace';

export default function HomePage() {
  return <AuthGate>{() => <EntryWorkspace />}</AuthGate>;
}
