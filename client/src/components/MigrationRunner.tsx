import { useEffect } from 'react';

interface MigrationRunnerProps {
  onComplete: () => void;
  children: React.ReactNode;
}

export default function MigrationRunner({ onComplete, children }: MigrationRunnerProps) {
  useEffect(() => {
    onComplete();
  }, []);

  return <>{children}</>;
}
