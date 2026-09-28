import { LandingExperience } from "@/components/landing-experience";

const errors: Record<string, string> = {
  state: "Your sign-in expired or was started in another tab. Connect Spotify again from this page.",
  denied: "Spotify access was canceled. You can connect whenever you’re ready.",
  code: "Spotify did not return an authorization code. Please try connecting again.",
  token: "Spotify couldn’t complete this sign-in. Start a fresh connection. If it persists, check the app credentials and registered redirect URI.",
  connection: "TasteGraph couldn’t reach Spotify. Please try again. If it persists, check that the server has internet access.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LandingExperience errorText={error ? errors[error] ?? "Something interrupted your connection. Please try again." : null} />;
}
