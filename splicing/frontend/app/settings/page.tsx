"use client";

import Image from "next/image";
import { useEffect } from "react";
import Header from "@/components/common/header";
import Sidebar from "@/components/common/sidebar";
import { SettingsSectionType } from "@/components/types/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supportedLLMs, supportedIntegrations } from "@/data/settings";
import useSettingsStore from "@/store/settings";

export default function Settings() {
  const [currentSection, items, fetchAllItems] = useSettingsStore((state) => [
    state.currentSection,
    state.items,
    state.fetchAllItems,
  ]);

  useEffect(() => {
    const initializeItems = async () => {
      await fetchAllItems();
    };
    initializeItems();
  }, [fetchAllItems]);

  let allSectionItems;
  switch (currentSection) {
    case SettingsSectionType.Integration:
      allSectionItems = supportedIntegrations;
      break;
    case SettingsSectionType.LLM:
      allSectionItems = supportedLLMs;
      break;
    default:
      allSectionItems = [];
      break;
  }
  const itemsKeySet = new Set(items.map((item) => item.key.toString()));

  return (
    <div className="flex h-screen w-full flex-col">
      <Sidebar />
      <Header />
      <div className="flex flex-col pl-40 pt-14 fixed inset-0">
        <main className="flex items-start gap-4 p-4 h-full overflow-y-auto">
          {Object.entries(allSectionItems)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, Component]) => (
              <Dialog key={key}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative flex flex-col gap-2 items-center w-60 h-60"
                  >
                    {itemsKeySet.has(key) && (
                      <Badge variant="green" className="absolute top-2 right-2">
                        Added
                      </Badge>
                    )}
                    <Image
                      className="flex"
                      src={`/logos/${key.toLowerCase().replace(/\s+/g, "-")}.svg`}
                      height={90}
                      width={90}
                      alt={`${key} Logo`}
                    />
                    <span className="flex text-lg">{key}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{`Add ${key} ${currentSection}`}</DialogTitle>
                    <DialogDescription>
                      Add required information below:
                    </DialogDescription>
                  </DialogHeader>
                  <Component />
                </DialogContent>
              </Dialog>
            ))}
        </main>
      </div>
    </div>
  );
}
