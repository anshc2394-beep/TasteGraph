import { Brand } from "./ui";

export function DashboardSkeleton() {
  return (
    <div className="universe-shell universe-skeleton" role="status" aria-live="polite" aria-label="Loading your Spotify listening dashboard">
      <header className="universe-nav"><Brand /><span className="skeleton-navline" aria-hidden="true" /><span /></header>
      <main>
        <section className="atlas-hero atlas-skeleton">
          <div className="atlas-identity"><p className="atlas-edition">YOUR LISTENING IDENTITY</p><h1>Finding your<br />universe.</h1><p className="atlas-window">Gathering your music across three listening windows.</p><div className="atlas-skeleton-score skeleton" aria-hidden="true" /></div>
          <div className="atlas-skeleton-map" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        </section>
        <div className="listening-console"><span className="console-label">Loading your listening windows</span><div className="atlas-skeleton-controls skeleton" aria-hidden="true" /><span /></div>
      </main>
    </div>
  );
}
