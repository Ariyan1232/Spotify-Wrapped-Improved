"""
Offline precompute: artist-artist similarity matrix from country chart data.
Run manually: python precompute/similarity.py
Reads:  data/country-charts.json
Writes: data/similarity-output.json
"""

import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path

INPUT_PATH = Path(__file__).parent.parent / "data" / "country-charts.json"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "similarity-output.json"


def rank_to_weight(rank: int, max_rank: int) -> float:
    return (max_rank - rank + 1) / max_rank


def build_artist_matrix(country_charts: dict) -> tuple[list[str], np.ndarray]:
    """
    country_charts shape:
    {
      "US": [ { "trackId": "...", "artistName": "...", "trackName": "...", "rank": 1 }, ... ],
      "BR": [ ... ],
      ...
    }
    Returns (artist_names_in_order, matrix) where matrix rows = countries, cols = artists.
    """
    all_artists: set[str] = set()
    for tracks in country_charts.values():
        for t in tracks:
            all_artists.add(t["artistName"])

    artist_list = sorted(all_artists)
    artist_index = {name: i for i, name in enumerate(artist_list)}

    countries = sorted(country_charts.keys())
    matrix = np.zeros((len(countries), len(artist_list)))

    for row, country in enumerate(countries):
        tracks = country_charts[country]
        max_rank = max((t["rank"] for t in tracks), default=1)
        for t in tracks:
            col = artist_index[t["artistName"]]
            weight = rank_to_weight(t["rank"], max_rank)
            matrix[row, col] += weight

    return artist_list, matrix


def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Expected country chart data at {INPUT_PATH}. "
            "Export your Taste Twin Country chart data to this path first."
        )

    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        country_charts = json.load(f)

    artist_list, matrix = build_artist_matrix(country_charts)

    # Item-item similarity: artists as rows now, countries as columns/features
    item_matrix = matrix.T
    similarity = cosine_similarity(item_matrix)

    # Output as a flat lookup: { "Artist A": { "Artist B": 0.83, ... }, ... }
    # Only keep non-trivial similarities to keep file size sane.
    output: dict[str, dict[str, float]] = {}
    THRESHOLD = 0.05

    for i, artist_a in enumerate(artist_list):
        row = {}
        for j, artist_b in enumerate(artist_list):
            if i == j:
                continue
            score = float(similarity[i, j])
            if score >= THRESHOLD:
                row[artist_b] = round(score, 4)
        if row:
            output[artist_a] = row

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote similarity data for {len(output)} artists to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()