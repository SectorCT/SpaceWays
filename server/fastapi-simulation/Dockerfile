FROM python:3.10-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set up Python path to include the project root
ENV PYTHONPATH="/app"

EXPOSE 8000

# Use uvicorn with reload mode for development
CMD ["sh", "-c", "cd /app && uvicorn fastapi-simulation.main:app --host 0.0.0.0 --port 8000 --reload"]
