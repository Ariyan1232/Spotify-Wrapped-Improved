interface ArtistGenres {
  id: string;
  name: string;
  genres: string[];
}

/**
 * Batch-fetch genres for up to 50 artist IDs at once.
 */
export async function getArtistGenresBatch(
  artistIds: string[],
  accessToken: string
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (artistIds.length === 0) return result;

  const chunks: string[][] = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    chunks.push(artistIds.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    const res = await fetch(
      `https://api.spotify.com/v1/artists?ids=${chunk.join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) continue;

    const data = await res.json();
    for (const artist of data.artists ?? []) {
      if (artist?.id) {
        result.set(artist.id, artist.genres ?? []);
      }
    }
  }

  return result;
}

/**
 * Resolve a free-text artist name (e.g. from Ticketmaster) to a Spotify
 * artist and their genres, via Spotify search.
 */
export async function searchArtistGenres(
  artistName: string,
  accessToken: string
): Promise<ArtistGenres | null> {
  const params = new URLSearchParams({
    q: artistName,
    type: "artist",
    limit: "1",
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const match = data.artists?.items?.[0];
  if (!match) return null;

  return { id: match.id, name: match.name, genres: match.genres ?? [] };
}