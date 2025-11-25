import React from 'react';
import { Tooltip } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import {
  KVMap,
  KeyValues,
  mergeKVMap,
  checkCondition,
  isConditionalBlockKey
} from '../lib/keyvalues';

export type FontDefinition = {
  family: string;
  size: number;
};

const SCREEN_BASE_WIDTH = 640;
const SCREEN_BASE_HEIGHT = 480;
const GENERIC_BASE_WIDTH = 64;
const GENERIC_BASE_HEIGHT = 24;

const CONTROL_DEFAULT_SIZES: Record<string, { width: number; height: number }> =
  {
    CExLabel: { width: 120, height: 24 },
    Label: { width: 120, height: 24 },
    EditablePanel: { width: SCREEN_BASE_WIDTH, height: SCREEN_BASE_HEIGHT },
    Panel: { width: GENERIC_BASE_WIDTH, height: GENERIC_BASE_HEIGHT },
    ImagePanel: { width: 64, height: 64 },
    CExImageButton: { width: 64, height: 64 }
  };

function parseColor(colorStr: string): string {
  if (!colorStr) return 'transparent';

  const parts = colorStr.split(' ').map(Number);
  if (parts.length >= 3) {
    const a = parts.length > 3 ? parts[3] / 255 : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return colorStr;
}

function getControlBaseSize(controlName: string) {
  return (
    CONTROL_DEFAULT_SIZES[controlName] ?? {
      width: GENERIC_BASE_WIDTH,
      height: GENERIC_BASE_HEIGHT
    }
  );
}

function resolveSizeValue({
  raw,
  parentSize,
  otherSize,
  baseSize
}: {
  raw?: string;
  parentSize: number;
  otherSize?: number;
  baseSize: number;
}): number | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  const flag = value[0];
  const remainder = value.substring(1);
  const numeric = parseFloat(remainder);
  const safeNumber = Number.isNaN(numeric) ? 0 : numeric;

  switch (flag) {
    case 'f':
      return Math.max(parentSize - safeNumber, 0);
    case 'o':
      return (otherSize ?? baseSize) * (Number.isNaN(numeric) ? 1 : numeric);
    case 'p':
      return parentSize * (Number.isNaN(numeric) ? 1 : numeric);
    case 's':
      return baseSize * (Number.isNaN(numeric) ? 1 : numeric);
    default: {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
  }
}

function resolvePositionValue({
  raw,
  parentSize,
  selfSize
}: {
  raw?: string;
  parentSize: number;
  selfSize: number;
}): number {
  if (!raw) return 0;
  const value = raw.trim().toLowerCase();
  const flag = value[0];
  const remainder = value.substring(1);
  const numeric = parseFloat(remainder);
  const safeNumber = Number.isNaN(numeric) ? 0 : numeric;

  switch (flag) {
    case 'c':
      // Matches Source engine behavior: centers the anchor point, not the entire control.
      return parentSize / 2 + safeNumber;
    case 'r':
      return parentSize - selfSize - safeNumber;
    case 's':
      return selfSize * safeNumber;
    case 'p':
      return parentSize * safeNumber;
    default:
      return parseFloat(value) || 0;
  }
}

export default function HudComponent({
  name,
  data,
  fontMap,
  loadedFonts,
  line,
  onElementClick,
  outlineColor,
  hoveredLine,
  onHover,
  scaleX = 1,
  scaleY = 1,
  platform = 'WIN32',
  sourceFile,
  parentWidth = SCREEN_BASE_WIDTH,
  parentHeight = SCREEN_BASE_HEIGHT,
  onSkipElement,
  schemeColors,
  schemeBaseSettings,
  schemeBorders
}: {
  name: string;
  data: KVMap;
  fontMap: Record<string, FontDefinition>;
  loadedFonts: string[];
  line?: number;
  onElementClick?: (line: number, sourceFile?: string) => void;
  outlineColor?: string;
  hoveredLine?: number | null;
  onHover?: (line: number | null) => void;
  scaleX?: number;
  scaleY?: number;
  platform?: string;
  sourceFile?: string;
  parentWidth?: number;
  parentHeight?: number;
  onSkipElement?: (info: {
    name: string;
    line?: number;
    reason: 'zero-size' | 'missing-position';
  }) => void;
  schemeColors: Record<string, string>;
  schemeBaseSettings: Record<string, string>;
  schemeBorders: Record<string, KeyValues>;
}) {
  // data is now KVMap, but we need to check if it's valid
  if (typeof data !== 'object') return null;

  // Helper to safely get string value from KVNode
  const getStr = (key: string): string => {
    const node = data[key];
    if (!node || !node.definitions) return '';

    // Find the last matching definition
    let match = '';
    for (const def of node.definitions) {
      if (typeof def.value !== 'string') continue;

      if (!def.condition) {
        match = def.value;
      } else {
        const cond = def.condition.replace(/[[\]]/g, ''); // remove []
        const isNegated = cond.startsWith('!');
        const cleanCond = isNegated ? cond.substring(1) : cond;

        // Simple check: strictly match platform name (e.g. $WIN32)
        // In reality, VGUI has complex logic, but we'll stick to basic platform checks
        const targetPlatform = cleanCond.startsWith('$')
          ? cleanCond.substring(1)
          : cleanCond;

        const matches = targetPlatform.toUpperCase() === platform;

        if (isNegated ? !matches : matches) {
          match = def.value;
        }
      }
    }
    return match;
  };

  const controlName = getStr('ControlName');
  const fieldName = getStr('fieldName') || name;

  const hasCoordinateValue = (key: 'xpos' | 'ypos') => {
    const node = data[key];
    if (!node) return false;
    return node.definitions.some((def) => typeof def.value === 'string');
  };

  const xposStr = getStr('xpos') || '0';
  const yposStr = getStr('ypos') || '0';

  const hasXpos = hasCoordinateValue('xpos');
  const hasYpos = hasCoordinateValue('ypos');

  const zposStr = getStr('zpos') || '0';
  const wideStr = getStr('wide');
  const tallStr = getStr('tall');

  const visible = getStr('visible') !== '0';
  const fontName = getStr('font');

  const fontDef = fontName ? fontMap[fontName] : null;
  const mappedFamily = fontDef?.family || 'inherit';
  const fontSize = fontDef?.size || 14; // Default to 14px if unknown

  // Check if font is loaded (if it's not a generic one)
  const isFontMissing =
    fontName &&
    mappedFamily !== 'inherit' &&
    !loadedFonts.includes(mappedFamily) &&
    !['Arial', 'Verdana', 'Tahoma'].includes(mappedFamily);
  const fontFamily = isFontMissing ? 'monospace' : mappedFamily;
  const wrapText = getStr('wrap') === '1';
  const imageValue = getStr('image') || '';

  const resolveColorValue = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const mapped = schemeColors[trimmed.toLowerCase()] ?? trimmed;
    return parseColor(mapped);
  };

  const controlCandidates = Array.from(
    new Set(
      [
        controlName,
        fieldName,
        controlName?.replace(/^CEx/, ''),
        controlName?.replace(/^CHud/, 'Hud'),
        controlName?.startsWith('C') ? controlName.substring(1) : '',
        controlName?.includes('Label') ? 'Label' : '',
        controlName?.includes('Panel') ? 'Panel' : ''
      ].filter((v) => v && v.length > 0)
    )
  );

  const getBaseSettingValue = (propVariants: string[]): string | undefined => {
    for (const control of controlCandidates) {
      for (const variant of propVariants) {
        const key = `${control}.${variant}`;
        const value = schemeBaseSettings[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return value;
        }
      }
    }
    for (const variant of propVariants) {
      const value = schemeBaseSettings[variant];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  };

  const fgColorValue =
    getStr('fgcolor_override') ||
    getStr('fgcolor') ||
    getBaseSettingValue(['fgcolor', 'FgColor', 'textcolor', 'TextColor']);
  const bgColorValue =
    getStr('bgcolor_override') ||
    getStr('bgcolor') ||
    getBaseSettingValue([
      'bgcolor',
      'BgColor',
      'backgroundcolor',
      'BackgroundColor'
    ]);
  const outlineColorValue =
    getStr('color_outline') ||
    getBaseSettingValue([
      'color_outline',
      'OutlineColor',
      'bordercolor',
      'BorderColor'
    ]);

  const resolvedFgColor = fgColorValue
    ? resolveColorValue(fgColorValue)
    : undefined;
  const resolvedBgColor = bgColorValue
    ? resolveColorValue(bgColorValue)
    : undefined;
  const resolvedOutlineColor = outlineColorValue
    ? resolveColorValue(outlineColorValue)
    : null;
  const borderName =
    getStr('border') ||
    getBaseSettingValue(['border', 'Border', 'defaultborder']);

  const getSchemeBorderStyle = () => {
    if (!borderName) return undefined;
    const def = schemeBorders[borderName];
    if (!def) return undefined;
    const colorCandidate =
      (def['color'] as string) ||
      (def['color1'] as string) ||
      outlineColorValue;
    const borderColor = colorCandidate
      ? resolveColorValue(colorCandidate)
      : undefined;
    const insetStr = def['inset'] as string | undefined;
    let width = 1;
    if (insetStr) {
      const insetValues = insetStr
        .split(/\s+/)
        .map((n) => Math.abs(parseInt(n, 10)) || 0);
      const maxInset = Math.max(...insetValues, 0);
      width = Math.max(1, maxInset);
    }
    return `${width}px solid ${
      borderColor ||
      resolvedOutlineColor ||
      outlineColor ||
      'rgba(255,255,255,0.2)'
    }`;
  };
  const schemeBorderStyle = getSchemeBorderStyle();

  const hasTexture = Boolean(imageValue);

  const hasRenderableChildren = Object.entries(data).some(
    ([key, node]) =>
      !['ControlName', 'fieldName', 'font', 'labelText'].includes(key) &&
      node.definitions?.some((def) => typeof def.value === 'object')
  );

  const baseSize = getControlBaseSize(controlName || '');

  const resolvedHeightUnits = resolveSizeValue({
    raw: tallStr,
    parentSize: parentHeight,
    baseSize: baseSize.height
  });
  const resolvedWidthUnits = resolveSizeValue({
    raw: wideStr,
    parentSize: parentWidth,
    otherSize: resolvedHeightUnits,
    baseSize: baseSize.width
  });

  const heightUnits =
    resolvedHeightUnits ??
    parentHeight ??
    baseSize.height ??
    SCREEN_BASE_HEIGHT;
  const widthUnits =
    resolvedWidthUnits ?? parentWidth ?? baseSize.width ?? SCREEN_BASE_WIDTH;

  if (heightUnits <= 0 || widthUnits <= 0) {
    onSkipElement?.({ name: fieldName, line, reason: 'zero-size' });
    return null;
  }

  let skipSelfRender = false;
  if (!hasXpos || !hasYpos) {
    if (hasRenderableChildren) {
      skipSelfRender = true;
      onSkipElement?.({ name: fieldName, line, reason: 'missing-position' });
    } else {
      onSkipElement?.({ name: fieldName, line, reason: 'missing-position' });
      return null;
    }
  }

  const resolvedXUnits = resolvePositionValue({
    raw: xposStr,
    parentSize: parentWidth,
    selfSize: widthUnits
  });
  const resolvedYUnits = resolvePositionValue({
    raw: yposStr,
    parentSize: parentHeight,
    selfSize: heightUnits
  });
  const pinCorner = parseInt(getStr('pinCorner') || '0', 10) || 0;
  const parsedZpos = parseInt(zposStr, 10);
  const labelText = getStr('labelText') || '';
  const formattedLabelText = labelText ? labelText.replace(/\\n/g, '\n') : '';
  const hasLabelContent = formattedLabelText.trim().length > 0;

  const computedBorder =
    schemeBorderStyle ||
    (resolvedOutlineColor ? `1px solid ${resolvedOutlineColor}` : undefined);
  let finalBorder = computedBorder;
  const needsDashedFallback =
    !skipSelfRender &&
    !hasTexture &&
    !resolvedBgColor &&
    !resolvedFgColor &&
    !computedBorder &&
    !hasLabelContent;

  if (needsDashedFallback) {
    finalBorder =
      finalBorder || `1px dashed ${outlineColor ?? 'rgba(255,255,255,0.4)'}`;
  }

  const horizAlignment =
    pinCorner === 1 || pinCorner === 3
      ? 'right'
      : pinCorner === 0 || pinCorner === 2
        ? 'left'
        : 'center';
  const vertAlignment =
    pinCorner === 2 || pinCorner === 3
      ? 'bottom'
      : pinCorner === 0 || pinCorner === 1
        ? 'top'
        : 'center';

  const style: React.CSSProperties = {
    position: 'absolute',
    left:
      horizAlignment === 'left'
        ? resolvedXUnits * scaleX
        : horizAlignment === 'right'
          ? (resolvedXUnits - widthUnits) * scaleX
          : (resolvedXUnits - widthUnits / 2) * scaleX,
    top:
      vertAlignment === 'top'
        ? resolvedYUnits * scaleY
        : vertAlignment === 'bottom'
          ? (resolvedYUnits - heightUnits) * scaleY
          : (resolvedYUnits - heightUnits / 2) * scaleY,
    zIndex: Number.isNaN(parsedZpos) ? 0 : parsedZpos,
    width: widthUnits * scaleX,
    height: heightUnits * scaleY,
    display: visible ? 'block' : 'none',
    color: resolvedFgColor,
    backgroundColor: resolvedBgColor,
    border: finalBorder,
    overflow: 'visible',
    fontFamily: fontFamily,
    fontSize: `${fontSize * Math.min(scaleX, scaleY)}px`,
    cursor: line && onElementClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s ease'
  };

  const textAlignment = (getStr('textAlignment') || 'west').toLowerCase();

  // Text Alignment mapping
  const alignmentMap: Record<
    string,
    { justifyContent: string; alignItems: string }
  > = {
    'north-west': { justifyContent: 'flex-start', alignItems: 'flex-start' },
    north: { justifyContent: 'center', alignItems: 'flex-start' },
    'north-east': { justifyContent: 'flex-end', alignItems: 'flex-start' },
    west: { justifyContent: 'flex-start', alignItems: 'center' },
    center: { justifyContent: 'center', alignItems: 'center' },
    east: { justifyContent: 'flex-end', alignItems: 'center' },
    'south-west': { justifyContent: 'flex-start', alignItems: 'flex-end' },
    south: { justifyContent: 'center', alignItems: 'flex-end' },
    'south-east': { justifyContent: 'flex-end', alignItems: 'flex-end' }
  };
  const alignmentStyles = alignmentMap[textAlignment] ?? alignmentMap['west'];

  const spanClassName = wrapText
    ? 'whitespace-pre-wrap break-words'
    : 'whitespace-nowrap';

  if (labelText && !skipSelfRender) {
    return (
      <div
        title={fieldName}
        data-hud-line={line}
        data-hud-source={sourceFile}
        className='relative'
        style={{
          ...style,
          display: visible ? 'flex' : 'none',
          justifyContent: alignmentStyles.justifyContent,
          alignItems: alignmentStyles.alignItems
        }}
      >
        <span className={spanClassName} style={{ lineHeight: 1.1 }}>
          {formattedLabelText}
        </span>
        {isFontMissing && (
          <Tooltip content={`Missing font: ${mappedFamily} (${fontName})`}>
            <ExclamationTriangleIcon className='absolute top-0 right-0 text-yellow-500' />
          </Tooltip>
        )}
        {line && hoveredLine === line && (
          <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
            <span className='whitespace-nowrap'>{fieldName}</span>
          </div>
        )}
      </div>
    );
  }

  if (
    !skipSelfRender &&
    (controlName === 'ImagePanel' || controlName === 'CExImageButton')
  ) {
    // CExImageButton might have text too, but usually it's an image or bg.
    if (imageValue) {
      return (
        <div
          title={fieldName}
          data-hud-line={line}
          data-hud-source={sourceFile}
          className='relative'
          style={{
            ...style,
            display: visible ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            border:
              schemeBorderStyle ??
              (resolvedOutlineColor
                ? `1px solid ${resolvedOutlineColor}`
                : finalBorder || '1px solid #444'),
            // Source Engine missing texture pattern (purple/black checkerboard)
            backgroundImage:
              'repeating-conic-gradient(#ff00ff 0% 25%, #000000 0% 50%)',
            backgroundSize: '20px 20px',
            opacity: 0.8
          }}
        >
          {line && hoveredLine === line && (
            <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
              <span className='whitespace-nowrap'>{fieldName}</span>
            </div>
          )}
        </div>
      );
    }
  }

  const renderChildren = () =>
    Object.entries(data).map(([childKey, childNode]) => {
      if (isConditionalBlockKey(childKey)) {
        return null;
      }
      // Merge definitions for this child key
      let mergedData: KVMap = {};
      let lastSourceFile: string | undefined;
      let lastLine: number | undefined;
      let shouldShow = false;

      for (const def of childNode.definitions) {
        if (typeof def.value === 'object') {
          if (checkCondition(def.condition, platform)) {
            mergedData = mergeKVMap(mergedData, def.value);
            lastSourceFile = def.sourceFile;
            lastLine = def.line;
            shouldShow = true;
          }
        }
      }

      if (!shouldShow) return null;

      return (
        <HudComponent
          key={childKey}
          name={childKey}
          data={mergedData}
          fontMap={fontMap}
          loadedFonts={loadedFonts}
          line={lastLine}
          onElementClick={onElementClick}
          outlineColor={outlineColor}
          hoveredLine={hoveredLine}
          onHover={onHover}
          scaleX={scaleX}
          scaleY={scaleY}
          platform={platform}
          sourceFile={lastSourceFile}
          parentWidth={widthUnits}
          parentHeight={heightUnits}
          onSkipElement={onSkipElement}
          schemeColors={schemeColors}
          schemeBaseSettings={schemeBaseSettings}
          schemeBorders={schemeBorders}
        />
      );
    });

  const containerStyle = skipSelfRender
    ? {
        ...style,
        backgroundColor: 'transparent',
        border: 'none'
      }
    : style;

  return (
    <div
      style={containerStyle}
      title={fieldName}
      data-hud-line={line}
      data-hud-source={sourceFile}
      className='relative'
    >
      {renderChildren()}
      {!skipSelfRender && line && hoveredLine === line && (
        <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none z-50'>
          <span className='whitespace-nowrap'>{fieldName}</span>
        </div>
      )}
    </div>
  );
}
