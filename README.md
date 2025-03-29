## Space Waze

Space Waze is an accessible, learner-friendly 3D space simulator, that allows users to visialize orbiting objects and their gravitational influence on each other. It also supports visualization and logic for space vessles that can change their course. 

## Documentation 

# Frontend

The frontend is built with React and TypeScript, providing a modern and responsive user interface for space simulation visualization. Key features include:

1. 3D Visualization:
   - Interactive 3D scene using Three.js
   - Real-time orbit visualization
   - Camera controls for exploring the simulation
   - Object selection and information display

2. User Interface:
   - Clean, intuitive design
   - Real-time simulation controls
   - Object property editors
   - Trajectory visualization options

3. Technologies:
   - React with TypeScript for type safety
   - Three.js for 3D rendering
   - Vite for fast development and building
   - Jest for testing

# Backend

1. Algorithm:
   Our simulation uses an N-body algorithm. This means that we can calculate the gravitational influence of N objects on each other. This matters because, normally, people can compute two-body or three-body algorithms on paper, but it becomes unmanageable pretty fast once you start adding more bodies into your simulations. Our algorithm allows us to make these complex calculations and generate huge datasets, but hundres of thousands of times per simulation.
   This is how all this works: 
   - We start with a specified position and mass for each body in the simulation.
   - We then define the equation for the Gravitational Force -[G], between two given objects using each of their masses and the distance between them. We do this so we can use it in other equations.
   - Then, we define the equation for the acceleration on one body due to another using G, mass and distance between the objects.
   - Now we need to sum the effect of all objects on the acceleration of object i.
   - Fianlly, we use a Velocity Verlet Integration to calculate the position and velocity of each object using the accelaration. We choose to do this method becuase it remains stable over a longer time.
   We repeat this algorithm for every body once every 60 seconds of the simulation to accurately calculate the orbits of the objects. 
2. Data set:
   We save the trajectories we calculated into a database so we can access them in our frontend without needing to send millions of lines of a data set over HTTP requests alone.
   This also allows us to retain information about the past trajectories of each object so we can use them in calculations for maneuvers. 
   We use PostreSQL for this.
3. Frameworks:
   - We use Django to connect to the database
   - We use FastAPI to create endpoints and quickly adress requests from the frontend. 

## Running with Docker

The project uses Docker Compose to manage multiple services. Here's how to run it:

1. Prerequisites:
   - Docker installed on your system
   - Docker Compose installed on your system

2. Starting the Services:
   ```bash
   cd server
   docker-compose up --build
   ```
   This will start:
   - PostgreSQL database on port 5432
   - Django backend on port 8000
   - FastAPI simulation service on port 8001

3. Frontend Development:
   ```bash
   cd Client
   npm install
   npm run dev
   ```
   The frontend will be available at http://localhost:5173

4. Environment Variables:
   The following environment variables are used in the Docker setup:
   - `DB_NAME`: myprojectdb
   - `DB_USER`: myprojectuser
   - `DB_PASSWORD`: yourpassword
   - `DB_HOST`: db
   - `DB_PORT`: 5432

5. Stopping the Services:
   ```bash
   docker-compose down
   ```
