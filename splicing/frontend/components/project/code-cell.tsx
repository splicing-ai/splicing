"use client";

import { CodeXml, Play, Copy, Check, Save, WandSparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { highlight, languages } from "prismjs";
import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/themes/prism.css";
import {
  Block as BlockData,
  SectionType,
  TransformationTool,
} from "@/components/types/section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import useProjectStore from "@/store/project";

interface CodeEditorProps {
  code: string;
  setCode: (newCode: string) => void;
  language: string;
}

interface CodeCellProps {
  blockData: BlockData;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, language }) => {
  const { theme } = useTheme();

  return (
    <div className="editor-wrapper">
      <Editor
        value={code}
        onValueChange={(code) => setCode(code)}
        highlight={(code) =>
          highlight(code, languages[language.toLowerCase()], language)
            .split("\n")
            .map(
              (line, i) =>
                `<span class='editorLineNumber'>${i + 1}</span>${line}`,
            )
            .join("\n")
        }
        padding={10}
        textareaId="codeArea"
        className={`editor ${theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
        style={{
          fontFamily: '"Fira code", "Fira Mono", monospace',
          fontSize: 12,
        }}
      />
    </div>
  );
};

const CodeCell: React.FC<CodeCellProps> = ({ blockData }) => {
  const [getCurrentSection, addGenerateResult, addExecuteResult, saveCode] =
    useProjectStore((state) => [
      state.getCurrentSection,
      state.addGenerateResult,
      state.addExecuteResult,
      state.saveCode,
    ]);
  const currentSection = getCurrentSection();
  const { toast } = useToast();
  let language = ["plaintext"];
  let tool;
  let useDbt = false;
  if (blockData.setup) {
    if ("tool" in blockData.setup) {
      if (blockData.setup.tool === TransformationTool.DBT) {
        useDbt = true;
        language = ["SQL", "YAML"];
      } else {
        language = ["Python"];
      }
      tool = blockData.setup.tool;
    } else {
      language = ["Python"];
    }
  }

  const [copied, setCopied] = useState<boolean>(false);
  const [displayCode, setDisplayCode] = useState<string[]>([""]);
  const [tab, setTab] = useState<string>("model");

  const handleGenerate = async () => {
    if (blockData.setup) {
      await addGenerateResult(blockData.id);
      toast({
        title: "Code generated successfully!",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Complete block setup before generating any code!",
      });
    }
  };

  const handleExecute = async () => {
    if (currentSection?.sectionType === SectionType.Orchestration) {
      toast({
        variant: "destructive",
        title:
          "Running and deploying orchestration code is not supported yet but on our roadmap!",
      });
    } else {
      if (displayCode.every((code) => code.trim() !== "")) {
        let code = undefined;
        if (blockData.generateResult) {
          if ("modelName" in blockData.generateResult) {
            if (
              blockData.generateResult.model !== displayCode[0] ||
              blockData.generateResult.properties !== displayCode[1]
            ) {
              code = displayCode;
            }
          } else {
            if (blockData.generateResult.code !== displayCode[0]) {
              code = displayCode;
            }
          }
        }
        const success = await addExecuteResult(blockData.id, code);
        if (success) {
          toast({
            title: "Code executed successfully!",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Code execution failed!",
          });
        }
      }
    }
  };

  const handleSave = async () => {
    if (blockData.generateResult) {
      if ("modelName" in blockData.generateResult) {
        if (
          blockData.generateResult.model !== displayCode[0] ||
          blockData.generateResult.properties !== displayCode[1]
        ) {
          await saveCode(blockData.id, displayCode);
        }
      } else {
        if (blockData.generateResult.code !== displayCode[0]) {
          await saveCode(blockData.id, displayCode);
        }
      }
    }
    toast({
      title: "Code saved successfully!",
    });
  };

  const handleCopy = async () => {
    const code = tab && tab === "properties" ? displayCode[1] : displayCode[0];
    await navigator.clipboard.writeText(code ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (blockData.generateResult) {
      if ("modelName" in blockData.generateResult) {
        setDisplayCode([
          blockData.generateResult.model,
          blockData.generateResult.properties,
        ]);
      } else {
        setDisplayCode([blockData.generateResult.code]);
      }
    } else {
      setDisplayCode(useDbt ? ["", ""] : [""]);
    }
  }, [blockData.generateResult, useDbt]);

  return (
    <div className="grid gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CodeXml className="h-4 w-4" />
          <span className="font-medium">
            {tool ?? (language[0] === "plaintext" ? "" : language[0])}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleGenerate}
                >
                  <WandSparkles className="h-4 w-4" />
                  <span className="sr-only">Generate</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Generate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleExecute}
                >
                  <Play className="h-4 w-4" />
                  <span className="sr-only">Run</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Run</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4" />
                  <span className="sr-only">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Save</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">Copy</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="rounded-lg p-1 overflow-x-auto">
        {tool === TransformationTool.DBT ? (
          <Tabs
            defaultValue="model"
            value={tab}
            onValueChange={setTab}
            className="h-full"
          >
            <TabsList className="grid grid-cols-2 w-full text-sm">
              <TabsTrigger value="model">Model</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
            </TabsList>
            <TabsContent value="model">
              <CodeEditor
                code={displayCode[0]}
                setCode={(newCode: string) =>
                  setDisplayCode([newCode, displayCode[1]])
                }
                language={language[0]}
              />
            </TabsContent>
            <TabsContent value="properties">
              <CodeEditor
                code={displayCode[1]}
                setCode={(newCode: string) =>
                  setDisplayCode([displayCode[0], newCode])
                }
                language={language[1]}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <CodeEditor
            code={displayCode[0]}
            setCode={(newCode: string) => setDisplayCode([newCode])}
            language={language[0]}
          />
        )}
      </div>
    </div>
  );
};

export default CodeCell;
