export type PageFormat = 'a4' | 'letter' | 'legal';
export type PageOrientation = 'portrait' | 'landscape';
export type PageMargins = 'normal' | 'narrow' | 'wide';

export interface PageDimension {
  width: number;  // In logical CSS pixels
  height: number;
}

export const PAGE_DIMENSIONS: Record<PageFormat, Record<PageOrientation, PageDimension>> = {
  a4: {
    portrait: { width: 794, height: 1123 },
    landscape: { width: 1123, height: 794 },
  },
  letter: {
    portrait: { width: 816, height: 1056 },
    landscape: { width: 1056, height: 816 },
  },
  legal: {
    portrait: { width: 816, height: 1344 },
    landscape: { width: 1344, height: 816 },
  },
};

export const MARGIN_VALUES: Record<PageMargins, number> = {
  normal: 48,
  narrow: 24,
  wide: 72,
};

export const SHARED_PALETTE = {
  textColors: [
    { label: 'Dark Slate', value: '#0f172a' },
    { label: 'Muted Gray', value: '#64748b' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Orange', value: '#ea580c' },
    { label: 'Red', value: '#dc2626' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Pink', value: '#db2777' },
    { label: 'White', value: '#ffffff' },
  ],
  fillColors: [
    { label: 'Transparent', value: 'transparent' },
    { label: 'White', value: '#ffffff' },
    { label: 'Light Slate', value: '#f8fafc' },
    { label: 'Soft Blue', value: '#dbeafe' },
    { label: 'Soft Green', value: '#dcfce7' },
    { label: 'Soft Yellow', value: '#fef9c3' },
    { label: 'Soft Orange', value: '#ffedd5' },
    { label: 'Soft Red', value: '#fee2e2' },
    { label: 'Soft Purple', value: '#f3e8ff' },
    { label: 'Soft Pink', value: '#fce7f3' },
    { label: 'Dark Card', value: '#1e293b' },
  ],
  borderColors: [
    { label: 'Slate Border', value: '#cbd5e1' },
    { label: 'Dark Slate', value: '#334155' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Green', value: '#10b981' },
    { label: 'Amber', value: '#f59e0b' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Purple', value: '#8b5cf6' },
  ],
  highlights: [
    { label: 'None', value: 'transparent' },
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Green', value: '#bbf7d0' },
    { label: 'Blue', value: '#bfdbfe' },
    { label: 'Pink', value: '#fbcfe8' },
    { label: 'Orange', value: '#fed7aa' },
  ],
};

export const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
export const FONT_FAMILIES = ['Inter', 'Arial', 'Georgia', 'Times New Roman', 'Monospace'];

export const SHAPE_PRESETS = [
  { label: 'Default', color: '#dbeafe', borderColor: '#3b82f6', textColor: '#1e3a8a' },
  { label: 'Info', color: '#e0f2fe', borderColor: '#0284c7', textColor: '#0369a1' },
  { label: 'Success', color: '#dcfce7', borderColor: '#16a34a', textColor: '#15803d' },
  { label: 'Warning', color: '#fef3c7', borderColor: '#d97706', textColor: '#b45309' },
  { label: 'Danger', color: '#fee2e2', borderColor: '#dc2626', textColor: '#b91c1c' },
  { label: 'Outline', color: 'transparent', borderColor: '#475569', textColor: '#0f172a' },
];

export interface DocumentSettings {
  format: PageFormat;
  orientation: PageOrientation;
  margins: PageMargins;
  showPageNumbers: boolean;
  headerText?: string;
  footerText?: string;
}

export type BlockType = 
  | 'text'
  | 'heading'
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'table'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'code'
  | 'shape'
  | 'diagram'
  | 'image';

export type BlockLayoutType = 'flow' | 'positioned';

export interface BlockComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export type QuotePresetStyle = 'default' | 'sidebar' | 'highlight' | 'warning' | 'takeaway';

export interface QuoteData {
  text: string;
  author?: string;
  quoteStyle?: QuotePresetStyle;
  preset?: QuotePresetStyle;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  accentColor?: string;
  fontSize?: number;
  italic?: boolean;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  padding?: number;
  borderRadius?: number;
}

export const QUOTE_PRESETS: Record<QuotePresetStyle, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
  borderWidth: number;
  italic: boolean;
  borderRadius: number;
}> = {
  default: {
    label: 'Default',
    bgColor: '#f8fafc',
    textColor: '#334155',
    borderColor: '#e2e8f0',
    accentColor: '#3b82f6',
    borderWidth: 4,
    italic: true,
    borderRadius: 8,
  },
  sidebar: {
    label: 'Sidebar Quote',
    bgColor: '#ffffff',
    textColor: '#1e293b',
    borderColor: '#cbd5e1',
    accentColor: '#64748b',
    borderWidth: 3,
    italic: true,
    borderRadius: 4,
  },
  highlight: {
    label: 'Highlight',
    bgColor: '#fef9c3',
    textColor: '#713f12',
    borderColor: '#fde047',
    accentColor: '#eab308',
    borderWidth: 4,
    italic: false,
    borderRadius: 8,
  },
  warning: {
    label: 'Warning',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
    borderColor: '#fca5a5',
    accentColor: '#ef4444',
    borderWidth: 4,
    italic: false,
    borderRadius: 8,
  },
  takeaway: {
    label: 'Key Takeaway',
    bgColor: '#ecfdf5',
    textColor: '#065f46',
    borderColor: '#a7f3d0',
    accentColor: '#10b981',
    borderWidth: 4,
    italic: false,
    borderRadius: 8,
  },
};

export type CalloutPresetType = 'info' | 'success' | 'warning' | 'danger' | 'tip';

export interface CalloutData {
  title?: string;
  body: string;
  type: CalloutPresetType;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const CALLOUT_PRESETS: Record<CalloutPresetType, {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
}> = {
  info: {
    label: 'Info',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1e40af',
    accentColor: '#3b82f6',
  },
  success: {
    label: 'Success',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    textColor: '#166534',
    accentColor: '#22c55e',
  },
  warning: {
    label: 'Warning',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#92400e',
    accentColor: '#f59e0b',
  },
  danger: {
    label: 'Danger',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#991b1b',
    accentColor: '#ef4444',
  },
  tip: {
    label: 'Tip',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    textColor: '#5b21b6',
    accentColor: '#8b5cf6',
  },
};

export interface TableCell {
  text: string;
  color?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableData {
  headers: string[];
  rows: string[][];
  colWidths?: number[];
  cellBgColors?: Record<string, string>;
  cellTextColors?: Record<string, string>;
  headerTextColor?: string;
  textColor?: string;
}

export type DiagramNodeShape = 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'pill' | 'database' | 'document' | 'io';
export type DiagramNodeType = 'start' | 'process' | 'decision' | 'io' | 'database' | 'document' | 'end' | 'generic';
export type DiagramConnectionType = 'arrow' | 'bidirectional' | 'line';

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shape?: DiagramNodeShape;
  nodeType?: DiagramNodeType;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  fontSize?: number;
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  type?: DiagramConnectionType;
  label?: string;
  color?: string;
}

export interface DiagramData {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  layout?: 'free' | 'horizontal' | 'vertical' | 'tree';
}

export type ShapeType = 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'pill' | 'arrow' | 'line';

export interface ShapeData {
  shapeType: ShapeType;
  label?: string;
  color?: string;         // Fill color
  borderColor?: string;   // Border stroke color
  borderWidth?: number;   // 0, 1, 2, 3, 4, 6
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;       // 0.25 to 1.0
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  rotation?: number;      // In degrees
}

export interface DocumentBlock {
  id: string;
  type: BlockType;
  layoutType: BlockLayoutType;
  content: any; // string, ChecklistItem[], TableData, DiagramData, ShapeData, etc.
  x?: number; // Logical page px (for positioned content)
  y?: number; // Logical page px (for positioned content)
  width?: number; // Custom width px
  height?: number; // Custom height px
  headingLevel?: 1 | 2 | 3; // For heading blocks
  calloutType?: 'info' | 'tip' | 'warning' | 'important'; // For callout blocks
  codeLanguage?: string; // For code blocks
  locked?: boolean; // Prevents dragging / editing when locked
  zIndex?: number; // Layer ordering (10 - 100)
  rotation?: number; // In degrees
  style?: {
    align?: 'left' | 'center' | 'right' | 'justify';
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    color?: string;
    bgColor?: string; // Highlight color
    fontSize?: number;
    fontFamily?: string;
  };
  comments?: BlockComment[];
  updatedBy?: string;
  updatedAt?: number;
}

export interface DocumentPage {
  id: string;
  pageNumber: number;
  blocks: DocumentBlock[];
}

export interface GroupDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  settings: DocumentSettings;
  pages: DocumentPage[];
}

export interface CollaboratorPresence {
  userId: string;
  userName: string;
  userColor: string;
  activePageId: string;
  activePageNumber: number;
  activeBlockId?: string | null;
  lastActive: number;
}

export const USER_PRESENCE_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
];

export function createDefaultDocument(title: string = "Group Study Notes"): GroupDocument {
  const page1Id = `page_${Date.now()}_1`;
  return {
    id: `doc_${Date.now()}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      format: 'a4',
      orientation: 'portrait',
      margins: 'normal',
      showPageNumbers: true,
      headerText: title,
    },
    pages: [
      {
        id: page1Id,
        pageNumber: 1,
        blocks: [
          {
            id: `b_${Date.now()}_heading`,
            type: 'heading',
            layoutType: 'flow',
            headingLevel: 1,
            content: title,
            style: { align: 'left', bold: true },
          },
          {
            id: `b_${Date.now()}_intro`,
            type: 'text',
            layoutType: 'flow',
            content: 'Welcome to Group Document Studio. Everyone in this session can simultaneously edit, add tables, diagrams, checklists, shapes, and export to a clean multi-page PDF.',
            style: { color: '#475569', fontSize: 15 },
          }
        ],
      }
    ],
  };
}
