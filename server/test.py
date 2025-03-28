from astropy import units as u
from poliastro.bodies import Earth
from poliastro.twobody import Orbit

r_moon = [384400, 0, 0] * u.km          # Position vector: 384,400 km along the x-axis
v_moon = [0, 1.022, 0] * u.km / u.s       # Velocity vector: ~1.022 km/s along the y-axis

# Create the Moon's orbit around Earth using these state vectors.
moon_orbit = Orbit.from_vectors(Earth, r_moon, v_moon)

# Print the orbit to see its parameters (semi-major axis, eccentricity, etc.)
print(moon_orbit)