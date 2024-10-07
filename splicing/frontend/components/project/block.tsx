import {
  Check,
  Cuboid,
  RotateCcw,
  Trash2,
  EllipsisVertical,
} from "lucide-react";
import { useState } from "react";
import CodeCell from "@/components/project/code-cell";
import DataPreview from "@/components/project/data-preview";
import ExecutionAlert from "@/components/project/execution-alert";
import CleaningSetupForm from "@/components/setup/cleaning-setup";
import MovementSetupForm from "@/components/setup/movement-setup";
import OrchestrationSetupForm from "@/components/setup/orchestration-setup";
import TransformationSetupForm from "@/components/setup/transformation-setup";
import { Block as BlockData, SectionType } from "@/components/types/section";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getGenerateResultName } from "@/lib/utils";
import useProjectStore from "@/store/project";

const sectionSetupComponents = {
  [SectionType.Movement]: MovementSetupForm,
  [SectionType.Cleaning]: CleaningSetupForm,
  [SectionType.Transformation]: TransformationSetupForm,
  [SectionType.Orchestration]: OrchestrationSetupForm,
};

interface BlockProps {
  blockData: BlockData;
}

const Block: React.FC<BlockProps> = ({ blockData }) => {
  const [reset, setReset] = useState<boolean>(false);
  const [getCurrentSection, setCurrentBlock, removeBlock, resetBlock] =
    useProjectStore((state) => [
      state.getCurrentSection,
      state.setCurrentBlock,
      state.removeBlock,
      state.resetBlock,
    ]);
  const currentSection = getCurrentSection();

  const SectionSetupForm = currentSection
    ? sectionSetupComponents[currentSection.sectionType]
    : undefined;

  const handleToggle = async (isPressed: boolean) => {
    if (isPressed) {
      await setCurrentBlock(blockData.id);
    } else {
      await setCurrentBlock(undefined);
    }
  };

  const handleReset = async () => {
    await resetBlock(blockData.id);
    setReset(true);
    setTimeout(() => setReset(false), 2000);
  };

  const handleDelete = async () => {
    await removeBlock(blockData.id);
    await setCurrentBlock(undefined);
  };

  return (
    <div className="grid gap-4 rounded-lg border p-4 shadow-sm w-full overflow-x-auto">
      <div className="flex items-center justify-between">
        <Toggle
          aria-label="Toggle current block"
          className="flex items-center gap-2"
          pressed={currentSection?.currentBlockId === blockData.id}
          onPressedChange={handleToggle}
        >
          <Cuboid className="h-4 w-4" />
          <span className="font-medium text-lg">
            {getGenerateResultName(blockData.generateResult)}
          </span>
        </Toggle>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleReset}
                >
                  {reset ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  <span className="sr-only">Reset</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Reset</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleDelete}
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete</TooltipContent>
            </Tooltip>
            <Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      className="rounded-full w-6 h-6"
                      size="icon"
                      variant="ghost"
                    >
                      <EllipsisVertical className="h-4 w-4" />
                      <span className="sr-only">Setup</span>
                    </Button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <PopoverContent
                  side="left"
                  align="start"
                  className="max-h-96 overflow-y-auto"
                >
                  {SectionSetupForm && (
                    <SectionSetupForm blockData={blockData} />
                  )}
                </PopoverContent>
              </Popover>
              <TooltipContent side="top">Setup</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto">
        <CodeCell blockData={blockData} />
        {blockData.data && Object.keys(blockData.data).length > 0 && (
          <DataPreview data={blockData.data} />
        )}
        {(blockData.executeResult?.error ||
          blockData.executeResult?.returnValue) && (
          <ExecutionAlert executeResult={blockData.executeResult} />
        )}
      </div>
    </div>
  );
};

export default Block;
