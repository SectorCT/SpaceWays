# main.py (or wherever)

import os
import sys
from pathlib import Path
from asgiref.sync import sync_to_async

# Add the project root to the Python path
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Now we can import Django
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

from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Import Django models after Django setup
try:
    from orbits.models import BodyModel
    from orbits.simulation import nbody_simulation_verlet
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@sync_to_async
def save_bodies(bodies_data: List[NBodyInput]):
    body_objs = []
    for b in bodies_data:
        try:
            # Try to get existing body or create new one
            body_model = BodyModel.objects.filter(name=b.name).first()
            if body_model is None:
                body_model = BodyModel(name=b.name)
            
            # Update the model with new data
            body_model.mass = b.mass
            body_model.position = b.position
            body_model.velocity = b.velocity
            body_model.save()
            body_objs.append(body_model)
        except Exception as e:
            print(f"Error saving body {b.name}: {e}")
            raise
    return body_objs

@app.post("/simulate_n_bodies/", summary="Simulate N-body system using Velocity Verlet")
async def simulate_n_bodies(bodies_data: List[NBodyInput]):
    try:
        # Save bodies to database asynchronously
        body_objs = await save_bodies(bodies_data)

        dt = 60
        steps = 500000
        snapshot_interval = 52

        # Run simulation (this is CPU-bound, so we'll run it in a thread pool)
        trajectories = await sync_to_async(nbody_simulation_verlet)(
            bodies=body_objs,
            dt=dt,
            steps=steps,
            snapshot_interval=snapshot_interval,
            save_final=True 
        )

        return trajectories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
