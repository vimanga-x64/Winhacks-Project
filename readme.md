# Fitness AI Backend

Minimal FastAPI backend that connects frontend to OpenAI.

It provides two endpoints:

1) `/estimate` — estimates calories for ONE entry (food or activity)  
2) `/recommendation` — generates daily summary text with recommendations  

Backend does NOT calculate anything.  
All numbers must be precomputed in frontend.

---

# 🚀 Run Backend

Install dependencies:

pip install -r requirements.txt

Start server:

uvicorn main:app --reload

Server runs at:

http://127.0.0.1:8000

---

# 1️⃣ POST /estimate

Used for Request #1 (single entry calorie estimation).

## Request Body

```json
{
  "entry_type": "food" | "activity",
  "entry_text": "string",
  "weight_kg": number | null
}
```


## Rules

* If entry_type = "food" → weight_kg must be null
* If entry_type = "activity" → weight_kg is required
* One request = one entry only

## Example

```json
{
  "entry_type": "activity",
  "entry_text": "Walking 6000 steps",
  "weight_kg": 78
}
```

## Response

```json
{
  "estimated_calories": 265
}
```


# 2️⃣ POST /recommendation

Used for Request #2 (daily summary + recommendations).

Frontend must send FULLY PRECOMPUTED data.

Backend does not verify formulas.

## Request Body
```json
{
  "measurement_system": string,

  "user_profile": {
    "age": number,
    "sex": string,
    "weight": number,
    "height": number,
    "goal": string,
    "target_weight": number | null,
    "activity_level": string,
    "weekly_workouts": number
  },

  "metabolic_data": {
    "bmr_kcal": number,
    "activity_factor": number,
    "baseline_needs_kcal": number,
    "estimated_daily_needs_kcal": number,
    "target_kcal": number
  },

  "daily_totals": {
    "total_consumed_kcal": number,
    "total_burned_kcal": number,
    "net_kcal": number,
    "difference_from_target_kcal": number
  },

  "additional_info": {
    "sleep_hours": number,
    "mood": string,
    "notes": string | null
  },

  "food_summary": [string],
  "activity_summary": [string]
}
```

# Important Validation (Frontend Responsibility)

Frontend must ensure:
* net_kcal = total_consumed_kcal − total_burned_kcal
* difference_from_target_kcal = net_kcal − target_kcal
* All numbers are actual numbers (not strings)
* Arrays exist (can be empty [])

## Example

```json
{
  "measurement_system": "metric",

  "user_profile": {
    "age": 29,
    "sex": "male",
    "weight": 78,
    "height": 178,
    "goal": "reduce body fat",
    "target_weight": 72,
    "activity_level": "desk job",
    "weekly_workouts": 4
  },

  "metabolic_data": {
    "bmr_kcal": 1750,
    "activity_factor": 1.55,
    "baseline_needs_kcal": 2712,
    "estimated_daily_needs_kcal": 3062,
    "target_kcal": 2562
  },

  "daily_totals": {
    "total_consumed_kcal": 2150,
    "total_burned_kcal": 350,
    "net_kcal": 1800,
    "difference_from_target_kcal": -762
  },

  "additional_info": {
    "sleep_hours": 6,
    "mood": "normal",
    "notes": null
  },

  "food_summary": [
    "2 fried eggs and toast",
    "pasta and chicken breast"
  ],

  "activity_summary": [
    "Walking 6000 steps",
    "Pushups 3 sets of 10"
  ]
}
```

## Response

```json
{
  "recommendation": "Text summary with recommendations..."
}
```

# Architecture Summary

Frontend:
* Calculates BMR
* Calculates totals
* Aggregates data
* Sends ready JSON

Backend:
* Forwards to OpenAI
* Returns model response
* No calculations