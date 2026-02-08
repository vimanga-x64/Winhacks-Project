import json
from openai import OpenAI
from config import OPENAI_API_KEY, MODEL_NAME

client = OpenAI(api_key=OPENAI_API_KEY)


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
