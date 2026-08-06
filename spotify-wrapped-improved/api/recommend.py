import json
from pathlib import Path


def handler(request=None, context=None):
    data_path = Path(__file__).resolve().parents[1] / "data" / "similarity-output.json"
    payload = {"statusCode": 200, "headers": {"Content-Type": "application/json"}}

    try:
        with data_path.open("r", encoding="utf-8") as handle:
            recommendations = json.load(handle)
    except FileNotFoundError:
        recommendations = {}

    payload["body"] = json.dumps({
        "message": "Similarity recommendations ready",
        "data": recommendations,
    })
    return payload
