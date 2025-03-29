import os
import sys
from pathlib import Path
from asgiref.sync import sync_to_async
import numpy as np
import math

project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import django
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
try:
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    print(f"Current Python path: {sys.path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Project root: {project_root}")
    print(f"Files in project root: {os.listdir(project_root)}")
    sys.exit(1)

from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from orbits.models import BodyModel
    from orbits.simulation import (
        nbody_simulation_verlet, 
        apply_maneuver,
        G,
        DT,
        MIN_SNAPSHOT_INTERVAL,
        MAX_SNAPSHOT_INTERVAL
    )
except ImportError as e:
    print(f"Error importing Django models: {e}")
    print(f"Current Python path: {sys.path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Project root: {project_root}")
    print(f"Files in project root: {os.listdir(project_root)}")
    sys.exit(1)

app = FastAPI(title="Orbital Simulation API")

class NBodyInput(BaseModel):
    name: str
    mass: float
    position: List[float] = Field(..., min_items=3, max_items=3)
    velocity: List[float] = Field(..., min_items=3, max_items=3)

class ManeuverInput(BaseModel):
    body_name: str
    delta_velocity: List[float] = Field(..., min_items=3, max_items=3)
    simulation_time: Optional[float] = None

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@sync_to_async
def save_bodies(bodies_data: List[NBodyInput]):
    body_objs = []
    for b in bodies_data:
        try:
            body_model = BodyModel.objects.filter(name=b.name).first()
            if body_model is None:
                body_model = BodyModel(name=b.name)
            
            body_model.mass = b.mass
            body_model.position = b.position
            body_model.velocity = b.velocity
            body_model.save()
            body_objs.append(body_model)
        except Exception as e:
            print(f"Error saving body {b.name}: {e}")
            raise
    return body_objs

@sync_to_async
def get_all_bodies():
    return list(BodyModel.objects.all())

def calculate_orbital_period(body: BodyModel, central_mass: float) -> float:
    r = np.linalg.norm(body.position)
    period = math.sqrt((4 * math.pi**2 * r**3) / (G * central_mass))
    return period

def get_adaptive_snapshot_interval(body: BodyModel, central_mass: float) -> int:
    period = calculate_orbital_period(body, central_mass)
    snapshots_per_orbit = 100  # We want about 100 snapshots per orbit
    desired_interval = int(period / (snapshots_per_orbit * DT))
    return max(MIN_SNAPSHOT_INTERVAL, min(desired_interval, MAX_SNAPSHOT_INTERVAL))

@app.post("/simulate_n_bodies/", summary="Simulate N-body system using Velocity Verlet")
async def simulate_n_bodies(bodies_data: List[NBodyInput]):
    try:
        # Save bodies to database asynchronously
        body_objs = await save_bodies(bodies_data)

        # Run simulation (this is CPU-bound, so we'll run it in a thread pool)
        trajectories = await sync_to_async(nbody_simulation_verlet)(
            bodies=body_objs,
            save_final=True 
        )

        return trajectories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/maneuver/", summary="Apply a maneuver to a body and simulate its trajectory")
async def apply_maneuver_endpoint(maneuver_data: ManeuverInput):
    try:
        # Get all bodies for simulation
        bodies = await get_all_bodies()
        
        # Find the target body
        target_body = next((b for b in bodies if b.name == maneuver_data.body_name), None)
        if target_body is None:
            raise HTTPException(status_code=404, detail=f"Body {maneuver_data.body_name} not found")
        
        # Apply the maneuver at the specified time
        delta_velocity = np.array(maneuver_data.delta_velocity)
        target_body = await sync_to_async(apply_maneuver)(
            target_body, 
            delta_velocity,
            simulation_time=maneuver_data.simulation_time
        )
        
        # Simulate the trajectory starting from the maneuver time
        trajectories = await sync_to_async(nbody_simulation_verlet)(
            bodies=bodies,
            save_final=True,
            start_time=maneuver_data.simulation_time
        )
        
        return {
            "maneuver_applied": {
                "body": target_body.name,
                "new_velocity": target_body.velocity.tolist(),
                "simulation_time": maneuver_data.simulation_time
            },
            "trajectories": trajectories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
