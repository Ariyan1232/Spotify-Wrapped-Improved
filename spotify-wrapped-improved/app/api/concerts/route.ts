import { NextResponse } from "next/server";
import { getSimilarCountries } from "@/lib/similarity";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "US";

  const similarCountries = getSimilarCountries(country);

  return NextResponse.json({
    country,
    similarCountries,
  });
}
