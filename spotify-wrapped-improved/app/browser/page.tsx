"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { COUNTRY_PLAYLISTS } from "@/lib/countryPlaylists";
import { matchCountries } from "@/lib/matchCountries";

type Track = {
  rank: number;
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: string;
  imageUrl: string | null;
  popularity: number;
};

type CountryMatch = {
  country: string;
  overlapCount: number;
  overlapPct: number;
  matchedTrackIds: string[];
};

export default function Browser() {
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryMatch, setCountryMatch] = useState<CountryMatch | null>(null);
  const [countryMatchLoading, setCountryMatchLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      fetch("/api/top-tracks?time_range=medium_term")
        .then((res) => {
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setTracks(data.tracks || []);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
      setTracks([]);
      setCountryMatch(null);
    }
  }, [status]);

  useEffect(() => {
    if (tracks.length === 0) {
      setCountryMatch(null);
      return;
    }

    let cancelled = false;

    const runCountryMatch = async () => {
      setCountryMatchLoading(true);

      try {
        const userTrackIds = tracks.map((track) => track.id);
        const countryChartEntries = await Promise.all(
          Object.entries(COUNTRY_PLAYLISTS).map(async ([country, playlistId]) => {
            try {
              const res = await fetch(`/api/country-chart?playlist_id=${playlistId}`);
              if (!res.ok) {
                throw new Error(`Country chart request failed: ${res.status}`);
              }

              const data = await res.json();
              return [country, data.trackIds as string[]] as const;
            } catch {
              return [country, [] as string[]] as const;
            }
          })
        );

        const countryChartData = Object.fromEntries(countryChartEntries) as Record<string, string[]>;
        const matches = matchCountries(userTrackIds, countryChartData);

        if (!cancelled) {
          setCountryMatch(matches[0] ?? null);
        }
      } catch (err) {
        console.error("Unable to match your tracks to countries", err);
        if (!cancelled) {
          setCountryMatch(null);
        }
      } finally {
        if (!cancelled) {
          setCountryMatchLoading(false);
        }
      }
    };

    runCountryMatch();

    return () => {
      cancelled = true;
    };
  }, [tracks]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">Loading your top tracks...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">Please sign in to see your top tracks.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">No listening history found yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Your Top Tracks</h1>

      <div className="max-w-2xl mx-auto mb-8 rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Closest country match</p>
        {countryMatchLoading ? (
          <p className="mt-2 text-white/70">Comparing your top tracks to country charts...</p>
        ) : countryMatch ? (
          <>
            <p className="mt-2 text-xl font-semibold">{countryMatch.country}</p>
            <p className="mt-1 text-sm text-white/70">
              {countryMatch.overlapCount} shared tracks ({countryMatch.overlapPct.toFixed(1)}% of your top tracks)
            </p>
          </>
        ) : (
          <p className="mt-2 text-white/70">Your country match will appear here once the analysis finishes.</p>
        )}
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-4 py-3 border-b border-white/10"
          >
            <span className="text-white/40 text-sm w-6 text-right">{track.rank}</span>
            {track.imageUrl && (
              <img src={track.imageUrl} alt={track.album} className="w-12 h-12 rounded" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{track.name}</p>
              <p className="text-xs text-white/60">
                {track.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
            <span className="text-xs text-white/40">{track.album}</span>
          </div>
        ))}
      </div>
    </div>
  );
}