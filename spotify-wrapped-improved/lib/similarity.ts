import fs from "fs";
import path from "path";

export type SimilarityMatch = {
  country: string;
  similarity: number;
  sharedTracks: string[];
};

export function loadSimilarityIndex() {
  const dataPath = path.resolve(process.cwd(), "data", "similarity-output.json");

  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(raw) as Record<string, SimilarityMatch[]>;
  } catch (error) {
    console.error("Unable to load similarity data", error);
    return {} as Record<string, SimilarityMatch[]>;
  }
}

export function getSimilarCountries(country: string, limit = 5) {
  const index = loadSimilarityIndex();
  return (index[country] ?? []).slice(0, limit);
}
