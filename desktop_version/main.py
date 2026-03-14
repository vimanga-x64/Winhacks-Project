from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import EntryRequest, SummaryRequest, RecoveryRequest
from openai_service import estimate_calories, generate_recommendation, generate_recovery_tips

app = FastAPI(title="Fitness AI Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/recovery")
def recovery(payload: RecoveryRequest):
    try:
        result = generate_recovery_tips(payload.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
