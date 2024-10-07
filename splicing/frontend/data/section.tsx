import { LucideIcon, ArrowLeftRight, Eraser, Rotate3D, Timer} from "lucide-react";
import { SectionType } from "@/components/types/section";


export const sectionIconMap: { [key in SectionType]: LucideIcon } = {
  [SectionType.Movement]: ArrowLeftRight,
  [SectionType.Cleaning]: Eraser,
  [SectionType.Transformation]: Rotate3D,
  [SectionType.Orchestration]: Timer,
};
