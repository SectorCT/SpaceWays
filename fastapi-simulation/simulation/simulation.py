import numpy as np

# Constant in km^3/(kg·s^2)
G = 6.67430e-20

class Body:
    """
    Represents a celestial body with name, mass, 3D position, and 3D velocity.
    Also stores its trajectory over time in a list of 3-element arrays.
    """
    def __init__(self, name: str, mass: float, position, velocity):
        self.name = name
        self.mass = mass
        self.position = np.array(position, dtype=float)  # in km
        self.velocity = np.array(velocity, dtype=float)  # in km/s
        self.trajectory = [self.position.copy()]

    def __repr__(self):
        return (f"<Body {self.name}: mass={self.mass}, "
                f"position={self.position}, velocity={self.velocity}>")

def compute_accelerations(bodies):
    """
    Compute the gravitational acceleration on each body due to every other body.
    """
    n = len(bodies)
    accelerations = [np.zeros(3) for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i != j:
                r_ij = bodies[j].position - bodies[i].position
                distance = np.linalg.norm(r_ij)
                if distance > 0:
                    accelerations[i] += G * bodies[j].mass * r_ij / distance**3

    return accelerations

def nbody_simulation_verlet(bodies, dt, steps):
    """
    Run an N-body simulation using Velocity Verlet integration,
    returning a dict: { body_name: { "t0": [x,y,z], "t1": [x,y,z], ... }, ... }.
    """
    current_time = 0.0

    trajectories = {
        body.name: {f"{current_time}": body.position.copy().tolist()}
        for body in bodies
    }

    accelerations = compute_accelerations(bodies)

    for _ in range(steps):
        for i, body in enumerate(bodies):
            body.position += body.velocity * dt + 0.5 * accelerations[i] * dt**2

        new_accelerations = compute_accelerations(bodies)

        for i, body in enumerate(bodies):
            body.velocity += 0.5 * (accelerations[i] + new_accelerations[i]) * dt

        current_time += dt

        for body in bodies:
            trajectories[body.name][f"{current_time}"] = body.position.tolist()

        accelerations = new_accelerations

    return trajectories
