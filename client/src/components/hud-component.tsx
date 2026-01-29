import React from 'react';
import {
  KVMap,
  KeyValues,
  mergeKVMap,
  checkCondition,
  isConditionalBlockKey
} from '../lib/keyvalues';
import { loadTexture } from '../lib/texture-loader';
import { useState, useEffect } from 'react';
import { parseColor, isTransparentColor } from '../lib/colors';
import { clientScheme } from '../lib/client-scheme';
import { useBorder } from '../hooks/use-border';
import { useModTextures } from '../contexts/ModTexturesContext';
import { VGUIControlRenderer, VGUIControlProps } from './vgui-controls';

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
  onMissingFont,
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
  onMissingFont?: (info: {
    name: string;
    line?: number;
    fontName: string;
    mappedFamily: string;
    sourceFile?: string;
  }) => void;
  schemeColors: Record<string, string>;
  schemeBaseSettings: Record<string, string>;
  schemeBorders: Record<string, KeyValues>;
}) {
  const { getIcon } = useModTextures();
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
  const fontName = getStr('font') || 'Default';

  const fontDef = fontName ? fontMap[fontName] : null;
  const mappedFamily = fontDef?.family || 'tf2build';
  const fontSize = fontDef?.size || 14; // Default to 14px if unknown

  // Check if font is loaded (if it's not a generic one)
  const isFontMissing =
    fontName &&
    mappedFamily !== 'inherit' &&
    !loadedFonts.includes(mappedFamily) &&
    !['Arial', 'Verdana', 'Tahoma'].includes(mappedFamily);
  const fontFamily = isFontMissing ? 'monospace' : mappedFamily;
  const wrapText = getStr('wrap') === '1';
  
  // Check for various image keys
  const imageValue = getStr('image') || getStr('activeimage') || getStr('icon') || getStr('image_default') || '';

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

  const borderStyle = useBorder(clientScheme, borderName);

  const hasTexture = Boolean(imageValue);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const iconDef = getIcon(imageValue);
  const [iconTextureSize, setIconTextureSize] = useState<{width: number, height: number} | null>(null);

  useEffect(() => {
    if (hasTexture && imageValue) {
      let isMounted = true;
      
      if (iconDef && iconDef.file) {
         // Load icon texture
         // mod_textures.txt paths are relative to materials/, so we pass empty searchPath
         loadTexture(iconDef.file, '').then((url) => {
            if (isMounted && url) {
               setTextureUrl(url);
               const img = new Image();
               img.onload = () => {
                  if (isMounted) setIconTextureSize({width: img.naturalWidth, height: img.naturalHeight});
               };
               img.src = url;
            }
         });
      } else if (!iconDef) {
          // Load regular texture
          loadTexture(imageValue).then((url) => {
            if (isMounted) {
              if (url) {
                setTextureUrl(url);
              }
            }
          });
      }
      
      return () => {
        isMounted = false;
      };
    } else {
        setTextureUrl(null);
    }
  }, [imageValue, hasTexture, iconDef]);

  const hasVisibleBackground =
    Boolean(resolvedBgColor) && !isTransparentColor(resolvedBgColor);

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

  let heightUnits =
    resolvedHeightUnits ??
    parentHeight ??
    baseSize.height ??
    SCREEN_BASE_HEIGHT;
  let widthUnits =
    resolvedWidthUnits ?? parentWidth ?? baseSize.width ?? SCREEN_BASE_WIDTH;

  let skipSelfRender = false;
  if (heightUnits <= 0 || widthUnits <= 0) {
    if (hasRenderableChildren) {
      skipSelfRender = true;
      const fallbackHeight =
        baseSize.height || parentHeight || SCREEN_BASE_HEIGHT || 1;
      const fallbackWidth =
        baseSize.width || parentWidth || SCREEN_BASE_WIDTH || 1;
      heightUnits = fallbackHeight;
      widthUnits = fallbackWidth;
    } else {
      onSkipElement?.({ name: fieldName, line, reason: 'zero-size' });
      return null;
    }
  }

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

  const hasBorderStyle = Object.keys(borderStyle).length > 0;
  const computedBorder = hasBorderStyle
    ? undefined
    : resolvedOutlineColor
      ? `1px solid ${resolvedOutlineColor}`
      : undefined;
  let finalBorder = computedBorder;
  const lacksVisualFill =
    !skipSelfRender &&
    !hasTexture &&
    !hasLabelContent &&
    !hasVisibleBackground &&
    !hasBorderStyle;
  const dashedOutlineColor = outlineColor ?? 'rgba(255,255,255,0.4)';
  const dashedOutlineStyle = `1px dashed ${dashedOutlineColor}`;

  if (lacksVisualFill) {
    finalBorder = finalBorder || dashedOutlineStyle;
  }

  const horizAlignment =
    pinCorner === 1 || pinCorner === 3 || pinCorner === 5
      ? 'right'
      : pinCorner === 0 || pinCorner === 2 || pinCorner === 7
        ? 'left'
        : 'center'; // 4, 6
  const vertAlignment =
    pinCorner === 2 || pinCorner === 3 || pinCorner === 6
      ? 'bottom'
      : pinCorner === 0 || pinCorner === 1 || pinCorner === 4
        ? 'top'
        : 'center'; // 5, 7

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
    ...borderStyle,
    outline: lacksVisualFill ? dashedOutlineStyle : undefined,
    outlineOffset: 0,
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

  // VGUI Control Integration
  const isVGUIControl = [
    'ProgressBar',
    'ContinuousProgressBar',
    'CircularProgressBar',
    'Button',
    'ToggleButton',
    'CheckButton',
    'Panel',
    'EditablePanel',
    'ScalableImagePanel',
    'CTFImagePanel',
    'CExLabel',
    'CExButton',
    'ImagePanel'
  ].includes(controlName || '');

  if (isVGUIControl && !skipSelfRender) {
     const vguiProps: VGUIControlProps = {
        name: fieldName,
        data: data,
        fontMap: fontMap,
        scaleX: scaleX,
        scaleY: scaleY,
        parentWidth: parentWidth,
        parentHeight: parentHeight,
        visible: visible,
        enabled: getStr('enabled') !== '0',
        zpos: Number.isNaN(parsedZpos) ? 0 : parsedZpos,
        xpos: resolvedXUnits,
        ypos: resolvedYUnits,
        wide: widthUnits,
        tall: heightUnits,
        fgColor: resolvedFgColor,
        bgColor: resolvedBgColor,
        paintBackground: getStr('paintbackground') !== '0',
        paintBorder: getStr('paintborder') !== '0',
        style: {
            border: finalBorder,
            ...borderStyle,
            outline: lacksVisualFill ? dashedOutlineStyle : undefined,
            cursor: line && onElementClick ? 'pointer' : 'default',
        },
        children: hasRenderableChildren ? (
            <>
              {/* 
                Reverse render order: 
                Elements defined FIRST in the file should appear ON TOP visually.
                By reversing the array, the first element becomes the last in the DOM, 
                which (with same z-index) causes it to paint on top of previous siblings.
                This satisfies "First in file = Top visually", even for shared z-pos.
              */}
              {Object.entries(data).reverse().map(([key, node]) => {
                if (
                  ['ControlName', 'fieldName', 'font', 'labelText'].includes(key)
                )
                  return null;
                
                // Merge definitions for this child
                let mergedChildData: KVMap = {};
                let lastLine: number | undefined;
                let lastSourceFile: string | undefined;
                let foundAny = false;

                if (node.definitions) {
                    for (const def of node.definitions) {
                        if (typeof def.value !== 'object') continue;
                        
                        if (checkCondition(def.condition, platform)) {
                            foundAny = true;
                            mergedChildData = mergeKVMap(mergedChildData, def.value as KVMap);
                            lastLine = def.line;
                            if (def.sourceFile) {
                                lastSourceFile = def.sourceFile;
                            }
                        }
                    }
                }

                if (!foundAny) return null;
                
                const effectiveSourceFile = lastSourceFile || sourceFile;
    
                return (
                  <HudComponent
                    key={key}
                    name={key}
                    data={mergedChildData}
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
                    sourceFile={effectiveSourceFile}
                    parentWidth={widthUnits}
                    parentHeight={heightUnits}
                    onSkipElement={onSkipElement}
                    onMissingFont={onMissingFont}
                    schemeColors={schemeColors}
                    schemeBaseSettings={schemeBaseSettings}
                    schemeBorders={schemeBorders}
                  />
                );
              })}
            </>
        ) : undefined
     };

     return (
        <div
            style={{
                position: 'absolute',
                left: horizAlignment === 'left'
                    ? resolvedXUnits * scaleX
                    : horizAlignment === 'right'
                      ? (resolvedXUnits - widthUnits) * scaleX
                      : (resolvedXUnits - widthUnits / 2) * scaleX,
                top: vertAlignment === 'top'
                    ? resolvedYUnits * scaleY
                    : vertAlignment === 'bottom'
                      ? (resolvedYUnits - heightUnits) * scaleY
                      : (resolvedYUnits - heightUnits / 2) * scaleY,
                width: widthUnits * scaleX,
                height: heightUnits * scaleY,
                zIndex: Number.isNaN(parsedZpos) ? 0 : parsedZpos,
                display: visible ? 'block' : 'none',
            }}
            title={fieldName}
            data-hud-line={line}
            data-hud-source={sourceFile}
            onClick={(e) => {
                e.stopPropagation();
                if (line && onElementClick) onElementClick(line, sourceFile);
            }}
            onMouseEnter={(e) => {
                e.stopPropagation();
                if (onHover) onHover(line || null);
            }}
            onMouseLeave={(e) => {
                e.stopPropagation();
                if (onHover) onHover(null);
            }}
        >
            <VGUIControlRenderer 
                controlName={controlName || 'Panel'} 
                controlProps={{
                    ...vguiProps,
                    xpos: 0,
                    ypos: 0,
                    scaleX: 1,
                    scaleY: 1,
                    wide: widthUnits * scaleX,
                    tall: heightUnits * scaleY,
                    parentWidth: widthUnits,
                    parentHeight: heightUnits,
                }} 
            />
            {/* Hover overlay */}
            {line && hoveredLine === line && (
                <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none z-50'>
                  <span className='whitespace-nowrap'>{fieldName}</span>
                </div>
            )}
        </div>
     );
  }

  // ... (rest of existing logic)


  if (
    !skipSelfRender &&
    (controlName === 'ImagePanel' || controlName === 'CExImageButton' || controlName === 'CTFImagePanel' || controlName === 'CIconPanel')
  ) {
    // CExImageButton might have text too, but usually it's an image or bg.
    if (imageValue) {
      if (iconDef) {
          if (iconDef.font && iconDef.character) {
             // Font Icon
             const iconFontDef = fontMap[iconDef.font];
             const iconFontFamily = iconFontDef?.family || 'inherit';
             const iconFontSize = iconFontDef?.size || fontSize;
             
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
                    fontFamily: iconFontFamily,
                    fontSize: `${iconFontSize * Math.min(scaleX, scaleY)}px`,
                  }}
                >
                  {iconDef.character}
                  {line && hoveredLine === line && (
                    <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
                      <span className='whitespace-nowrap'>{fieldName}</span>
                    </div>
                  )}
                </div>
             );
          } else if (iconDef.file && textureUrl && iconTextureSize) {
             // Sprite Icon
             const x = parseInt(iconDef.x || '0', 10);
             const y = parseInt(iconDef.y || '0', 10);
             const w = parseInt(iconDef.width || '0', 10);
             const h = parseInt(iconDef.height || '0', 10);
             
             // We need to scale the background image so that the sprite region maps to the element size?
             // No, usually icons are fixed size, but the element might be scaled.
             // The element size is `widthUnits` x `heightUnits`.
             // The sprite is `w` x `h` in the texture.
             
             // If we use background-position, we need the background-size to be correct relative to the element.
             // Actually, the easiest way is to use an inner div that is the size of the *texture*, positioned negatively.
             // But we want to scale it to fit the element?
             // Usually icons in HUD are drawn at 1:1 scale of the screen resolution (or scaled by resolution).
             
             // Let's assume we want to display the sprite region (x,y,w,h) inside the element.
             // We can use background-position and background-size.
             // background-size should be: (textureWidth / w) * elementWidth
             
             // Wait, if the element is 64x64, and the sprite is 64x64, and texture is 256x256.
             // We want the sprite to fill the element.
             // So we want the 64x64 region to be 64x64 (or whatever the element size is).
             
             // Scale factor = elementWidth / w
             // bgSizeX = textureWidth * scaleFactor
             // bgSizeY = textureHeight * scaleFactor
             // bgPosX = -x * scaleFactor
             // bgPosY = -y * scaleFactor
             
             const scaleW = (widthUnits * scaleX) / w;
             const scaleH = (heightUnits * scaleY) / h;
             
             // Use the smaller scale to maintain aspect ratio? Or stretch?
             // HUD icons usually stretch if the element size is different.
             
             const bgSizeX = iconTextureSize.width * scaleW;
             const bgSizeY = iconTextureSize.height * scaleH;
             const bgPosX = -x * scaleW;
             const bgPosY = -y * scaleH;
             
             return (
                <div
                  title={fieldName}
                  data-hud-line={line}
                  data-hud-source={sourceFile}
                  className='relative'
                  style={{
                    ...style,
                    display: visible ? 'block' : 'none',
                    overflow: 'hidden',
                    border:
                      resolvedOutlineColor
                        ? `1px solid ${resolvedOutlineColor}`
                        : finalBorder || '1px solid #444',
                    ...borderStyle,
                  }}
                >
                   <div style={{
                       width: '100%',
                       height: '100%',
                       backgroundImage: `url(${textureUrl})`,
                       backgroundSize: `${bgSizeX}px ${bgSizeY}px`,
                       backgroundPosition: `${bgPosX}px ${bgPosY}px`,
                       backgroundRepeat: 'no-repeat'
                   }} />
                   
                  {line && hoveredLine === line && (
                    <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
                      <span className='whitespace-nowrap'>{fieldName}</span>
                    </div>
                  )}
                </div>
             );
          }
      }
    
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
              resolvedOutlineColor
                ? `1px solid ${resolvedOutlineColor}`
                : finalBorder || '1px solid #444',
            ...borderStyle,
            // Source Engine missing texture pattern (purple/black checkerboard)
            backgroundImage: textureUrl
              ? `url(${textureUrl})`
              : 'repeating-conic-gradient(#ff00ff 0% 25%, #000000 0% 50%)',
            backgroundSize: textureUrl ? 'contain' : '20px 20px',
            backgroundRepeat: textureUrl ? 'no-repeat' : 'repeat',
            backgroundPosition: 'center',
            opacity: textureUrl ? 1 : 0.8
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

  if (labelText && !skipSelfRender) {
    if (isFontMissing && fontName) {
      onMissingFont?.({
        name: fieldName,
        line,
        fontName,
        mappedFamily,
        sourceFile
      });
    }

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
        {line && hoveredLine === line && (
          <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
            <span className='whitespace-nowrap'>{fieldName}</span>
          </div>
        )}
      </div>
    );
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
