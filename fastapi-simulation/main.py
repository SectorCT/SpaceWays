from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from simulation.simulation import Body, nbody_simulation_verlet, maneuver_rocket

app = FastAPI(title="Orbital Simulation API")

########################################
# 1) NEW /simulate_n_bodies/ ENDPOINT  #
########################################

class NBodyInput(BaseModel):
    name: str
    mass: float
    position: List[float] = Field(..., min_items=3, max_items=3)
    velocity: List[float] = Field(..., min_items=3, max_items=3)

class ManeuverInput(BaseModel):
    name: str
    maneuver_time: float
    velocity_change: List[float] = Field(..., min_items=3, max_items=3)

@app.post("/simulate_n_bodies/", summary="Simulate N-body system using Velocity Verlet")
async def simulate_n_bodies(bodies_data: List[NBodyInput]):
    try:
        bodies = [Body(b.name, b.mass, b.position, b.velocity) for b in bodies_data]
        dt = 60
        steps = 525948
        trajectories = nbody_simulation_verlet(bodies, dt, steps)
        return trajectories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

########################################
# 2) NEW /maneuver/ ENDPOINT            #
########################################

@app.post("/maneuver/", summary="Calculate the new trajectory after a maneuver")
async def maneuver(data: ManeuverInput):
    try:
        new_trajectory = maneuver_rocket(
            name=data.name,
            maneuver_time=data.maneuver_time,
            velocity_change=data.velocity_change
        )
        return new_trajectory
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
