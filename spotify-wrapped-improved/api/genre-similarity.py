"""
Vercel Python serverless function.
Live endpoint: given the user's genre profile and a list of Ticketmaster
candidate artists (each with their Spotify genres), returns a similarity
score per candidate using TF-IDF + cosine similarity.
"""

from http.server import BaseHTTPRequestHandler
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def build_document(genres: list, weight: float = 1.0) -> str:
    """Repeat genre tokens proportional to weight so TF-IDF reflects emphasis."""
    repeats = max(1, round(weight))
    tokens = []
    for g in genres:
        tokens.extend([g.replace(" ", "_")] * repeats)
    return " ".join(tokens) if tokens else "unknown_genre"


def score_candidates(user_genres: list, candidates: list) -> list:
    user_document = build_document(
        [g for entry in user_genres for g in entry["genres"]],
        weight=1.0,
    )
    # Actually weight per-artist entries individually before flattening:
    weighted_tokens = []
    for entry in user_genres:
        weighted_tokens.append(build_document(entry["genres"], entry.get("weight", 1.0)))
    user_document = " ".join(weighted_tokens) if weighted_tokens else "unknown_genre"

    candidate_documents = [build_document(c["genres"], 1.0) for c in candidates]

    documents = [user_document] + candidate_documents
    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(documents)

    user_vector = matrix[0:1]
    candidate_vectors = matrix[1:]

    if candidate_vectors.shape[0] == 0:
        return []

    similarities = cosine_similarity(user_vector, candidate_vectors)[0]

    results = []
    for candidate, score in zip(candidates, similarities):
        results.append({
            "eventId": candidate["eventId"],
            "artistName": candidate["artistName"],
            "similarityScore": round(float(score), 4),
        })

    return sorted(results, key=lambda r: r["similarityScore"], reverse=True)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)

            user_genres = data.get("userGenres", [])
            candidates = data.get("candidates", [])

            results = score_candidates(user_genres, candidates)

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"scores": results}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())