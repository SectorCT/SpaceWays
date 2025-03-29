import numpy as np
from django.db import models
import json

class BodyModel(models.Model):
    """
    Stores a celestial body's data in the database.
    Each position/velocity component is stored separately (x,y,z),
    rather than a single array field.
    """

    name = models.CharField(max_length=100, unique=True)
    mass = models.FloatField()

    # Position in km
    position_x = models.FloatField()
    position_y = models.FloatField()
    position_z = models.FloatField()

    # Velocity in km/s
    velocity_x = models.FloatField()
    velocity_y = models.FloatField()
    velocity_z = models.FloatField()

    trajectory_json = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} (mass={self.mass})"


    @property
    def position(self) -> np.ndarray:
        return np.array([self.position_x, self.position_y, self.position_z], dtype=float)

    @position.setter
    def position(self, pos):
        pos = np.array(pos, dtype=float)
        self.position_x = float(pos[0])
        self.position_y = float(pos[1])
        self.position_z = float(pos[2])

    @property
    def velocity(self) -> np.ndarray:
        return np.array([self.velocity_x, self.velocity_y, self.velocity_z], dtype=float)

    @velocity.setter
    def velocity(self, vel):
        vel = np.array(vel, dtype=float)
        self.velocity_x = float(vel[0])
        self.velocity_y = float(vel[1])
        self.velocity_z = float(vel[2])

    def set_trajectory(self, trajectory_dict: dict):
        """
        Example if you want to store the entire time-snapshots in JSON form.
        """
        self.trajectory_json = json.dumps(trajectory_dict)

    def get_trajectory(self) -> dict:
        if not self.trajectory_json:
            return {}
        return json.loads(self.trajectory_json)
