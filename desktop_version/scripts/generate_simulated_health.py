import json
from datetime import datetime, timedelta


def clamp(value, low, high):
    return max(low, min(high, value))


def generate_days(start_date: str, num_days: int):
    base_date = datetime.strptime(start_date, "%Y-%m-%d")
    days = []
    for i in range(num_days):
        date = base_date + timedelta(days=i)
        steps = 8500 + (i * 190) % 3800
        hrv = 46 + (i * 2) % 11
        resting_hr = 61 - (i % 4)
        systolic = 122 - (i % 6)
        diastolic = 79 - (i % 5)
        spo2 = 97 + (i % 2)
        resp_rate = 15.6 - (i % 4) * 0.2

        total_sleep = clamp(430 + (i % 6) * 12 - (i % 3) * 6, 410, 510)
        deep = clamp(int(total_sleep * 0.2), 70, 120)
        rem = clamp(int(total_sleep * 0.22), 80, 130)
        light = clamp(int(total_sleep * 0.48), 200, 270)
        awake = clamp(total_sleep - deep - rem - light, 30, 60)
        efficiency = round(clamp(1 - (awake / max(total_sleep, 1)), 0.82, 0.93), 2)
        sleep_debt = clamp(480 - total_sleep, 10, 80)
        sleep_inertia = clamp(38 - (i % 6) * 3, 18, 40)

        day = {
            "date": date.strftime("%Y-%m-%d"),
            "steps": int(steps),
            "hrv": int(hrv),
            "resting_hr": int(resting_hr),
            "blood_pressure": {"systolic": int(systolic), "diastolic": int(diastolic)},
            "spo2": int(spo2),
            "resp_rate": round(resp_rate, 1),
            "sleep": {
                "bedtime": "23:{:02d}".format(10 + i % 30),
                "wake": "07:{:02d}".format(2 + i % 20),
                "total_min": int(total_sleep),
                "deep_min": int(deep),
                "rem_min": int(rem),
                "light_min": int(light),
                "awake_min": int(awake),
                "efficiency": efficiency,
                "sleep_debt_min": int(sleep_debt),
                "sleep_inertia_min": int(sleep_inertia),
            },
        }
        days.append(day)
    return days


if __name__ == "__main__":
    dataset = {"days": generate_days("2026-01-25", 14)}
    with open("src/data/simulated_health.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)
    print("Wrote src/data/simulated_health.json")
