export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementGeometry extends Rect {
  scrollX: number;
  scrollY: number;
  contentWidth: number;
  contentHeight: number;
  isTransformed: boolean;
  transform: string;
  aspectRatio: number;
}

export interface BoxModel {
  margin: Spacing;
  border: Spacing;
  padding: Spacing;
  content: {
    width: number;
    height: number;
  };
  boxSizing: string;
}

export interface TypographyInfo {
  fontFamily: string;
  primaryFont: string;
  fontSize: string;
  fontSizePx: number;
  fontWeight: string;
  lineHeight: string;
  lineHeightRatio: number | null;
  letterSpacing: string;
  textAlign: string;
  textTransform: string;
  color: string;
  colorHex: string;
}

export interface ColorSwatch {
  raw: string;
  hex: string;
  rgba: string;
  opacity: number;
}

export interface ElementColors {
  color: ColorSwatch;
  background: ColorSwatch;
  borderColor: ColorSwatch;
  outlineColor: ColorSwatch;
  contrastRatio: number | null;
  contrastGrade: 'AAA' | 'AA' | 'AA Large' | 'Fail' | null;
}

export interface LayoutInsight {
  label: string;
  value: string;
}

export interface GridTrackInfo {
  columns: number[];
  rows: number[];
  columnGap: number;
  rowGap: number;
  templateColumns: string;
  templateRows: string;
}

export interface FlexContainerInfo {
  direction: string;
  wrap: string;
  justifyContent: string;
  alignItems: string;
  alignContent: string;
  gap: string;
  rowGap: number;
  columnGap: number;
  childCount: number;
}

export interface LayoutInfo {
  display: string;
  position: string;
  zIndex: string;
  overflow: string;
  isFlex: boolean;
  isGrid: boolean;
  isFlexItem: boolean;
  isGridItem: boolean;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gap?: string;
  rowGap: number;
  columnGap: number;
  borderRadius: string;
  boxShadow: string;
  opacity: number;
  flex?: FlexContainerInfo;
  grid?: GridTrackInfo;
  insights: LayoutInsight[];
}

export interface HierarchyNode {
  id: string;
  selector: string;
  tagName: string;
  idAttr?: string;
  classes: string[];
  display: string;
  isFlex: boolean;
  isGrid: boolean;
  width: number;
  height: number;
  depth: number;
  isSelected?: boolean;
}

export interface ComputedStyleGroup {
  category: 'Layout' | 'Box Model' | 'Typography' | 'Visual' | 'Positioning';
  properties: Record<string, string>;
}

export interface DistanceMeasurement {
  targetSelector: string;
  targetRect: Rect;
  horizontal: {
    distance: number;
    fromX: number;
    toX: number;
    y: number;
    overlap: boolean;
  } | null;
  vertical: {
    distance: number;
    fromY: number;
    toY: number;
    x: number;
    overlap: boolean;
  } | null;
  isContained: boolean;
  innerOffsets: Spacing | null;
}

export interface ElementInspection {
  id: string;
  selector: string;
  tagName: string;
  idAttr?: string;
  classes: string[];
  textPreview: string;
  childCount: number;
  inShadowDom: boolean;
  geometry: ElementGeometry;
  boxModel: BoxModel;
  typography: TypographyInfo;
  layout: LayoutInfo;
  colors: ElementColors;
  computedGroups: ComputedStyleGroup[];
  copyableCss: string;
  ancestors: HierarchyNode[];
  children: HierarchyNode[];
}

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  scrollHeight: number;
  scrollWidth: number;
  url: string;
  title: string;
}

export interface ColorToken {
  hex: string;
  rgba: string;
  count: number;
  roles: Array<'text' | 'background' | 'border'>;
  suggestedName: string;
}

export interface TypographyToken {
  id: string;
  fontFamily: string;
  primaryFont: string;
  fontSize: string;
  fontSizePx: number;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  count: number;
  sampleTags: string[];
  suggestedRole: string;
}

export interface ScaleToken {
  valuePx: number;
  value: string;
  count: number;
  suggestedName: string;
}

export interface ContainerWidthToken {
  selector: string;
  width: number;
  maxWidth: string;
  centered: boolean;
  display: string;
}

export interface LayoutNodeSummary {
  selector: string;
  tagName: string;
  type: 'flex' | 'grid';
  directionOrCols: string;
  gap: string;
  width: number;
  height: number;
  childCount: number;
  depth: number;
}

export interface ConsistencyIssue {
  category: 'color' | 'spacing' | 'typography' | 'radius';
  severity: 'info' | 'warning';
  message: string;
  values: string[];
}

export interface DesignSystemSummary {
  url: string;
  title: string;
  scannedElements: number;
  timestamp: string;
  viewport: ViewportInfo;
  colors: ColorToken[];
  typography: TypographyToken[];
  fontFamilies: Array<{ name: string; stack: string; count: number }>;
  spacing: ScaleToken[];
  radii: ScaleToken[];
  containers: ContainerWidthToken[];
  layoutTree: LayoutNodeSummary[];
  issues: ConsistencyIssue[];
}

export interface OverlayOptions {
  showBoxModel: boolean;
  showLayoutGuides: boolean;
  showMeasurements: boolean;
  showDimensionsBadge: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type InspectorTab = 'element' | 'page';

export interface InspectorState {
  active: boolean;
  locked: boolean;
  tabId: number | null;
  pageUrl: string;
  pageTitle: string;
  viewport: ViewportInfo | null;
  hovered: ElementInspection | null;
  selected: ElementInspection | null;
  measurement: DistanceMeasurement | null;
  designSystem: DesignSystemSummary | null;
  overlayOptions: OverlayOptions;
}
