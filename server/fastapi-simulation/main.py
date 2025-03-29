# main.py (or wherever)

import os
import sys
from pathlib import Path
from asgiref.sync import sync_to_async
import numpy as np

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

from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Import Django models after Django setup
try:
    from orbits.models import BodyModel
    from orbits.simulation import (
        nbody_simulation_verlet, 
        apply_maneuver, 
        TIME_STEP, 
        STEPS_PER_QUARTER, 
        SNAPSHOT_INTERVAL, 
        simulate_quarters
    )
    from orbits.utils import date_to_seconds, seconds_to_date, get_trajectory_between_dates
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
    simulation_time: Optional[float] = None  # Time at which to apply the maneuver

class TrajectoryDateRangeInput(BaseModel):
    body_name: str
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., description="End date in YYYY-MM-DD format")

class SimulationResponse(BaseModel):
    status: str
    message: str
    trajectories: Optional[dict] = None

class TrajectoryRangeRequest(BaseModel):
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., description="End date in YYYY-MM-DD format")
    body_names: List[str] = Field(..., description="List of body names to get trajectories for")

class TrajectoryData(BaseModel):
    body_name: str
    positions: dict

class SolarSystemBody(NBodyInput):  # Inherit from NBodyInput
    pass

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

@sync_to_async
def get_all_bodies():
    return list(BodyModel.objects.all())

@app.post("/simulate_n_bodies/")
async def simulate_n_bodies(bodies_data: List[dict]):
    try:
        # Save bodies to database asynchronously using the raw function
        body_objs = await save_bodies_raw(bodies_data)

        # Run simulation for multiple quarters
        trajectories = await sync_to_async(simulate_quarters)(
            bodies=body_objs,
            start_time=0.0
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
        
        return trajectories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trajectory_between_dates/")
async def get_trajectory_between_dates_endpoint(
    body_name: str,
    start_date: str,
    end_date: str
):
    try:
        # Get the body from database
        body = await sync_to_async(BodyModel.objects.get)(name=body_name)
        
        # Get the trajectory data
        trajectory = body.get_trajectory()
        
        # Filter trajectory between dates
        filtered_trajectory = get_trajectory_between_dates(
            trajectory,
            start_date,
            end_date
        )
        
        # Return the data in the requested format
        return {
            body_name: filtered_trajectory
        }
    except BodyModel.DoesNotExist:
        raise HTTPException(status_code=404, detail=f"Body {body_name} not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_trajectories/", summary="Get trajectory data for multiple bodies between dates", response_model=List[TrajectoryData])
async def get_trajectories(data: TrajectoryRangeRequest):
    try:
        trajectories = []
        
        # Get trajectory data for each requested body
        for body_name in data.body_names:
            try:
                body = await sync_to_async(BodyModel.objects.get)(name=body_name)
                trajectory = body.get_trajectory()
                
                # Filter trajectory between dates
                filtered_trajectory = get_trajectory_between_dates(
                    trajectory,
                    data.start_date,
                    data.end_date
                )
                
                # Convert timestamps to dates for better readability
                readable_trajectory = {
                    seconds_to_date(float(timestamp)): position
                    for timestamp, position in filtered_trajectory.items()
                }
                
                trajectories.append(TrajectoryData(
                    body_name=body_name,
                    positions=readable_trajectory
                ))
                
            except BodyModel.DoesNotExist:
                raise HTTPException(
                    status_code=404,
                    detail=f"Body {body_name} not found in database"
                )
        
        return trajectories
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@sync_to_async
def save_bodies_raw(bodies_data: List[dict]):
    body_objs = []
    for b in bodies_data:
        try:
            # Try to get existing body or create new one
            body_model = BodyModel.objects.filter(name=b["name"]).first()
            if body_model is None:
                body_model = BodyModel(name=b["name"])
            
            # Update the model with new data
            body_model.mass = b["mass"]
            body_model.position = b["position"]
            body_model.velocity = b["velocity"]
            body_model.save()
            body_objs.append(body_model)
        except Exception as e:
            print(f"Error saving body {b['name']}: {e}")
            raise
    return body_objs

@app.post("/simulate_solar_system/")
async def simulate_solar_system(bodies_data: List[dict]):
    try:
        # Save bodies to database asynchronously using the raw function
        body_objs = await save_bodies_raw(bodies_data)

        # Run simulation with fixed parameters
        trajectories = await sync_to_async(nbody_simulation_verlet)(
            bodies=body_objs,
            dt=TIME_STEP,  # 60 seconds
            steps=STEPS_PER_QUARTER,  # 90 days worth of steps
            snapshot_interval=SNAPSHOT_INTERVAL,  # 52
            save_final=True
        )

        return trajectories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/all_trajectories/")
async def get_all_trajectories_endpoint(
    start_date: str,
    end_date: str
):
    try:
        # Get all bodies from database
        bodies = await get_all_bodies()
        print(f"Retrieved {len(bodies)} bodies from database")
        
        # Create a dictionary to store all trajectories
        all_trajectories = {}
        
        # Get trajectory data for each body
        for body in bodies:
            trajectory = body.get_trajectory()
            print(f"Body {body.name} has {len(trajectory)} trajectory points")
            print(f"Trajectory time range: {min(float(t) for t in trajectory.keys() if trajectory)} to {max(float(t) for t in trajectory.keys() if trajectory)} seconds")
            
            # Convert start and end dates to seconds
            start_seconds = date_to_seconds(start_date)
            end_seconds = date_to_seconds(end_date)
            print(f"Filtering between {start_seconds} to {end_seconds} seconds")
            
            # Filter trajectory between dates
            filtered_trajectory = get_trajectory_between_dates(
                trajectory,
                start_date,
                end_date
            )
            print(f"After filtering: {len(filtered_trajectory)} points")
            
            # Add to the result dictionary
            all_trajectories[body.name] = filtered_trajectory
        
        return all_trajectories
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
