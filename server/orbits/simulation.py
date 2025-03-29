import numpy as np
from .models import BodyModel
import json

from datetime import datetime, timedelta
from .utils import date_to_seconds

# Physical constants
G = 6.67430e-20  # km^3/(kg·s^2)

# Simulation constants
TIME_STEP = 60.0  # seconds
QUARTERS_TO_SIMULATE = 4  # number of 3-month periods to simulate
STEPS_PER_QUARTER = int(90 * 24 * 60 * 60 / TIME_STEP)  # steps for 3 months (90 days)
SNAPSHOT_INTERVAL = 52

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

def nbody_simulation_verlet(bodies, dt=TIME_STEP, steps=STEPS_PER_QUARTER, snapshot_interval=SNAPSHOT_INTERVAL, save_final=True, start_time=None):
    """
    bodies: list of BodyModel
    dt: time step in seconds (default: TIME_STEP)
    steps: number of simulation steps (default: STEPS_PER_QUARTER)
    snapshot_interval: interval between trajectory snapshots (default: SNAPSHOT_INTERVAL)
    save_final: if True, updates the DB after finishing
    start_time: The time to start the simulation from (in seconds from reference date)
    """
    current_time = start_time if start_time is not None else 0.0
    print(f"Starting simulation at time {current_time}")

    # Initialize trajectories from history if available
    trajectories = {}
    for body in bodies:
        if body.trajectory_json:
            trajectories[body.name] = json.loads(body.trajectory_json)
        else:
            trajectories[body.name] = {f"{current_time}": body.position.tolist()}
    print(f"Initial trajectories: {trajectories}")

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
        print("Saving final trajectories to database")
        for body in bodies:
            print(f"Saving trajectory for {body.name}: {trajectories[body.name]}")
            body.set_trajectory(trajectories[body.name])
            body.save()

    return trajectories 

def simulate_quarters(bodies, start_time=0.0):
    """
    Simulate multiple quarters (3-month periods) in sequence.
    Each quarter starts from the end state of the previous quarter.
    
    Args:
        bodies: list of BodyModel objects
        start_time: starting time in seconds
    
    Returns:
        dict: Combined trajectories from all quarters
    """
    all_trajectories = {}
    current_time = start_time
    
    # Initialize trajectories
    for body in bodies:
        all_trajectories[body.name] = {}
    
    # Run simulation for each quarter
    for quarter in range(QUARTERS_TO_SIMULATE):
        trajectories = nbody_simulation_verlet(
            bodies=bodies,
            dt=TIME_STEP,
            steps=STEPS_PER_QUARTER,
            snapshot_interval=SNAPSHOT_INTERVAL,
            save_final=True,
            start_time=current_time
        )
        
        # Merge trajectories
        for body_name, body_traj in trajectories.items():
            all_trajectories[body_name].update(body_traj)
        
        # Update current_time to the last timestamp
        if trajectories and any(trajectories.values()):
            # Get the maximum timestamp from any body's trajectory
            max_time = max(
                max(float(t) for t in body_traj.keys())
                for body_traj in trajectories.values()
                if body_traj
            )
            current_time = max_time
    
    return all_trajectories 