import base64
import json
import mimetypes

import requests
from openai import OpenAI

from config import OPENAI_API_KEY, MODEL_NAME

client = OpenAI(api_key=OPENAI_API_KEY)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


system_prompt_1 = """
You are a calorie estimation engine.

Your task:
Analyze ONE entry (food OR activity) and estimate calories.

Input will be provided as structured JSON.

Rules:

If entry_type = "food":
- Estimate calories consumed.
- If portion size is missing, assume a standard serving size.
- Use average nutritional values.

If entry_type = "activity":
- Estimate calories burned using:

Calories burned = MET × weight_kg × duration_hours

If duration is not explicitly given:
- If steps are provided:
  Assume 1000 steps ≈ 0.8 km
  Assume walking speed ≈ 5 km/h
  MET for moderate walking = 3.5

- If repetitions are provided:
  Estimate reasonable duration.
  Use MET = 6.0 for bodyweight exercises.

General rules:
- Make reasonable assumptions if data is incomplete.
- Do not merge or invent extra activities.
- All numeric values must be numbers (not strings).
- Return ONLY valid JSON.
- Do NOT include explanations outside JSON.

RESPONSE FORMAT:
{
  "estimated_calories": number,
}
""".strip()

user_prompt_template = """
Analyze the following entry and estimate calories.

Input JSON:
{}
""".strip()


system_prompt_2 = """You are a health and fitness recommendation assistant.

You receive structured JSON data containing:
- User profile
- Metabolic calculations
- Daily calorie totals
- Additional lifestyle information
- Food summary
- Activity summary

IMPORTANT:
- Take into account measurement_system": "metric" or "imperial"
- All calorie values and calculations are already finalized.
- Do NOT recalculate BMR, daily needs, net calories, or targets.
- Use only the provided numbers.
- Do NOT contradict provided values.

Your task:

Provide a clear and practical daily summary with recommendations.

The response must:
- Explain whether the user is in a calorie deficit, surplus, or maintenance.
- State whether this aligns with their goal.
- Give specific nutrition suggestions (what types of food to increase or reduce).
- Give specific activity suggestions (what type of exercise to add or adjust).
- Include recovery advice based on sleep and mood.
- Be supportive and realistic.
- Avoid medical diagnoses.
- Avoid extreme dieting advice.

The output must be:
- A single well-structured text (5–10 sentences).
- With bullet points in new line. For bullets, use "*" followed by a space.
- No JSON.
- No headings.
- Natural, professional tone.

Second, provide the short summary of the recommendation (1-2 sentences) that summarize the main advice in JSON format at the end of the response.

RESPONSE FORMAT:
{
  "recommendation": text,
  "summary": text
}
""".strip()


def call_openai(system_prompt: str, user_content: str):
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
    )
    return response.choices[0].message.content.strip()


def estimate_calories(data: dict):
    user_prompt = f"Analyze the following entry:\n{json.dumps(data)}"
    result = call_openai(system_prompt_1, user_prompt)

    json_start = result.find("{")
    json_end = result.rfind("}") + 1
    return json.loads(result[json_start:json_end])


def generate_recommendation(data: dict):
    user_prompt = f"Analyze the following daily data:\n{json.dumps(data)}"
    result = call_openai(system_prompt_2, user_prompt)

    json_start = result.find("{")
    json_end = result.rfind("}") + 1
    return json.loads(result[json_start:json_end])


system_prompt_3 = """You are a health and recovery specialist.

You receive structured JSON data containing:
- User profile (age, gender, fitness goals)
- Sleep summary (last night and today, bedtime, wake, energy windows)
- Recovery metrics (7-day averages of HRV, resting HR, sleep efficiency, sleep debt)
- Nutrition (last 7 days of calories, surplus/deficit/target counts)
- Stress (7-day scores, average score, stress level)
- Energy curve (hourly energy levels)

Your task:
Provide personalized recovery tips to optimize performance and well-being.

The response must be a JSON object with a "recovery_tips" key. 
The value of "recovery_tips" should be a dictionary where each key is a category (e.g., "Sleep", "Active Recovery", "Nutrition & Hydration", "Stress Management") and the value is a list of strings (tips).

Rules:
- Be specific and actionable.
- Use the provided data to tailor recommendations.
- Provide 2-3 tips per category.
- Return ONLY valid JSON.
- Do NOT include explanations outside JSON.

RESPONSE FORMAT:
{
  "recovery_tips": {
    "Category Name": ["Tip 1", "Tip 2"],
    ...
  }
}
""".strip()


def generate_recovery_tips(data: dict):
    user_prompt = f"Analyze the following recovery data:\n{json.dumps(data)}"
    result = call_openai(system_prompt_3, user_prompt)

    json_start = result.find("{")
    json_end = result.rfind("}") + 1
    return json.loads(result[json_start:json_end])


def _extract_response_text(result: dict) -> str:
    output_text = (result.get("output_text") or "").strip()
    if output_text:
        return output_text

    parts = []
    for item in result.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                parts.append(content["text"])

    return "\n".join(parts).strip()


def _image_bytes_to_data_url(image_bytes: bytes, filename: str | None = None, content_type: str | None = None) -> str:
    mime_type = content_type or mimetypes.guess_type(filename or "")[0] or "image/jpeg"
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def identify_food(image_bytes: bytes, filename: str | None = None, content_type: str | None = None, model: str = MODEL_NAME):
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured.")
    if not image_bytes:
        raise ValueError("Image is empty.")

    prompt = (
        "You analyze a food photo and return exactly one short description in English. "
        "Identify the dish and, when visible, estimate portion or count. "
        "Examples: 'a bowl of pea soup, about 150 g' or 'fried eggs from 2 eggs and 1 sausage'. "
        "Return JSON only with keys description, confidence, and assumptions. "
        "description must be one short line in English. Use English words only, no Cyrillic. "
        "confidence must be a number from 0 to 1. "
        "assumptions must be a short English string with visual assumptions, or an empty string if none."
    )

    payload = {
        "model": model,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_image",
                        "image_url": _image_bytes_to_data_url(
                            image_bytes=image_bytes,
                            filename=filename,
                            content_type=content_type,
                        ),
                    },
                ],
            }
        ],
    }

    response = requests.post(
        OPENAI_RESPONSES_URL,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    result = response.json()

    raw_text = _extract_response_text(result)
    if not raw_text:
        raise ValueError(f"Empty model response: {json.dumps(result, ensure_ascii=False)[:1000]}")

    json_start = raw_text.find("{")
    json_end = raw_text.rfind("}") + 1
    if json_start == -1 or json_end <= json_start:
        raise ValueError(f"Expected JSON, got: {raw_text}")

    parsed = json.loads(raw_text[json_start:json_end])
    parsed["raw_response"] = raw_text
    return parsed
