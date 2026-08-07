import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

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
    attractions?: { name: string }[];
  };
}

interface RankedConcert {
  eventId: string;
  eventName: string;
  artistName: string;
  affinityRank: number; // lower = higher affinity (matches user's track rank)
  date: string;
  venueName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  ticketUrl: string;
}

function extractTopArtists(tracks: TopTrack[], limit: number): { name: string; rank: number }[] {
  const seen = new Map<string, number>(); // artist name -> best (lowest) rank seen
  for (const track of tracks) {
    for (const artist of track.artists) {
      const existing = seen.get(artist.name);
      if (existing === undefined || track.rank < existing) {
        seen.set(artist.name, track.rank);
      }
    }
  }
  return Array.from(seen.entries())
    .map(([name, rank]) => ({ name, rank }))
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
  if (!res.ok) {
    console.warn(`Ticketmaster lookup failed for "${artistName}": ${res.status}`);
    return [];
  }

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
  const radius = searchParams.get("radius") ?? "50"; // miles

  if (!lat || !lng) {
    return Response.json({ error: "Missing lat/lng query params" }, { status: 400 });
  }

  // Reuse your existing top-tracks route's logic via internal fetch
  const topTracksRes = await fetch(`${new URL(request.url).origin}/api/top-tracks`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  if (!topTracksRes.ok) {
    return Response.json({ error: "Failed to fetch top tracks" }, { status: 502 });
  }

  const { tracks }: { tracks: TopTrack[] } = await topTracksRes.json();
  if (!tracks || tracks.length === 0) {
    return Response.json({ concerts: [] });
  }

  const topArtists = extractTopArtists(tracks, 15); // cap external calls

  const results: RankedConcert[] = [];

  for (const artist of topArtists) {
    const events = await searchTicketmasterByArtist(artist.name, lat, lng, radius);
    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      results.push({
        eventId: event.id,
        eventName: event.name,
        artistName: artist.name,
        affinityRank: artist.rank,
        date: event.dates.start.localDate,
        venueName: venue?.name ?? null,
        city: venue?.city?.name ?? null,
        latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
        longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
        ticketUrl: event.url,
      });
    }
    // Ticketmaster rate limit courtesy delay
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  results.sort((a, b) => a.affinityRank - b.affinityRank);

  return Response.json({ concerts: results });
}
