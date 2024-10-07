# Use an image that includes both Python and Node.js
FROM nikolaik/python-nodejs:python3.11-nodejs20

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y redis-server && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry

# Copy Poetry files and install Python dependencies
COPY pyproject.toml poetry.lock /app/
RUN poetry config virtualenvs.create false && poetry install --with aws,duckdb,gcp --without dev

# Copy frontend files
COPY ./splicing/frontend /app/frontend

# Install frontend dependencies
RUN npm ci --prefix=/app/frontend && npm cache clean --force

# Build the frontend
RUN npm run build --prefix=/app/frontend

# Copy backend files
COPY ./splicing/backend /app/backend

# Create the persistent directory
RUN mkdir -p /.splicing

# Set up volume for persistent data
VOLUME /.splicing

# Copy the entrypoint script
COPY ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port for frontend (3000) and backend (8000)
EXPOSE 3000 8000

# Use the entrypoint script to manage start-up processes
ENTRYPOINT ["/app/entrypoint.sh"]
