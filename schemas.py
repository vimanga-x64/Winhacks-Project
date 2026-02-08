from pydantic import BaseModel
from typing import List, Optional


class EntryRequest(BaseModel):
    entry_type: str
    entry_text: str
    weight_kg: Optional[float] = None


class SummaryRequest(BaseModel):
    measurement_system: str
    user_profile: dict
    metabolic_data: dict
    daily_totals: dict
    additional_info: dict
    food_summary: List[str]
    activity_summary: List[str]


class RecommendationResponse(BaseModel):
    recommendation: str


class RecoveryRequest(BaseModel):
    user_profile: dict
    sleep_summary: dict
    recovery_metrics: dict
    nutrition: dict
    stress: dict
    energy_curve: list


class RecoveryResponse(BaseModel):
    recovery_tips: dict
