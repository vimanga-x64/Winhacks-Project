from fastapi import FastAPI, HTTPException
from schemas import EntryRequest, SummaryRequest
from openai_service import estimate_calories, generate_recommendation

app = FastAPI(title="Fitness AI Backend")


@app.post("/estimate")
def estimate(entry: EntryRequest):
    try:
        result = estimate_calories(entry.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommendation")
def recommendation(summary: SummaryRequest):
    try:
        result = generate_recommendation(summary.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
