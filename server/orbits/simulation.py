import numpy as np
from .models import BodyModel

G = 6.67430e-20  # km^3/(kg·s^2)

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

def apply_maneuver(body: BodyModel, delta_velocity: np.ndarray):
    """
    Apply a velocity change (maneuver) to a body.
    
    Args:
        body: The body to apply the maneuver to
        delta_velocity: The velocity change vector in km/s
    """
    current_velocity = body.velocity
    new_velocity = current_velocity + delta_velocity
    body.velocity = new_velocity
    body.save()
    return body

def nbody_simulation_verlet(bodies, dt, steps, snapshot_interval=20000, save_final=True):
    """
    bodies: list of BodyModel
    dt, steps, snapshot_interval: same as before
    save_final: if True, updates the DB after finishing
    """
    current_time = 0.0

    trajectories = {
        b.name: {f"{current_time}": b.position.tolist()}
        for b in bodies
    }

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