from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from schemas import EntryRequest, FoodIdentifyResponse, RecoveryRequest, SummaryRequest
from openai_service import (
    estimate_calories,
    generate_recommendation,
    generate_recovery_tips,
    identify_food,
)

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


@app.post("/identify-food", response_model=FoodIdentifyResponse)
async def identify_food_endpoint(file: UploadFile = File(...)):
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

        image_bytes = await file.read()
        result = identify_food(
            image_bytes=image_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )
        return {"description": result["description"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
