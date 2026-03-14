import argparse
import mimetypes
from pathlib import Path

import requests

BASE_URL = "http://127.0.0.1:8000"
DEFAULT_IMAGE_PATH = Path("assets/example_food_1.png")


def test_estimate():
    payload = {
        "entry_type": "food",
        "entry_text": "2 fried eggs and toast",
        "weight_kg": None,
    }

    response = requests.post(f"{BASE_URL}/estimate", json=payload, timeout=120)
    response.raise_for_status()
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
            "weekly_workouts": 4,
        },
        "metabolic_data": {
            "bmr_kcal": 1750,
            "activity_factor": 1.55,
            "baseline_needs_kcal": 2712,
            "estimated_daily_needs_kcal": 3062,
            "target_kcal": 2562,
        },
        "daily_totals": {
            "total_consumed_kcal": 2150,
            "total_burned_kcal": 350,
            "net_kcal": 1800,
            "difference_from_target_kcal": -762,
        },
        "additional_info": {
            "sleep_hours": 6,
            "mood": "normal",
            "notes": None,
        },
        "food_summary": [
            "2 fried eggs and toast",
        ],
        "activity_summary": [
            "Walking 6000 steps",
        ],
    }

    response = requests.post(f"{BASE_URL}/recommendation", json=payload, timeout=120)
    response.raise_for_status()
    print("Recommendation response:", response.json())


def test_identify_food(image_path: Path):
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"

    with image_path.open("rb") as image_file:
        response = requests.post(
            f"{BASE_URL}/identify-food",
            files={"file": (image_path.name, image_file, content_type)},
            timeout=120,
        )

    response.raise_for_status()
    result = response.json()
    print("Identify food response:", result)
    print("Description:", result["description"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["estimate", "recommendation", "identify_food", "all"],
        default="identify_food",
    )
    parser.add_argument(
        "--path",
        default=str(DEFAULT_IMAGE_PATH),
        help="Path to image for identify_food test.",
    )
    args = parser.parse_args()

    if args.mode == "estimate":
        test_estimate()
    elif args.mode == "recommendation":
        test_recommendation()
    elif args.mode == "identify_food":
        test_identify_food(Path(args.path))
    else:
        test_estimate()
        test_recommendation()
        test_identify_food(Path(args.path))


if __name__ == "__main__":
    main()
