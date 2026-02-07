import json
from openai import OpenAI
from config import OPENAI_API_KEY, MODEL_NAME

client = OpenAI(api_key=OPENAI_API_KEY)


system_prompt_1 = """You are a calorie estimation engine...
(Return ONLY JSON with "estimated_calories": number)"""


system_prompt_2 = """You are a health and fitness recommendation assistant...
(Return JSON with "recommendation": text)"""


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
