import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("time_range") || "medium_term"; // short_term | medium_term | long_term

  const res = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  if (!res.ok) {
    return Response.json(
      { error: "Spotify API error", status: res.status },
      { status: res.status }
    );
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    return Response.json({ tracks: [] });
  }

  const parsedTracks = data.items.map((track: any, index: number) => ({
    rank: index + 1,
    id: track.id,
    name: track.name,
    artists: track.artists.map((a: any) => ({ id: a.id, name: a.name })),
    artistIds: track.artists.map((a: any) => a.id),
    album: track.album.name,
    imageUrl: track.album.images[0]?.url ?? null,
    popularity: track.popularity,
  }));

  return Response.json({ tracks: parsedTracks });
}