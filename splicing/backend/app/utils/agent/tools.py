from typing import TYPE_CHECKING

from langchain_core.runnables.config import RunnableConfig
from langchain_core.tools import BaseTool

from app.generated.schema import SectionType
from app.utils.types import GenerateResult

if TYPE_CHECKING:
    from app.utils.redis_client import RedisClient


CODE_GENERATOR_NAME = "generate_code"


class CodeGenerator(BaseTool):
    name: str = CODE_GENERATOR_NAME
    description: str = "Generates code for performing data engineering tasks"

    class Config:
        extra = "allow"

    def __init__(
        self, redis_client: "RedisClient", section_type: SectionType | None = None
    ) -> None:
        super().__init__(redis_client=redis_client)
        self.redis_client = redis_client
        self.description = f"Generates code for performing data {section_type.value.lower() if section_type else 'engineering'} tasks"

    def _run(
        self,
        config: RunnableConfig,
    ) -> GenerateResult:
        raise NotImplementedError

    async def _arun(
        self,
        config: RunnableConfig,
    ) -> GenerateResult:
        from app.api.endpoints.block import generate_code

        project_id = config["configurable"]["thread_id"]
        section_id = config["configurable"]["section_id"]
        block_id = config["configurable"]["block_id"]
        result = await generate_code(
            project_id, section_id, block_id, self.redis_client, called_from_agent=True
        )
        return result


def create_tools(
    redis_client: "RedisClient", section_type: SectionType | None = None
) -> list[BaseTool]:
    return [CodeGenerator(redis_client, section_type)]
