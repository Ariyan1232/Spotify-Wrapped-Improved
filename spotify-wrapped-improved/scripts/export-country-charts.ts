/**
 * One-time / occasional export script.
 * Fetches each country's Top 50 playlist from Spotify (via Client Credentials,
 * no user session needed) and writes the result to data/country-charts.json
 * in the shape precompute/similarity.py expects.
 *
 * Run with: npx tsx scripts/export-country-charts.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { COUNTRY_PLAYLISTS } from "../lib/countryPlaylists";

interface ChartTrack {
  trackId: string;
  artistName: string;
  trackName: string;
  rank: number;
}

type CountryCharts = Record<string, ChartTrack[]>;

async function getClientCredentialsToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local"
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get Spotify token: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function fetchCountryChart(
  playlistId: string,
  accessToken: string
): Promise<ChartTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    console.warn(`  Skipping playlist ${playlistId}: Spotify returned ${res.status}`);
    return [];
  }

  const data = await res.json();

  const tracks: ChartTrack[] = data.items
    .map((item: any, index: number) => {
      const track = item.track;
      if (!track || !track.id || !track.artists?.[0]) return null;
      return {
        trackId: track.id,
        artistName: track.artists[0].name,
        trackName: track.name,
        rank: index + 1,
      };
    })
    .filter((t: ChartTrack | null): t is ChartTrack => t !== null);

  return tracks;
}

async function main() {
  console.log("Getting Spotify access token...");
  const accessToken = await getClientCredentialsToken();

  const countryCharts: CountryCharts = {};
  const countries = Object.entries(COUNTRY_PLAYLISTS);

  console.log(`Fetching charts for ${countries.length} countries...`);

  for (const [country, playlistId] of countries) {
    console.log(`  ${country} (${playlistId})`);
    const tracks = await fetchCountryChart(playlistId, accessToken);
    countryCharts[country] = tracks;

    // Basic rate-limit courtesy delay between requests
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const outputDir = path.join(process.cwd(), "data");
  await mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "country-charts.json");
  await writeFile(outputPath, JSON.stringify(countryCharts, null, 2), "utf-8");

  console.log(`\nDone. Wrote data for ${countries.length} countries to ${outputPath}`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});