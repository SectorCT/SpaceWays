import json
import numpy as np
from sqlalchemy import Column, Integer, Float, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class BodyDB(Base):
    """
    A SQLAlchemy model representing a celestial body in the database.
    Includes:
     - Basic info: ID, name, mass
     - Initial position/velocity
     - Final position (final_x, final_y, final_z)
     - A trajectory dictionary in JSON (trajectory_json)
    """
    __tablename__ = "bodies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    mass = Column(Float, nullable=False)

    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    position_z = Column(Float, nullable=False)

    velocity_x = Column(Float, nullable=False)
    velocity_y = Column(Float, nullable=False)
    velocity_z = Column(Float, nullable=False)

    final_x = Column(Float, nullable=True)
    final_y = Column(Float, nullable=True)
    final_z = Column(Float, nullable=True)

    trajectory_json = Column(Text, nullable=False, default=json.dumps({}))

    def __init__(self, name: str, mass: float,
                 init_position, init_velocity,
                 final_x=None, final_y=None, final_z=None):
        """
        Create a BodyDB row. We'll store initial position/velocity
        and, optionally, final position.
        """
        self.name = name
        self.mass = mass

        pos_arr = np.array(init_position, dtype=float)
        self.position_x = pos_arr[0]
        self.position_y = pos_arr[1]
        self.position_z = pos_arr[2]

        # Initial velocity
        vel_arr = np.array(init_velocity, dtype=float)
        self.velocity_x = vel_arr[0]
        self.velocity_y = vel_arr[1]
        self.velocity_z = vel_arr[2]

        self.final_x = final_x
        self.final_y = final_y
        self.final_z = final_z

        if not self.trajectory_json:
            self.trajectory_json = json.dumps({})

    def __repr__(self):
        return (
            f"<BodyDB {self.name}: mass={self.mass}, "
            f"init_pos=({self.position_x}, {self.position_y}, {self.position_z}), "
            f"init_vel=({self.velocity_x}, {self.velocity_y}, {self.velocity_z}), "
            f"final=({self.final_x}, {self.final_y}, {self.final_z})>"
        )

    def set_trajectory(self, traj_dict: dict):
        """Store entire trajectory as JSON."""
        self.trajectory_json = json.dumps(traj_dict)

    def get_trajectory(self):
        """Return the trajectory as a Python dict."""
        return json.loads(self.trajectory_json)
