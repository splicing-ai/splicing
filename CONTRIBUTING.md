# Contributing
Thank you for your interest in contributing to Splicing! We welcome contributions from everyone—whether you're a data engineer, data scientist, or simply someone who loves using AI to build cool things.

## How Can I Contribute?
There are several ways you can contribute:

- **Download and try out Splicing**. If you run into any issues or have ideas for new features, feel free to open an issue to let us know.
- **Contribute to the codebase**: We welcome Pull Requests (PRs) for any improvements or features you'd like to add. You can also check out our [roadmap](README.md#roadmap) for inspiration if you're looking for ideas to work on.

## Set up the development environment
If you decide to contribute to Splicing by improving our codebase (which we greatly appreciate!), you can set up the development environment with or without Docker. A Docker Compose file will be provided soon.

1. Clone the source code (assume Git is installed):
```bash
git clone git@github.com:splicing-ai/splicing.git
cd splicing
```

2. (Optional) Checkout the specific release:
```bash
git checkout tags/...
```
If this step is skipped, the application will run on the main branch, which may include unreleased code. Or alternatively, you can checkout the latest release:
```bash
LATEST_TAG=$(git describe --tags `git rev-list --tags --max-count=1`)
git checkout $LATEST_TAG
```

3. Install and launch [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/):
```bash
mkdir .splicing
redis-server --dir .splicing
```

4. Setup and launch backend (assume Python>=3.9 is installed):
```bash
cd splicing/backend
pip install poetry
# also install extra dependencies if necesssary, e.g., --with dev,aws,duckdb
poetry install --with dev
poetry run uvicorn app.main:app --reload
```

5. Setup frontend and launch (assume [Node.js>=18.8](https://nodejs.org/en/download/package-manager) with npm is installed):
```bash
cd splicing/frontend
npm install 
npm run dev
```

6. If everything is set up fine, navigate to http://localhost:3000/ to access the web UI.
