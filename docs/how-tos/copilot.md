# Getting Assistance from Copilot
Splicing Copilot is a chat interface powered by Splicing's agentic system, designed to assist you in building data pipelines using natural language. You can choose the [LLMs](integration-llm.md#llms) that power Splicing Copilot, tailoring it to your preferences.

## General Data Engineering Questions
Similar to ChatGPT, you can ask Splicing Copilot general data engineering questions regarding to your data pipelines, such as "What is the difference between ETL and ELT?" or "What is the best way to transform data in Snowflake?".

## Recommendation
After setting up a block in the data cleaning or data transformation section, Splicing Copilot will automatically recommend cleaning or transformation techniques based on your data's metadata (e.g., joining two tables on a common column). You can then select the most suitable techniques and ask Splicing Copilot to generate the corresponding code for you.

## Code Generation
You can also ask Splicing Copilot to generate code for your requested data engineering tasks in the [current block](notebook.md#setting-current-block). For example, you might ask, "Remove all rows with null values in the age column". Splicing Copilot will *always* confirm with you before generating any code (e.g., see [this example](notebook.md#confirm-code-generation)).

## Debugging
If your code doesn't work as expected and shows errors after execution, you can ask Splicing Copilot to help debug. Simply ask questions like "Why isn't the code working?" or "Can you fix it for me?". Splicing Copilot will analyze the error based on the current context, provide a detailed explanation, and confirm with you before generating new code to resolve the issue.
