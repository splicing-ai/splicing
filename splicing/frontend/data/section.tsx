import { LucideIcon, ArrowLeftRight, Eraser, Rotate3D, Timer} from "lucide-react";
import { SectionType } from "@/components/types/schema-types";


export const sectionIconMap: { [key in SectionType]: LucideIcon } = {
  [SectionType.MOVEMENT]: ArrowLeftRight,
  [SectionType.CLEANING]: Eraser,
  [SectionType.TRANSFORMATION]: Rotate3D,
  [SectionType.ORCHESTRATION]: Timer,
};
