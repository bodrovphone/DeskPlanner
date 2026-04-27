export function PoweredByFooter() {
  return (
    <div className="text-center mt-6 space-y-3">
      <p className="text-xs text-gray-500">
        Built by the team behind this space —{' '}
        <a
          href="https://ohmydesk.app/compare/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          see how OhMyDesk compares
        </a>{' '}
        or{' '}
        <a
          href="https://ohmydesk.app/pricing/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          check pricing
        </a>
        .
      </p>
      <a
        href="https://ohmydesk.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
      >
        Powered by OhMyDesk
      </a>
    </div>
  );
}
