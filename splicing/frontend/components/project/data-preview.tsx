import { Table2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TableRow = Record<string, any>;

interface DataTableProps {
  data: TableRow[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  const formatCellValue = (value: any): string => {
    if (typeof value === "boolean") {
      return value.toString();
    }
    return value !== null && value !== undefined ? value : "";
  };

  return (
    <div>
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="py-2">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={header} className="py-2">
                  {formatCellValue(row[header])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface DataPreviewProps {
  data: { [key: string]: string };
}

const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const datasets = Object.entries(data).map(([name, jsonString]) => ({
    name,
    data: JSON.parse(jsonString) as TableRow[],
  }));
  const [activeTab, setActiveTab] = useState<string>(
    datasets.length > 0 ? datasets[0].name : "",
  );

  const handleDownloadCSV = () => {
    const activeDataset = datasets.find(
      (dataset) => dataset.name === activeTab,
    );
    if (!activeDataset) return;

    const headers = Object.keys(activeDataset.data[0]).join(",");
    const rows = activeDataset.data
      .map((row) =>
        Object.values(row)
          .map((value) => `"${value}"`)
          .join(","),
      )
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="grid gap-2 rounded-lg border p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="font-medium">Data Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleDownloadCSV}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download CSV</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Download CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <CollapsibleTrigger asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="rounded-full w-6 h-6"
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {isOpen ? "Collapse" : "Expand"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isOpen ? "Collapse" : "Expand"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="max-h-80 overflow-x-auto overflow-y-auto">
        {datasets.length > 1 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-flow-col auto-cols-fr w-full text-sm">
              {datasets.map(({ name }) => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
            {datasets.map(({ name, data }) => (
              <TabsContent key={name} value={name}>
                <DataTable data={data} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <DataTable data={datasets[0].data} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DataPreview;
