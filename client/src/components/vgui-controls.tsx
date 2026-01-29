import React, { CSSProperties, useEffect, useState } from 'react';
import { KVMap } from '../lib/keyvalues';
import { FontDefinition } from './hud-component';
import { loadTexture } from '../lib/texture-loader';

import { useLocalization } from '../contexts/LocalizationContext';

// Common props for all VGUI controls
export interface VGUIControlProps {
  name: string;
  data: KVMap;
  fontMap: Record<string, FontDefinition>;
  scaleX: number;
  scaleY: number;
  parentWidth: number;
  parentHeight: number;
  visible: boolean;
  enabled: boolean;
  zpos: number;
  xpos: number;
  ypos: number;
  wide: number;
  tall: number;
  fgColor?: string;
  bgColor?: string;
  paintBackground: boolean;
  paintBorder: boolean;
  style?: CSSProperties;
  children?: React.ReactNode;
}

// Hook to simplify VGUI prop extraction (Case-Insensitive)
function useVGUIProps(data: KVMap) {
    const findKey = (target: string) => Object.keys(data).find(k => k.toLowerCase() === target.toLowerCase());

    const getStr = (key: string, defaultVal = '') => {
        const k = findKey(key);
        return k ? (data[k]?.definitions?.[0]?.value as string) || defaultVal : defaultVal;
    };
    
    const getInt = (key: string, defaultVal = 0) => {
        const k = findKey(key);
        return k ? parseInt((data[k]?.definitions?.[0]?.value as string) || String(defaultVal), 10) : defaultVal;
    };

    const getFloat = (key: string, defaultVal = 0.0) => {
        const k = findKey(key);
        return k ? parseFloat((data[k]?.definitions?.[0]?.value as string) || String(defaultVal)) : defaultVal;
    };
    
    return { getStr, getInt, getFloat };
}


// Helper to resolve color strings (e.g. "255 255 255 255" or "Red")
export function parseColor(colorStr: string, schemeColors: Record<string, string> = {}): string {
  if (!colorStr) return 'transparent';

  // Check if it's a scheme color name
  if (schemeColors[colorStr]) {
      return parseColor(schemeColors[colorStr], schemeColors);
  }

  const parts = colorStr.split(' ').map(Number);
  if (parts.length >= 3) {
    const a = parts.length > 3 ? parts[3] / 255 : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return colorStr;
}

// Base Panel Component
export function VGUIPanel(props: VGUIControlProps) {
  const {
      name,
      data,
      scaleX,
      scaleY,
      visible,
      xpos,
      ypos,
      wide,
      tall,
      zpos,
      fgColor,
      bgColor,
      paintBackground,
      paintBorder,
      style,
      children
  } = props;

  const { getInt } = useVGUIProps(data);
  const paintBackgroundType = getInt('PaintBackgroundType', 0);

  let backgroundStyle: CSSProperties = {};

  if (paintBackground) {
      switch (paintBackgroundType) {
          case 0: // Filled Rect
             backgroundStyle.backgroundColor = bgColor;
             break;
          case 1: // Texture
             // Fallback to fill for now as generic panels don't always have 'image' prop
             backgroundStyle.backgroundColor = bgColor; 
             break;
          case 2: // Outline
             backgroundStyle.border = `1px solid ${bgColor || 'white'}`;
             backgroundStyle.backgroundColor = 'transparent';
             break;
          case 3: // Fade Outline
             // Simulating DrawBoxFade with box-shadow
             backgroundStyle.boxShadow = `inset 0 0 8px ${bgColor || 'white'}`;
             backgroundStyle.backgroundColor = 'transparent';
             break;
          default:
             backgroundStyle.backgroundColor = bgColor;
             break;
      }
  } else {
      backgroundStyle.backgroundColor = 'transparent';
  }
  
  const baseStyle: CSSProperties = {
    position: 'absolute',
    left: xpos * scaleX,
    top: ypos * scaleY,
    width: wide * scaleX,
    height: tall * scaleY,
    zIndex: zpos,
    display: visible ? 'block' : 'none',
    color: fgColor,
    boxSizing: 'border-box', // Ensure borders don't expand size
    ...backgroundStyle,
    ...style
  };

  return (
    <div className={`vgui-panel ${name}`} style={baseStyle}>
      {children}
    </div>
  );
}

// Label Component
export function VGUILabel(props: VGUIControlProps) {
  const { data, fontMap, scaleX, scaleY } = props;
  const { localize } = useLocalization();
  const { getStr, getInt } = useVGUIProps(data);
  
  const rawLabelText = getStr('labelText');
  
  if (rawLabelText.toLowerCase().includes('gameui_parsebaseline')) {
      console.log(`[VGUILabel] Rendering label with text: "${rawLabelText}"`);
      const localized = localize(rawLabelText);
      console.log(`[VGUILabel] Localized result: "${localized}"`);
  }

  const labelText = localize(rawLabelText);
  const textAlignment = getStr('textAlignment', 'west');
  const fontName = getStr('font', 'Default');
  const wrap = getStr('wrap') === '1';
  const centerWrap = getStr('centerwrap') === '1';
  const textInsetX = getInt('textinsetx', 0);
  const textInsetY = getInt('textinsety', 0);

  const fontDef = fontMap[fontName];
  const fontFamily = fontDef?.family || 'tf2build';
  const fontSize = (fontDef?.size || 14) * Math.min(scaleX, scaleY);

  // Alignment mapping
  let justifyContent = 'flex-start';
  let alignItems = 'center';
  let textAlign: CSSProperties['textAlign'] = 'left';

  const align = textAlignment.toLowerCase();
  if (align.includes('west')) justifyContent = 'flex-start';
  else if (align.includes('east')) justifyContent = 'flex-end';
  else justifyContent = 'center';

  if (align.includes('north')) alignItems = 'flex-start';
  else if (align.includes('south')) alignItems = 'flex-end';
  else alignItems = 'center';

  if (align.includes('east')) textAlign = 'right';
  else if (align.includes('center')) textAlign = 'center';

  const labelStyle: CSSProperties = {
    display: 'flex',
    justifyContent,
    alignItems,
    paddingLeft: textInsetX * scaleX,
    paddingRight: textInsetX * scaleX,
    paddingTop: textInsetY * scaleY,
    paddingBottom: textInsetY * scaleY,
    fontFamily,
    fontSize: `${fontSize}px`,
    whiteSpace: wrap || centerWrap ? 'pre-wrap' : 'nowrap',
    textAlign: centerWrap ? 'center' : textAlign,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none'
  };

  // Handle variable replacement (simple version)
  const displayText = labelText.replace(/\\n/g, '\n');

  return (
    <VGUIPanel {...props}>
      <div style={labelStyle}>
        {displayText}
      </div>
    </VGUIPanel>
  );
}

// ImagePanel Component
export function VGUIImagePanel(props: VGUIControlProps) {
  const { data } = props;
  const { getStr } = useVGUIProps(data);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  const imageName = getStr('image');
  const scaleImage = getStr('scaleImage') === '1';
  const tileImage = getStr('tileImage') === '1';
  const fillcolorStr = getStr('fillcolor');

  useEffect(() => {
    if (imageName) {
      loadTexture(imageName).then(setTextureUrl);
    }
  }, [imageName]);

  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundImage: textureUrl ? `url(${textureUrl})` : undefined,
    backgroundSize: scaleImage ? '100% 100%' : 'auto',
    backgroundRepeat: tileImage ? 'repeat' : 'no-repeat',
    backgroundColor: fillcolorStr ? parseColor(fillcolorStr) : undefined,
  };

  return (
    <VGUIPanel {...props}>
      <div style={style} />
    </VGUIPanel>
  );
}

// ProgressBar Component
export function VGUIProgressBar(props: VGUIControlProps) {
  const { data, fgColor, bgColor } = props;
  const { getFloat, getStr } = useVGUIProps(data);
  
  const progress = getFloat('progress', 0.0);
  const dir = getStr('dir', 'east'); // east, west, north, south

  // Simple continuous bar for now, ignoring segments
  const barStyle: CSSProperties = {
    position: 'absolute',
    backgroundColor: fgColor || 'white',
  };

  if (dir === 'east') {
    barStyle.left = 0;
    barStyle.top = 0;
    barStyle.height = '100%';
    barStyle.width = `${progress * 100}%`;
  } else if (dir === 'west') {
    barStyle.right = 0;
    barStyle.top = 0;
    barStyle.height = '100%';
    barStyle.width = `${progress * 100}%`;
  } else if (dir === 'north') {
    barStyle.left = 0;
    barStyle.bottom = 0;
    barStyle.width = '100%';
    barStyle.height = `${progress * 100}%`;
  } else if (dir === 'south') {
    barStyle.left = 0;
    barStyle.top = 0;
    barStyle.width = '100%';
    barStyle.height = `${progress * 100}%`;
  }

  return (
    <VGUIPanel {...props} bgColor={bgColor || 'rgba(0,0,0,0.5)'} paintBackground={true}>
      <div style={barStyle} />
    </VGUIPanel>
  );
}

// CircularProgressBar Component
export function VGUICircularProgressBar(props: VGUIControlProps) {
  const { data, fgColor, bgColor } = props;
  const { getStr, getFloat } = useVGUIProps(data);
  const [fgTexture, setFgTexture] = useState<string | null>(null);
  const [bgTexture, setBgTexture] = useState<string | null>(null);

  const fgImage = getStr('fg_image');
  const bgImage = getStr('bg_image');
  const progress = getFloat('progress', 0.0);

  useEffect(() => {
    if (fgImage) loadTexture(fgImage).then(setFgTexture);
    if (bgImage) loadTexture(bgImage).then(setBgTexture);
  }, [fgImage, bgImage]);

  // Simplified implementation: just show the images on top of each other
  // A real implementation would need a conic gradient mask or SVG clip path
  
  return (
    <VGUIPanel {...props}>
      {bgTexture && (
        <img 
          src={bgTexture} 
          style={{ width: '100%', height: '100%', position: 'absolute' }} 
          alt=""
        />
      )}
      {fgTexture && (
        <img 
          src={fgTexture} 
          style={{ 
            width: '100%', 
            height: '100%', 
            position: 'absolute',
            opacity: progress // Very rough approximation
          }} 
          alt=""
        />
      )}
    </VGUIPanel>
  );
}

// CTFImagePanel (Class Icon)
export function CTFImagePanel(props: VGUIControlProps) {
    const { data } = props;
    const { getStr } = useVGUIProps(data);
    const [textureUrl, setTextureUrl] = useState<string | null>(null);

    const imageName = getStr('image');
    
    useEffect(() => {
        if (imageName) {
            loadTexture(imageName).then(setTextureUrl);
        }
    }, [imageName]);

    return (
        <VGUIPanel {...props}>
            {textureUrl && (
                <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${textureUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                }} />
            )}
        </VGUIPanel>
    );
}

// ScalableImagePanel
export function ScalableImagePanel(props: VGUIControlProps & { imageOverride?: string | null }) {
    const { data, imageOverride } = props;
    const { getStr } = useVGUIProps(data);
    const [textureUrl, setTextureUrl] = useState<string | null>(null);

    const imageName = imageOverride || getStr('image');
    const srcCornerHeight = getStr('src_corner_height'); // Slice margins
    const srcCornerWidth = getStr('src_corner_width');
    const drawColorStr = getStr('drawcolor');

    useEffect(() => {
        if (imageName) {
            loadTexture(imageName).then(setTextureUrl);
        }
    }, [imageName]);

    // This should ideally use border-image or 9-slice rendering
    // For now, simple background image
    return (
        <VGUIPanel {...props}>
            {textureUrl && (
                <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${textureUrl})`,
                    backgroundSize: '100% 100%',
                    opacity: drawColorStr ? 1 : undefined // TODO: Apply color
                }} />
            )}
        </VGUIPanel>
    );
}

// VGUIImageButton
export function VGUIImageButton(props: VGUIControlProps) {
    const { data } = props;
    const { getStr } = useVGUIProps(data);
    
    // Buttons have Up/Over/Down states
    const imageDefault = getStr('image_default');
    const imageArmed = getStr('image_armed');
    
    // For editor preview, just show default
    const effectiveImage = imageDefault || imageArmed;

    return (
        <ScalableImagePanel 
            {...props} 
            imageOverride={effectiveImage}
        />
    );
};

// -----------------------------------------------------------------------------
// CExLabel
// -----------------------------------------------------------------------------
const CExLabel: React.FC<VGUIControlProps> = (props) => {
    return <VGUILabel {...props} />;
};

// -----------------------------------------------------------------------------
// CExButton / CExImageButton
// -----------------------------------------------------------------------------
const CExButton: React.FC<VGUIControlProps> = (props) => {
    return <VGUIButton {...props} />;
};

// Button Component
export function VGUIButton(props: VGUIControlProps) {
    const { data, fontMap, scaleX, scaleY } = props;
    const { localize } = useLocalization();
    const { getStr, getInt } = useVGUIProps(data);
    
    const labelText = localize(getStr('labelText'));
    const fontName = getStr('font', 'Default');
    const textAlignment = getStr('textAlignment', 'center');
    
    const fontDef = fontMap[fontName];
    const fontFamily = fontDef?.family || 'tf2build';
    const fontSize = (fontDef?.size || 14) * Math.min(scaleX, scaleY);

    const buttonStyle: CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        fontFamily,
        fontSize: `${fontSize}px`,
        border: '1px solid rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(0,0,0,0.5)',
        cursor: 'pointer'
    };

    return (
        <VGUIPanel {...props}>
            <div style={buttonStyle}>
                {labelText}
            </div>
        </VGUIPanel>
    );
}


// Dispatcher Component
export function VGUIControlRenderer(props: {
  controlName: string;
  controlProps: VGUIControlProps;
}) {
  const { controlName, controlProps } = props;

  switch (controlName) {
    case 'Label':
    case 'VariableLabel':
      return <VGUILabel {...controlProps} />;
    case 'CExLabel':
      return <CExLabel {...controlProps} />;
    case 'ImagePanel':
      return <VGUIImagePanel {...controlProps} />;
    case 'ScalableImagePanel':
        return <ScalableImagePanel {...controlProps} />;
    case 'CTFImagePanel':
      return <CTFImagePanel {...controlProps} />;
    case 'ProgressBar':
    case 'ContinuousProgressBar':
      return <VGUIProgressBar {...controlProps} />;
    case 'CircularProgressBar':
      return <VGUICircularProgressBar {...controlProps} />;
    case 'Button':
    case 'ToggleButton':
    case 'CheckButton':
      return <VGUIButton {...controlProps} />;
    case 'CExButton':
        return <CExButton {...controlProps} />;
    case 'CExImageButton':
    case 'ImageButton':
        return <VGUIImageButton {...controlProps} />;
    case 'Panel':
    case 'EditablePanel':
      return <VGUIPanel {...controlProps} />;
    default:
      // Fallback for unknown controls, just render a panel container
      return <VGUIPanel {...controlProps} />;
  }
}
