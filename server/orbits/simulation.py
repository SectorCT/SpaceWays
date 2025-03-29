import numpy as np
from .models import BodyModel
import json

from datetime import datetime, timedelta
from .utils import date_to_seconds

# Physical constants
G = 6.67430e-20  # km^3/(kg·s^2)

# Simulation constants
TIME_STEP = 60.0  # seconds
SIMULATION_STEPS = 525949
SNAPSHOT_INTERVAL = 100

def compute_accelerations(bodies):
    n = len(bodies)
    accelerations = [np.zeros(3) for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i != j:
                r_ij = bodies[j].position - bodies[i].position
                dist = np.linalg.norm(r_ij)
                if dist > 0:
                    accelerations[i] += G * bodies[j].mass * r_ij / dist**3

    return accelerations

def get_last_state(body: BodyModel):
    """
    Get the last known state from the trajectory history.
    Returns (position, velocity, time) or None if no history exists.
    """
    if not body.trajectory_json:
        return None
    
    trajectory = json.loads(body.trajectory_json)
    if not trajectory:
        return None
    
    # Get the last timestamp and position
    last_time = max(float(t) for t in trajectory.keys())
    last_position = trajectory[str(last_time)]
    
    # Estimate velocity from last two positions if available
    times = sorted(float(t) for t in trajectory.keys())
    if len(times) >= 2:
        last_two_times = times[-2:]
        last_two_positions = [trajectory[str(t)] for t in last_two_times]
        dt = last_two_times[1] - last_two_times[0]
        velocity = (np.array(last_two_positions[1]) - np.array(last_two_positions[0])) / dt
    else:
        velocity = body.velocity  # Use current velocity if can't estimate from history
    
    return np.array(last_position), velocity, last_time

def apply_maneuver(body: BodyModel, delta_velocity: np.ndarray, simulation_time: float = None):
    """
    Apply a velocity change (maneuver) to a body.
    
    Args:
        body: The body to apply the maneuver to
        delta_velocity: The velocity change vector in km/s
        simulation_time: The time at which to apply the maneuver (if None, use current state)
    """
    if simulation_time is not None:
        # Get the state at the specified time from history
        last_state = get_last_state(body)
        if last_state is not None:
            position, velocity, last_time = last_state
            # Update body with historical state
            body.position = position
            body.velocity = velocity
            body.save()
    
    # Apply the maneuver
    current_velocity = body.velocity
    new_velocity = current_velocity + delta_velocity
    body.velocity = new_velocity
    body.save()
    return body

def get_state_at_time(body: BodyModel, target_time: float) -> tuple:
    """
    Get the state (position and velocity) of a body at a specific time.
    If the exact time is not found, interpolate between the closest available states.
    
    Args:
        body: The body to get state for
        target_time: The time to get state at (in seconds from reference date)
        
    Returns:
        tuple: (position, velocity) at the target time
    """
    if not body.trajectory_json:
        return body.position, body.velocity
        
    trajectory = json.loads(body.trajectory_json)
    if not trajectory:
        return body.position, body.velocity
        
    # Convert all timestamps to floats and sort them
    times = sorted(float(t) for t in trajectory.keys())
    
    # Find the closest times before and after target_time
    before_time = None
    after_time = None
    for t in times:
        if t <= target_time:
            before_time = t
        else:
            after_time = t
            break
    
    if before_time is None:
        # Target time is before first recorded state
        first_time = times[0]
        return np.array(trajectory[str(first_time)]), body.velocity
    elif after_time is None:
        # Target time is after last recorded state
        last_time = times[-1]
        return np.array(trajectory[str(last_time)]), body.velocity
    else:
        # Interpolate between states
        before_pos = np.array(trajectory[str(before_time)])
        after_pos = np.array(trajectory[str(after_time)])
        
        # Linear interpolation
        alpha = (target_time - before_time) / (after_time - before_time)
        interpolated_pos = before_pos + alpha * (after_pos - before_pos)
        
        # Estimate velocity from the two positions
        velocity = (after_pos - before_pos) / (after_time - before_time)
        
        return interpolated_pos, velocity

def nbody_simulation_verlet(bodies, dt=TIME_STEP, steps=SIMULATION_STEPS, snapshot_interval=SNAPSHOT_INTERVAL, save_final=True, start_time=None):
    """
    bodies: list of BodyModel
    dt: time step in seconds (default: TIME_STEP)
    steps: number of simulation steps (default: SIMULATION_STEPS)
    snapshot_interval: interval between trajectory snapshots (default: SNAPSHOT_INTERVAL)
    save_final: if True, updates the DB after finishing
    start_time: The time to start the simulation from (in seconds from reference date)
    """
    current_time = start_time if start_time is not None else 0.0

    # Initialize trajectories from history if available
    trajectories = {}
    for body in bodies:
        if body.trajectory_json:
            trajectories[body.name] = json.loads(body.trajectory_json)
        else:
            trajectories[body.name] = {f"{current_time}": body.position.tolist()}

    # If start_time is provided, get the state at that time for each body
    if start_time is not None:
        for body in bodies:
            position, velocity = get_state_at_time(body, start_time)
            body.position = position
            body.velocity = velocity
            body.save()

    accelerations = compute_accelerations(bodies)

    for step in range(1, steps+1):
        for i, body in enumerate(bodies):
            body.position = body.position + body.velocity * dt + 0.5 * accelerations[i] * dt**2

        new_acc = compute_accelerations(bodies)

        for i, body in enumerate(bodies):
            body.velocity = body.velocity + 0.5 * (accelerations[i] + new_acc[i]) * dt

        current_time += dt

        if (step % snapshot_interval == 0) or (step == steps):
            for body in bodies:
                trajectories[body.name][f"{current_time}"] = body.position.tolist()

        accelerations = new_acc

    if save_final:
        for body in bodies:
            body.set_trajectory(trajectories[body.name])
            body.save()

    return trajectories 

def simulate_year_in_chunks(bodies_data, start_date="2010-01-01"):
    """
    Simulate a full year in 3-month chunks, starting from a given date.
    
    Args:
        bodies_data: List of dictionaries containing body data
        start_date: Starting date in YYYY-MM-DD format
    """

    
    # Convert start date to seconds
    start_seconds = date_to_seconds(start_date)
    
    # Calculate number of steps for 3 months (90 days)
    steps_per_quarter = int(90 * 24 * 60 * 60 / TIME_STEP)  # 90 days in seconds / time step
    
    # Run simulation for each quarter
    for quarter in range(1):
        quarter_start = start_seconds + (quarter * 90 * 24 * 60 * 60)
        
        # Save initial bodies data
        body_objs = []
        for b in bodies_data:
            body_model = BodyModel.objects.filter(name=b["name"]).first()
            if body_model is None:
                body_model = BodyModel(name=b["name"])
            
            body_model.mass = b["mass"]
            body_model.position = b["position"]
            body_model.velocity = b["velocity"]
            body_model.save()
            body_objs.append(body_model)
        
        # Run simulation for this quarter
        trajectories = nbody_simulation_verlet(
            bodies=body_objs,
            steps=steps_per_quarter,
            start_time=quarter_start,
            save_final=True
        )
        
        # Update bodies_data with final positions and velocities for next quarter
        for i, body in enumerate(body_objs):
            bodies_data[i]["position"] = body.position.tolist()
            bodies_data[i]["velocity"] = body.velocity.tolist()
    
    return trajectories 