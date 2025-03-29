from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from simulation.simulation import Body, nbody_simulation_verlet

app = FastAPI(title="Orbital Simulation API")

########################################
# 1) NEW /simulate_n_bodies/ ENDPOINT  #
########################################

class NBodyInput(BaseModel):
    """
    Defines a single body's data as received from the client.
    """
    name: str
    mass: float
    position: List[float] = Field(..., min_items=3, max_items=3)
    velocity: List[float] = Field(..., min_items=3, max_items=3)


@app.post("/simulate_n_bodies/", summary="Simulate N-body system using Velocity Verlet")
async def simulate_n_bodies(bodies_data: List[NBodyInput]):
    """
    Takes a list of celestial bodies (name, mass, position, velocity).
    Runs N-body simulation for 1000 steps (dt=60s).
    Returns a dict of positions for each body over time.
    """
    try:
        bodies = []
        for b in bodies_data:
            new_body = Body(
                name=b.name,
                mass=b.mass,
                position=b.position,
                velocity=b.velocity
            )
            bodies.append(new_body)

        dt = 60
        steps = 525948

        trajectories = nbody_simulation_verlet(bodies, dt, steps)

        return trajectories

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
