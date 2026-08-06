import json
from itertools import combinations
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "data" / "country-charts.json"
OUTPUT_PATH = ROOT / "data" / "similarity-output.json"


def jaccard_similarity(left, right):
    if not left and not right:
        return 0.0
    union = set(left) | set(right)
    if not union:
        return 0.0
    return round(len(set(left) & set(right)) / len(union), 4)


def build_similarity_index(charts):
    index = {}
    countries = sorted(charts.keys())

    for left_country, right_country in combinations(countries, 2):
        score = jaccard_similarity(charts[left_country], charts[right_country])
        if score <= 0:
            continue

        index.setdefault(left_country, []).append({
            "country": right_country,
            "similarity": score,
            "sharedTracks": sorted(set(charts[left_country]) & set(charts[right_country])),
        })
        index.setdefault(right_country, []).append({
            "country": left_country,
            "similarity": score,
            "sharedTracks": sorted(set(charts[left_country]) & set(charts[right_country])),
        })

    for country in countries:
        index[country] = sorted(index.get(country, []), key=lambda item: item["similarity"], reverse=True)

    return index


def main():
    with INPUT_PATH.open("r", encoding="utf-8") as handle:
        charts = json.load(handle)

    similarity_index = build_similarity_index(charts)
    OUTPUT_PATH.write_text(json.dumps(similarity_index, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
