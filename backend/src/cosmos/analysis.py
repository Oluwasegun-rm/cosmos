"""OpenAI-backed journal insight generation."""

from __future__ import annotations

import json
from urllib import error, request

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

INSIGHTS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "sentiment": {
            "type": "string",
            "enum": ["positive", "negative", "neutral", "mixed"],
        },
        "mood": {"type": "string"},
        "themes": {"type": "array", "items": {"type": "string"}},
        "routines": {"type": "array", "items": {"type": "string"}},
        "activities": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": [
        "sentiment",
        "mood",
        "themes",
        "routines",
        "activities",
        "summary",
        "confidence",
    ],
}

SYSTEM_PROMPT = """
You analyze personal journal entries and extract lightweight, product-safe insights.

Return JSON only. Do not include markdown. Keep the output concise and grounded in the
text. Use short phrases for themes, routines, and activities. If the evidence is weak,
return empty arrays rather than inventing patterns.
""".strip()


class AnalysisError(RuntimeError):
    """Base error for journal analysis failures."""


class AnalysisNotConfiguredError(AnalysisError):
    """Raised when the API key has not been provided."""


def analyze_entry(*, content: str, model_name: str, api_key: str) -> tuple[dict, dict]:
    """Generate structured insights for one journal entry."""
    if not api_key:
        raise AnalysisNotConfiguredError(
            "OpenAI analysis is not configured yet. Add OPENAI_API_KEY to enable insights."
        )

    payload = {
        "model": model_name,
        "reasoning": {"effort": "low"},
        "input": [
            {
                "role": "developer",
                "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Analyze the following journal entry and return JSON that "
                            "matches the provided schema.\n\n"
                            f"{content}"
                        ),
                    }
                ],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "journal_entry_insights",
                "description": "Structured emotional and thematic insights for one journal entry.",
                "schema": INSIGHTS_SCHEMA,
                "strict": True,
            }
        },
        "max_output_tokens": 600,
    }

    raw_response = _post_json(OPENAI_RESPONSES_URL, payload, api_key)
    text_output = _extract_output_text(raw_response)

    try:
        parsed = json.loads(text_output)
    except json.JSONDecodeError as exc:
        raise AnalysisError("OpenAI returned a non-JSON response for journal insights.") from exc

    _validate_insights(parsed)
    return parsed, raw_response


def _post_json(url: str, payload: dict, api_key: str) -> dict:
    """Send a JSON request to the OpenAI Responses API."""
    body = json.dumps(payload).encode("utf-8")
    api_request = request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(api_request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AnalysisError(
            f"OpenAI request failed with status {exc.code}: {detail}"
        ) from exc
    except error.URLError as exc:
        raise AnalysisError(f"OpenAI request failed: {exc.reason}") from exc


def _extract_output_text(raw_response: dict) -> str:
    """Pull assistant JSON text from a Responses API payload."""
    for item in raw_response.get("output", []):
        if item.get("type") != "message" or item.get("role") != "assistant":
            continue

        text_parts: list[str] = []
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                text_parts.append(content.get("text", ""))
            if content.get("type") == "refusal":
                raise AnalysisError(f"OpenAI refused the analysis: {content.get('refusal', '')}")

        if text_parts:
            return "".join(text_parts)

    raise AnalysisError("OpenAI response did not include assistant output text.")


def _validate_insights(insights: dict) -> None:
    """Sanity-check the parsed insight payload before storing it."""
    required_keys = {
        "sentiment",
        "mood",
        "themes",
        "routines",
        "activities",
        "summary",
        "confidence",
    }
    missing = required_keys.difference(insights.keys())
    if missing:
        raise AnalysisError(f"OpenAI response was missing required keys: {sorted(missing)}")

    for key in ("themes", "routines", "activities"):
        if not isinstance(insights[key], list) or any(
            not isinstance(item, str) for item in insights[key]
        ):
            raise AnalysisError(f"Expected {key} to be a list of strings.")

    if insights["sentiment"] not in {"positive", "negative", "neutral", "mixed"}:
        raise AnalysisError("OpenAI returned an unsupported sentiment label.")

    if not isinstance(insights["mood"], str) or not isinstance(insights["summary"], str):
        raise AnalysisError("OpenAI returned invalid text fields for the journal insights.")

    if not isinstance(insights["confidence"], (int, float)):
        raise AnalysisError("OpenAI returned a non-numeric confidence value.")
