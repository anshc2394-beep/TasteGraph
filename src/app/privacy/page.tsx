import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Brand } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy · TasteGraph" };

export default async function PrivacyPage() {
  await connection();
  return (
    <main className="privacy-page">
      <Brand />
      <h1>Privacy</h1>
      <p>TasteGraph is a personal portfolio project. It has no database and no analytics, and it never sells or shares data.</p>
      <h2>What it reads</h2>
      <p>With your permission, Spotify shares your display name, profile image, and top artists and tracks (read-only scopes <code>user-read-private</code> and <code>user-top-read</code>). TasteGraph cannot see your email, playlists, or playback, and cannot change anything in your account.</p>
      <h2>What it keeps</h2>
      <p>Nothing on the server. Your Spotify access tokens are stored only in secure, httpOnly cookies in your own browser and expire within 30 days. Your music data is fetched when you open the dashboard and is not saved.</p>
      <h2>The live demo</h2>
      <p>The demo shows a snapshot of the author&apos;s own listening with every account identifier removed.</p>
      <h2>Disconnecting</h2>
      <p>Use <strong>Disconnect</strong> in the dashboard footer to delete TasteGraph&apos;s cookies. To revoke access entirely, remove TasteGraph under <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noopener noreferrer">Spotify → Account → Manage apps</a>.</p>
      <Link className="text-link" href="/">← Back to TasteGraph</Link>
    </main>
  );
}
