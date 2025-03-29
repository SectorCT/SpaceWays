from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, conlist
from astropy import units as u
from poliastro.bodies import Earth
from poliastro.twobody import Orbit

app = FastAPI()

class OrbitInput(BaseModel):
    position: conlist(float, min_items=3, max_items=3)
    velocity: conlist(float, min_items=3, max_items=3)

@app.post("/compute_orbit/")
async def compute_orbit(data: OrbitInput):
    try:
        r = [data.position[0], data.position[1], data.position[2]] * u.km
        v = [data.velocity[0], data.velocity[1], data.velocity[2]] * u.km / u.s
        
        orbit = Orbit.from_vectors(Earth, r, v)
        
        orbit_data = {
            "semi_major_axis_km": orbit.a.to(u.km).value,
            "eccentricity": orbit.ecc.value,
            "inclination_deg": orbit.inc.to(u.deg).value,
            "raan_deg": orbit.raan.to(u.deg).value if orbit.raan is not None else None,
            "arg_periapsis_deg": orbit.argp.to(u.deg).value if orbit.argp is not None else None,
            "true_anomaly_deg": orbit.nu.to(u.deg).value,
        }
        return orbit_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
