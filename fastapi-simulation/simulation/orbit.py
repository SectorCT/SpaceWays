# simulation/orbit.py
from astropy import units as u
from poliastro.bodies import Earth
from poliastro.twobody import Orbit

def compute_orbit_from_state(position, velocity):
    """
    Computes the orbit parameters from the provided state vectors.
    
    Parameters:
    - position: list of 3 numbers (in km)
    - velocity: list of 3 numbers (in km/s)
    
    Returns:
    A dictionary of orbital parameters.
    """
    # Convert the input lists to astropy Quantity objects with appropriate units.
    r = [position[0], position[1], position[2]] * u.km
    v = [velocity[0], velocity[1], velocity[2]] * u.km / u.s
    
    # Create the orbit using Earth's gravitational parameter.
    orbit = Orbit.from_vectors(Earth, r, v)
    
    # Extract key orbital parameters.
    orbit_data = {
        "semi_major_axis_km": orbit.a.to(u.km).value,
        "eccentricity": orbit.ecc.value,
        "inclination_deg": orbit.inc.to(u.deg).value,
        "raan_deg": orbit.raan.to(u.deg).value if orbit.raan is not None else None,
        "arg_periapsis_deg": orbit.argp.to(u.deg).value if orbit.argp is not None else None,
        "true_anomaly_deg": orbit.nu.to(u.deg).value,
    }
    return orbit_data
