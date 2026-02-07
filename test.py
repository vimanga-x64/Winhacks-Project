import requests

BASE_URL = "http://127.0.0.1:8000"


def test_estimate():
    payload = {
        "entry_type": "food",
        "entry_text": "2 fried eggs and toast",
        "weight_kg": None
    }

    response = requests.post(f"{BASE_URL}/estimate", json=payload)
    print("Estimate response:", response.json())


def test_recommendation():
    payload = {
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
            "notes": None
        },
        "food_summary": [
            "2 fried eggs and toast"
        ],
        "activity_summary": [
            "Walking 6000 steps"
        ]
    }

    response = requests.post(f"{BASE_URL}/recommendation", json=payload)
    print("Recommendation response:", response.json())


if __name__ == "__main__":
    test_estimate()
    test_recommendation()
