import { create } from 'zustand';
import {
  SettingsSectionType,
  SettingsKey,
  SettingsItem,
  SettingsValue,
} from "@/components/types/settings";
import { backendClient } from '@/lib/backend';

interface SettingsState {
  currentSection: SettingsSectionType;
  setCurrentSection: (section: SettingsSectionType) => void;
  items: SettingsItem[];
  addItem: (sectionType: SettingsSectionType, key:SettingsKey, value: SettingsValue) => Promise<void>;
  removeItem: (sectionType: SettingsSectionType, key: SettingsKey) => Promise<void>;
  fetchAllItems: () => Promise<void>;
}

const useSettingsStore = create<SettingsState>((set) => ({
  currentSection: SettingsSectionType.Integration,
  setCurrentSection: (section: SettingsSectionType) => {
    set({ currentSection: section })
  },
  items: [],
  addItem: async (sectionType: SettingsSectionType, key: SettingsKey, value: SettingsValue) => {
    await backendClient.addSettingsItem(sectionType, key, value);
    set((state) => {
      const itemIndex = state.items.findIndex(item => item.sectionType === sectionType && item.key === key);
      if (itemIndex !== -1) {
        const updatedItems = state.items.map((item, index) =>
          index === itemIndex ? { ...item, value: value } : item
        );
        return { items: updatedItems };
      } else {
        return {
          items: [...state.items, { sectionType: sectionType, key: key, value: value }]
        };
      }
    });
  },
  removeItem: async (sectionType: SettingsSectionType, key: SettingsKey) => {
    await backendClient.deleteSettingsItem(sectionType, key);
    set((state) => ({
      items: state.items.filter(item => item.key !== key)
    }));
  },
  fetchAllItems: async () => {
    set({
       items: await backendClient.fetchSettings()
    });
  }
}));

export default useSettingsStore;
