import type { AiModelOption, AiSkillOption } from '../api/AiSdkChat.api';
import type { AiSdkMessageSkill, ComposerAttachment } from './index';

export interface AiSdkComposerPopupMotion {
  animate: Recordable;
  exit: Recordable;
  initial: Recordable;
  transition: Recordable;
}

export interface AiSdkComposerState {
  activeSkillCategory: string;
  addMenuOpen: boolean;
  attachments: ComposerAttachment[];
  fileInputAccept: string;
  filteredSkillOptions: AiSkillOption[];
  formatFileSize: (size: number) => string;
  input: string;
  loading: boolean;
  modelLoading: boolean;
  modelMenuOpen: boolean;
  modelOptions: AiModelOption[];
  popupMotion: AiSdkComposerPopupMotion;
  selectedModelId: string;
  selectedModelLabel: string;
  selectedSkillIds: string[];
  selectedSkills: AiSdkMessageSkill[];
  skillCategories: string[];
  skillsLoading: boolean;
  skillsMenuOpen: boolean;
  webSearchEnabled: boolean;
}

export interface AiSdkComposerActions {
  handleComposerInput: () => void;
  handleComposerKeydown: (event: KeyboardEvent) => void;
  handleComposerPaste: (event: ClipboardEvent) => void;
  handleFileSelect: (event: Event) => void;
  openFilePicker: (type: 'file' | 'image') => void;
  removeAttachment: (id: string) => void;
  removeSkill: (id: string) => void;
  selectModel: (id: string) => void;
  send: () => void;
  stopResponse: () => void;
  setComposerRef: (value: HTMLElement | undefined) => void;
  setFileInputRef: (value: HTMLInputElement | undefined) => void;
  setMenuRef: (key: 'add' | 'skills' | 'model', value: HTMLElement | undefined) => void;
  toggleAddMenu: () => void;
  toggleModelMenu: () => void;
  toggleSkill: (id: string) => void;
  toggleSkillsMenu: () => void;
  toggleWebSearch: () => void;
  updateActiveSkillCategory: (value: string) => void;
}
