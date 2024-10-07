import { Plus } from "lucide-react";
import Block from "@/components/project/block";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProjectStore from "@/store/project";

const Notebook = () => {
  const [getCurrentSection, addBlock] = useProjectStore((state) => [
    state.getCurrentSection,
    state.addBlock,
  ]);
  const currentSection = getCurrentSection();
  const blocks = currentSection?.blocks;

  return (
    <div className="flex flex-col items-center gap-4 h-full overflow-y-auto">
      <div className="w-full space-y-4">
        {blocks &&
          blocks.map((block) => <Block key={block.id} blockData={block} />)}
      </div>
      {currentSection && (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={addBlock}
                  size="icon"
                  variant="secondary"
                  className="rounded-full h-9 w-9 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="w-5 h-5" />
                  <span className="sr-only">New Block</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Add a new block</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default Notebook;
