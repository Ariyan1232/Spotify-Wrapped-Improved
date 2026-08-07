import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getArtistGenresBatch, searchArtistGenres } from "../../../lib/spotify-genres";

interface TopTrack {
  rank: number;
  id: string;
  name: string;
  artists: { id: string; name: string }[];
}

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates: { start: { localDate: string; localTime?: string } };
  _embedded?: {
    venues?: { name: string; city?: { name: string }; location?: { latitude: string; longitude: string } }[];
  };
}

interface RankedConcert {
  eventId: string;
  eventName: string;
  artistName: string;
  similarityScore: number;
  date: string;
  venueName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  ticketUrl: string;
}

function extractTopArtists(tracks: TopTrack[], limit: number): { id: string; name: string; rank: number }[] {
  const seen = new Map<string, { name: string; rank: number }>();
  for (const track of tracks) {
    for (const artist of track.artists) {
      const existing = seen.get(artist.id);
      if (!existing || track.rank < existing.rank) {
        seen.set(artist.id, { name: artist.name, rank: track.rank });
      }
    }
  }
  return Array.from(seen.entries())
    .map(([id, { name, rank }]) => ({ id, name, rank }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

async function searchTicketmasterByArtist(
  artistName: string,
  lat: string,
  lng: string,
  radiusMiles: string
): Promise<TicketmasterEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new Error("Missing TICKETMASTER_API_KEY");

  const params = new URLSearchParams({
    apikey: apiKey,
    keyword: artistName,
    latlong: `${lat},${lng}`,
    radius: radiusMiles,
    unit: "miles",
    classificationName: "music",
    sort: "distance,asc",
    size: "5",
  });

  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return data._embedded?.events ?? [];
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "50";

  if (!lat || !lng) {
    return Response.json({ error: "Missing lat/lng query params" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  const topTracksRes = await fetch(`${origin}/api/top-tracks`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  if (!topTracksRes.ok) {
    return Response.json({ error: "Failed to fetch top tracks" }, { status: 502 });
  }
  const { tracks }: { tracks: TopTrack[] } = await topTracksRes.json();
  if (!tracks || tracks.length === 0) {
    return Response.json({ concerts: [] });
  }

  const topArtists = extractTopArtists(tracks, 15);

  // Step 1: get genres for the user's top artists
  const genresById = await getArtistGenresBatch(
    topArtists.map((a) => a.id),
    session.accessToken as string
  );

  const maxRank = Math.max(...topArtists.map((a) => a.rank));
  const userGenres = topArtists.map((a) => ({
    genres: genresById.get(a.id) ?? [],
    weight: (maxRank - a.rank + 1) / maxRank,
  }));

  // Step 2: pull Ticketmaster candidates for each top artist
  const eventsByArtist: { artistName: string; event: TicketmasterEvent }[] = [];
  for (const artist of topArtists) {
    const events = await searchTicketmasterByArtist(artist.name, lat, lng, radius);
    for (const event of events) {
      eventsByArtist.push({ artistName: artist.name, event });
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Step 3: resolve genres for each unique candidate artist (cache to avoid dupes)
  const genreCache = new Map<string, string[]>();
  const candidates = [];
  for (const { artistName, event } of eventsByArtist) {
    let genres = genreCache.get(artistName);
    if (genres === undefined) {
      const resolved = await searchArtistGenres(artistName, session.accessToken as string);
      genres = resolved?.genres ?? [];
      genreCache.set(artistName, genres);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    candidates.push({ eventId: event.id, artistName, genres });
  }

  // Step 4: call the Python genre-similarity function
  const similarityRes = await fetch(`${origin}/api/genre-similarity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userGenres, candidates }),
  });

  const similarityData = similarityRes.ok
    ? await similarityRes.json()
    : { scores: [] };

  const scoreByEventId = new Map<string, number>(
    (similarityData.scores ?? []).map((s: any) => [s.eventId, s.similarityScore])
  );

  // Step 5: assemble final ranked list
  const results: RankedConcert[] = eventsByArtist.map(({ artistName, event }) => {
    const venue = event._embedded?.venues?.[0];
    return {
      eventId: event.id,
      eventName: event.name,
      artistName,
      similarityScore: scoreByEventId.get(event.id) ?? 0,
      date: event.dates.start.localDate,
      venueName: venue?.name ?? null,
      city: venue?.city?.name ?? null,
      latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
      longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
      ticketUrl: event.url,
    };
  });

  results.sort((a, b) => b.similarityScore - a.similarityScore);

  return Response.json({ concerts: results });
}