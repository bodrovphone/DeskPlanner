import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { X } from 'lucide-react';

const TRIAL_DAYS = 90;
const WARNING_THRESHOLD_DAYS = 14;
const DISMISS_KEY = 'trial-banner-dismissed';

function getTrialDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msRemaining = expiresAt.getTime() - now.getTime();
  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}

export default function TrialBanner() {
  const { currentOrg } = useOrganization();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (!currentOrg || dismissed) return null;

  const daysRemaining = getTrialDaysRemaining(currentOrg.createdAt);

  // No banner if more than 14 days remaining
  if (daysRemaining > WARNING_THRESHOLD_DAYS) return null;

  const expired = daysRemaining <= 0;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium ${
        expired
          ? 'bg-red-50 text-red-800 border-b border-red-200'
          : 'bg-amber-50 text-amber-800 border-b border-amber-200'
      }`}
    >
      <p className="min-w-0">
        {expired ? (
          <>
            Your free trial has ended.{' '}
            <a
              href="https://www.linkedin.com/company/ohmydesk-app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-80"
            >
              Contact us
            </a>{' '}
            to continue using OhMyDesk.
          </>
        ) : (
          <>
            Your free trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
          </>
        )}
      </p>
      <button
        onClick={handleDismiss}
        className={`shrink-0 p-0.5 rounded hover:opacity-70 ${
          expired ? 'text-red-600' : 'text-amber-600'
        }`}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
