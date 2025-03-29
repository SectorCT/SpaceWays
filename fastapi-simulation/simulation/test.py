import numpy as np
from simulation.simulation import Body, nbody_simulation_verlet

if __name__ == "__main__":
    earth = Body(
        name="Earth",
        mass=5.972e24,          # kg
        position=[0, 0, 0],     # km
        velocity=[0, 29.78, 0]  # km/s (approx Earth's orbital speed around Sun)
    )

    moon = Body(
        name="Moon",
        mass=7.34767309e22,      # kg
        position=[384400, 0, 0], # km
        velocity=[0, 1.022, 0]   # km/s
    )

    spacecraft = Body(
        name="Spacecraft",
        mass=1000,               # kg
        position=[400000, 0, 0], # km
        velocity=[0, 1.1, 0]     # km/s
    )

    sun = Body(
        name="Sun",
        mass=1.989e30,            # kg
        position=[149600000, 0, 0], # km (~1 AU)
        velocity=[0, 0, 0]          # km/s (assume stationary for simplicity)
    )

    bodies = [earth, moon, spacecraft, sun]

    # Simulation parameters
    dt = 60      # seconds per time step
    steps = 1000 # total number of steps

    # Run the simulation with Velocity Verlet
    trajectories = nbody_simulation_verlet(bodies, dt, steps)

    # Print final position of each body
    for body in bodies:
        final_pos = trajectories[body.name][-1]
        print(f"{body.name} final position: {final_pos}")
