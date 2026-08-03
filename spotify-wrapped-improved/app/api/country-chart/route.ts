// app/api/country-chart/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get("playlist_id");
  if (!playlistId) {
    return Response.json({ error: "Missing playlist_id" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  if (!res.ok) {
    return Response.json({ error: "Spotify API error" }, { status: res.status });
  }

  const data = await res.json();
  const trackIds = data.items
    .map((item: any) => item.track?.id)
    .filter(Boolean); // some entries can be null (removed/local tracks)

  return Response.json({ trackIds });
}