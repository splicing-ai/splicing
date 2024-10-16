import { SettingsSectionType } from "@/components/types/schema-types";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { settingsSectionIconMap } from "@/data/settings";
import useSettingsStore from "@/store/settings";

const SettingsSections = () => {
  const [currentSection, setCurrentSection] = useSettingsStore((state) => [
    state.currentSection,
    state.setCurrentSection,
  ]);

  return (
    <div className="flex flex-col items-center gap-4 px-2 w-full">
      <Separator className="mt-4 w-full" />
      {Object.entries(settingsSectionIconMap).map(([key, Icon]) => (
        <Toggle
          key={key}
          pressed={currentSection === key}
          onPressedChange={(pressed) => {
            if (pressed) {
              setCurrentSection(key as SettingsSectionType);
            }
          }}
          className="w-full justify-start overflow-x-hidden"
        >
          <div className="flex h-9 w-9 pr-2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
            <Icon className="w-5 h-5" />
          </div>
          {key}
        </Toggle>
      ))}
    </div>
  );
};

export default SettingsSections;
