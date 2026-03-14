import json
from datetime import datetime, timedelta


def generate_days(start_date: str, num_days: int):
    base_date = datetime.strptime(start_date, "%Y-%m-%d")
    days = []
    for i in range(num_days):
        date = base_date + timedelta(days=i)
        target = 2100
        calories = target + ((i % 5) - 2) * 120
        protein = 120 + (i % 4) * 6
        carbs = 200 + (i % 5) * 12
        fat = 60 + (i % 3) * 4
        days.append({
            "date": date.strftime("%Y-%m-%d"),
            "calories": int(calories),
            "target": int(target),
            "protein_g": int(protein),
            "carbs_g": int(carbs),
            "fat_g": int(fat)
        })
    return days


if __name__ == "__main__":
    dataset = {"days": generate_days("2026-02-01", 7)}
    with open("src/data/simulated_food.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)
    print("Wrote src/data/simulated_food.json")
