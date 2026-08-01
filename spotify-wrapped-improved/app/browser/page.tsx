"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Track = {
  rank: number;
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: string;
  imageUrl: string | null;
  popularity: number;
};

export default function Browser() {
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [status]);

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