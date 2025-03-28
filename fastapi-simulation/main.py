from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from simulation.orbit import compute_orbit_from_state

app = FastAPI(title="Orbital Simulation API")

class OrbitInput(BaseModel):
    position: List[float] = Field(..., min_items=3, max_items=3)
    velocity: List[float] = Field(..., min_items=3, max_items=3)

@app.post("/compute_orbit/", summary="Compute orbit parameters from state vectors")
async def compute_orbit(data: OrbitInput):
    try:
        orbit_data = compute_orbit_from_state(data.position, data.velocity)
        return orbit_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))