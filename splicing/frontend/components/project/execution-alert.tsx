import { AlertTriangle, Check } from "lucide-react";
import { ExecuteResult } from "@/components/types/schema-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExecutionAlertProps {
  executeResult: ExecuteResult;
}

const ExecutionAlert: React.FC<ExecutionAlertProps> = ({ executeResult }) => {
  return (
    <Alert
      variant={executeResult.error ? "destructive" : "default"}
      className="max-h-80 overflow-x-auto overflow-y-auto"
    >
      {executeResult.error ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      <AlertTitle className="font-semibold">
        {executeResult.error ? "Execution Error" : "Execution Result"}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 overflow-x-auto overflow-y-auto">
          <details open className="mt-2">
            <pre className="mt-2 whitespace-pre-wrap text-xs">
              {executeResult.error ?? executeResult.returnValue}
            </pre>
          </details>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ExecutionAlert;
