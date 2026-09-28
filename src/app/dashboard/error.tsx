"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-shell">
      <p className="eyebrow">A BRIEF INTERRUPTION</p>
      <h1>Let’s try that again.</h1>
      <p>The dashboard couldn’t load. Your Spotify account is unaffected.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>{" "}
      <a className="button secondary" href="/api/auth/login">
        Reconnect Spotify
      </a>
    </main>
  );
}
