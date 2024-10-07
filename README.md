<div align="center">
  <img src="./docs/assets/images/logo.jpg" alt="Splicing" width="300"/>
</div>

<h2 align="center">Open-Source AI Copilot for Effortless Data Pipeline Building</h2>

<p align="center">
  <a href="https://github.com/splicing-ai/splicing">
    <img src="https://img.shields.io/badge/GitHub-splicing-blue?style=for-the-badge&logo=github" alt="GitHub">
  </a>
  <a href="https://github.com/splicing-ai/splicing/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT">
  </a>
  <a href="https://splicing-ai.github.io/splicing">
    <img src="https://img.shields.io/badge/documentation-splicing.ai-orange?style=for-the-badge" alt="Documentation">
  </a>
  <a href="https://discord.gg/WQ2GXmm4">
    <img src="https://img.shields.io/badge/Discord-Join%20Chat-purple?style=for-the-badge&logo=discord" alt="Join Discord Chat">
  </a>
</p>

## 🔑 Key Features
- **Notebook-style interface with chat capabilities in a web UI**: Work on your data pipelines in a familiar Jupyter notebook interface, while the AI copilot assists and guides you by generating, executing, and debugging data engineering code throughout the process. 
- **No vendor lock-in**: Build your data pipelines with any data stack of your choice, and select the LLM you prefer for your copilot, with full flexibility.
- **Fully customizable**: Break down your pipeline into multiple components—such as data movement, transformation, and more—and tailor each component to your specific needs. Splicing then seamlessly assembles these components into a complete, functional data pipeline.
- **Secure and manageable**: Host Splicing on your own infrastructure, with full control over your data and LLMs. Your data and secret keys are never shared with LLM providers at any time.

## ⚡ Quick Start
The easiest way to run Splicing is in Docker:

1. Install [Docker](https://docs.docker.com/engine/install/). 

2. Run the following command to run Splicing:
```bash
docker run -v $(pwd)/.splicing:/.splicing \
  -p 3000:3000 \
  -p 8000:8000 \
  -it --rm splicingai/splicing:latest
```
By default, all application data is stored in the `./.splicing` folder within the current directory where you run the above command. If you want to persist the data, make sure to back up this folder.

3. Navigate to http://localhost:3000/ to access the web UI.

You can also install Splicing without Docker for development by following the instructions in the [CONTRIBUTING](CONTRIBUTING.md#set-up-the-development-environment) guide.

## 🗺️ Roadmap
- **Data pipeline deployment**: Support deploying data pipelines to your production environments with a push-to-deploy experience.
- **More data pipeline components**: Support for more essential components in data pipelines, such as data quality checks and data lineage.
- **More integrations**: 
  + Support for a wide range of data integrations in data pipelines (e.g., various data sources and warehouses). 
  + Support more LLMs as copilots (e.g., Claude and local models). 
  + Streamline source code structure, making it easier for the community to add integrations.
- **Smarter copilot**: Enhance the copilot with more capabilities, such as automatically generating semantic models and ER diagrams for data in warehouses, making it easier to build data pipelines.

## 📂 Resources
- [Documentation](https://splicing-ai.github.io/splicing)
- [Demo](https://youtu.be/EaVopzAGszY)
- [Community](https://discord.gg/WQ2GXmm4)

## 🛠️ Tech Stacks
- Frontend: [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/) and [Shadcn](https://ui.shadcn.com/)
- Backend: [FastAPI](https://fastapi.tiangolo.com/) and [Redis](https://redis.io/)
- Agentic framework: [LangGraph](https://langchain-ai.github.io/langgraph/)

## 🤝 Contributing
Please refer to [CONTRIBUTING.md](CONTRIBUTING.md) for more details.
