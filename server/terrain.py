import rasterio
import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import sobel
import pyvista as pv
from affine import Affine

# -------------------------------
# 1. Load the Lunar DEM Data
# -------------------------------
dem_file = "lola.tif"
with rasterio.open(dem_file) as src:
    elevation = src.read(1)  # Read the first band as a 2D numpy array
    transform = src.transform  # Affine transform for georeferencing
    profile = src.profile  # DEM metadata

# -------------------------------
# 2. Compute the Slope of the Terrain
# -------------------------------
# Use Sobel filters to approximate the gradient along x and y directions
dzdx = sobel(elevation, axis=1)  # Gradient in the x-direction
dzdy = sobel(elevation, axis=0)  # Gradient in the y-direction

# Compute the overall gradient magnitude
gradient = np.sqrt(dzdx**2 + dzdy**2)

# Convert gradient to slope in radians then degrees
slope_rad = np.arctan(gradient)
slope_deg = np.degrees(slope_rad)

# -------------------------------
# 3. Define Safe Landing Zones
# -------------------------------
# Define the maximum safe slope (in degrees) for landing; adjust as needed.
max_slope = 5  # e.g., landing may require slopes below 5°
safe_zone = slope_deg < max_slope

# -------------------------------
# 4. Visualize the Safe Zones (2D)
# -------------------------------
plt.figure(figsize=(10, 8))
plt.imshow(safe_zone, cmap='Greens', origin='upper')
plt.title("Potential Safe Landing Zones on the Moon")
plt.xlabel("Pixel Column")
plt.ylabel("Pixel Row")
plt.colorbar(label="Safe Zone (1=True, 0=False)")
plt.show()

# -------------------------------
# 5. 3D Visualization of Terrain with Safe Zones
# -------------------------------
# Create a grid for 3D plotting. Here, pixel coordinates are used,
# but you can transform these to geographic coordinates if desired.
height, width = elevation.shape
x = np.arange(width)
y = np.arange(height)
x, y = np.meshgrid(x, y)

# Create a PyVista StructuredGrid
grid = pv.StructuredGrid(x, y, elevation)
# Add the safe zone data as a scalar field for visualization
grid["Safe"] = safe_zone.astype(np.uint8)

# Plot the 3D terrain, coloring by the safe zone mask.
grid.plot(scalars="Safe", cmap="viridis", show_edges=True, 
          title="3D Terrain with Safe Landing Zones")

# -------------------------------
# 6. Extract and Print Safe Zone Geographic Coordinates
# -------------------------------
# Get indices where the safe zone condition is True
safe_indices = np.column_stack(np.where(safe_zone))

# Convert pixel indices to geographic coordinates using the DEM transform.
safe_coords = [transform * (col, row) for row, col in safe_indices]

# Display a few sample coordinates (first 10)
print("Sample safe coordinates (first 10):")
for coord in safe_coords[:10]:
    print(coord)

