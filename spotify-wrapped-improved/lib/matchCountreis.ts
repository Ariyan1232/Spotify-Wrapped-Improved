// lib/matchCountries.ts
type CountryMatch = {
  country: string;
  overlapCount: number;
  overlapPct: number;
  matchedTrackIds: string[];
};

export function matchCountries(
  userTrackIds: string[],
  countryChartData: Record<string, string[]> // country name -> track ID array
): CountryMatch[] {
  const userSet = new Set(userTrackIds);

  const results: CountryMatch[] = Object.entries(countryChartData).map(
    ([country, trackIds]) => {
      const matched = trackIds.filter((id) => userSet.has(id));
      return {
        country,
        overlapCount: matched.length,
        overlapPct: (matched.length / userTrackIds.length) * 100,
        matchedTrackIds: matched,
      };
    }
  );

  return results.sort((a, b) => b.overlapCount - a.overlapCount);
}