from typing import Any

from pydantic import BaseModel

from app.utils.types import LLMType, Message, SectionType, SettingsSectionType


class MovementSetup(BaseModel):
    tool: str
    source: str
    sourceSectionId: str = ""
    sourceBlockId: str = ""
    sourceDetails: str = ""
    destination: str
    destinationDetails: str = ""


class CleaningSetup(BaseModel):
    source: str
    tool: str
    sourceSectionId: str = ""
    sourceBlockId: str = ""
    sourceDetails: str = ""
    provideRecommendation: bool = True


class TransformationSetup(BaseModel):
    source: str
    tool: str
    sourceSectionId: str = ""
    sourceBlockId: str = ""
    sourceDetails: str = ""
    provideRecommendation: bool = True


class OrchestrationSetup(BaseModel):
    tool: str
    description: str = ""


BlockSetup = MovementSetup | CleaningSetup | TransformationSetup | OrchestrationSetup


class MovementGenerateResult(BaseModel):
    functionName: str
    functionArgs: dict[str, Any]
    returnValue: str | None
    code: str
    packages: list[str] | None = None


class CleaningGenerateResult(BaseModel):
    functionName: str
    functionArgs: dict[str, Any]
    returnValue: str | None
    code: str
    packages: list[str] | None = None


class TransformationDbtGenerateResult(BaseModel):
    modelName: str
    model: str
    properties: str


class TransformationPythonGenerateResult(BaseModel):
    functionName: str
    functionArgs: dict[str, Any]
    returnValue: str | None
    code: str
    packages: list[str] | None = None


TransformationGenerateResult = (
    TransformationPythonGenerateResult | TransformationDbtGenerateResult
)


class OrchestrationGenerateResult(BaseModel):
    dagName: str
    code: str


GenerateResult = (
    MovementGenerateResult
    | CleaningGenerateResult
    | TransformationGenerateResult
    | OrchestrationGenerateResult
)


class ExecuteResult(BaseModel):
    returnValue: str | None
    error: str | None


class BlockMetadata(BaseModel):
    numRows: int


class BlockData(BaseModel):
    id: str
    numRows: int
    generateResult: GenerateResult | None = None
    data: dict[str, str] | None = None
    executeResult: ExecuteResult | None = None
    setup: BlockSetup | None = None


class SectionMetadata(BaseModel):
    title: str
    sectionType: SectionType


class SectionData(BaseModel):
    id: str
    title: str
    sectionType: SectionType
    blocks: list[BlockData]
    currentBlockId: str | None = None


class ConversationPayload(BaseModel):
    message: Message
    currentSectionId: str


class ProjectMetadata(BaseModel):
    id: str
    title: str
    createdOn: str
    modifiedOn: str
    llm: LLMType
    projectDir: str


class ProjectSetupPayload(BaseModel):
    title: str
    llm: LLMType
    projectDir: str = ""


class ProjectData(BaseModel):
    metadata: ProjectMetadata
    sections: list[SectionData]
    messages: list[Message]
    lastWorkedSectionId: str | None


class SettingsData(BaseModel):
    sectionType: SettingsSectionType
    key: str
    value: dict


class UpdateCodePayload(BaseModel):
    code: list[str]


class ExecuteReturn(BaseModel):
    data: dict[str, str]
    executeResult: ExecuteResult
    generateResult: GenerateResult | None
