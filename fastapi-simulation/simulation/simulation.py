import numpy as np

# Constant in km^3/(kg·s^2)
G = 6.67430e-20

class Body:
    """
    Represents a celestial body with name, mass, 3D position, and 3D velocity.
    Also stores its trajectory over time in a list of 3-element arrays (optional).
    """
    def __init__(self, name: str, mass: float, position, velocity):
        self.name = name
        self.mass = mass
        self.position = np.array(position, dtype=float)  # in km
        self.velocity = np.array(velocity, dtype=float)  # in km/s
        # In-memory trajectory if you need it
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

def maneuver_rocket(name, maneuver_time, velocity_change):
    """
    Calculate the rocket trajectory after a maneuver while considering gravitational interactions.
    """
    # Placeholder to retrieve rocket's initial position and velocity from the database
    rocket_position = get_position_from_db(name, maneuver_time)
    rocket_velocity = get_velocity_from_db(name, maneuver_time)

    # Apply the maneuver (change in velocity)
    rocket_velocity += np.array(velocity_change)

    # Create the rocket body with updated velocity
    rocket = Body(name, 0, rocket_position, rocket_velocity)

    dt = 60  # time step in seconds (1 minute)
    steps = 525948  # One year of simulation with a minute timestep
    current_time = maneuver_time

    new_trajectory = {rocket.name: {}}

    for step in range(steps):
        # Fetch the current positions and velocities of all other bodies
        other_bodies = get_other_bodies_from_db(current_time)

        # Add the rocket to the list for calculation
        bodies = other_bodies + [rocket]

        # Calculate the gravitational accelerations
        accelerations = compute_accelerations(bodies)

        # Update the rocket's position using Verlet integration
        rocket.position += rocket.velocity * dt + 0.5 * accelerations[-1] * dt**2

        # Update rocket velocity after position update
        new_accelerations = compute_accelerations(bodies)
        rocket.velocity += 0.5 * (accelerations[-1] + new_accelerations[-1]) * dt

        # Update time and log the position
        current_time += dt
        new_trajectory[rocket.name][f"{current_time}"] = rocket.position.tolist()

    return new_trajectory

def nbody_simulation_verlet(bodies, dt, steps, snapshot_interval=52):
    """
    Runs an N-body simulation using Velocity Verlet integration.

    PARAMETERS:
      - bodies (list[Body]): The celestial bodies
      - dt (float): Timestep in seconds
      - steps (int): Number of integration steps
      - snapshot_interval (int): Only store the trajectory
        in the output dictionary once every 'snapshot_interval' steps.
        Also stores the final step for completeness.

    RETURN:
      A dictionary of the form:
        {
          "Earth": {
             "0.0": [x0, y0, z0],
             "1200000.0": [x1, y1, z1],
             ...
          },
          "Moon": {
             ...
          }
        }
      where each time is stored as a string key, and value is [x, y, z].
    """

    current_time = 0.0

    trajectories = {
        body.name: {f"{current_time}": body.position.tolist()}
        for body in bodies
    }

    accelerations = compute_accelerations(bodies)

    for step in range(1, steps + 1):
        for i, body in enumerate(bodies):
            body.position += body.velocity * dt + 0.5 * accelerations[i] * dt**2

        new_accelerations = compute_accelerations(bodies)

        for i, body in enumerate(bodies):
            body.velocity += 0.5 * (accelerations[i] + new_accelerations[i]) * dt

        current_time += dt

        if (step % snapshot_interval == 0) or (step == steps):
            for body in bodies:
                trajectories[body.name][f"{current_time}"] = body.position.tolist()

        accelerations = new_accelerations

    return trajectories
