from app.generated.schema import (
    CleaningGenerateResult,
    CleaningSetup,
    IntegrationType,
    LLMType,
    MovementGenerateResult,
    MovementSetup,
    OrchestrationGenerateResult,
    OrchestrationSetup,
    TransformationDbtGenerateResult,
    TransformationPythonGenerateResult,
    TransformationSetup,
)

TransformationGenerateResult = (
    TransformationDbtGenerateResult | TransformationPythonGenerateResult
)

GenerateResult = (
    MovementGenerateResult
    | CleaningGenerateResult
    | TransformationGenerateResult
    | OrchestrationGenerateResult
)

BlockSetup = MovementSetup | CleaningSetup | TransformationSetup | OrchestrationSetup

SettingsKey = IntegrationType | LLMType
