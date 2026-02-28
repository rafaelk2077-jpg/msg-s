import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, FileImage, Database } from "lucide-react";

export interface UploadStep {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  progress?: number;
  detail?: string;
}

interface UploadProgressProps {
  steps: UploadStep[];
  currentStep: number;
  overallProgress: number;
}

const stepIcons: Record<string, React.ElementType> = {
  cover: FileImage,
  pdf: Upload,
  pages: FileImage,
  database: Database,
};

export function UploadProgress({ steps, currentStep, overallProgress }: UploadProgressProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso do Upload</span>
          <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.id] || Upload;
          const isActive = step.status === "active";
          const isCompleted = step.status === "completed";
          const isError = step.status === "error";

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-md p-2 transition-colors ${
                isActive ? "bg-primary/10" : isCompleted ? "bg-green-500/10" : isError ? "bg-destructive/10" : ""
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isCompleted 
                  ? "bg-green-500 text-white" 
                  : isActive 
                    ? "bg-primary text-primary-foreground" 
                    : isError
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted text-muted-foreground"
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isActive ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isActive ? "text-primary" : isCompleted ? "text-green-600" : isError ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  {step.progress !== undefined && isActive && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(step.progress)}%
                    </span>
                  )}
                </div>
                {step.detail && (
                  <p className="text-xs text-muted-foreground truncate">{step.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
