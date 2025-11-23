import {
  Flex,
  Text,
  ScrollArea,
  Card,
  IconButton,
  Button,
  Dialog,
  Tooltip,
  Select
} from '@radix-ui/themes';
import { useState, useEffect, useRef } from 'react';
import { parseKeyValues, parseKeyValuesWithLineNumbers, KeyValues, KVMap } from '../lib/keyvalues';
import {
  PlusIcon,
  Cross2Icon,
  FileTextIcon,
  DownloadIcon,
  FontBoldIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ReloadIcon,
  HamburgerMenuIcon
} from '@radix-ui/react-icons';
import JSZip from 'jszip';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

// Basic mapping of TF2 colors to CSS colors
const COLOR_MAP: Record<string, string> = {
  '0 0 0 255': 'black',
  '255 255 255 255': 'white',
  '255 0 0 255': 'red',
  '0 255 0 255': 'green',
  '0 0 255 255': 'blue'
};

function parseColor(colorStr: string): string {
  if (!colorStr) return 'transparent';
  if (COLOR_MAP[colorStr]) return COLOR_MAP[colorStr];

  const parts = colorStr.split(' ').map(Number);
  if (parts.length >= 3) {
    const a = parts.length > 3 ? parts[3] / 255 : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return colorStr;
}

function parsePosition(posStr: string, axis: 'x' | 'y'): React.CSSProperties {
  if (!posStr) return axis === 'x' ? { left: 0 } : { top: 0 };

  const str = String(posStr).toLowerCase();

  if (str.startsWith('c')) {
    const offset = parseInt(str.substring(1)) || 0;
    return axis === 'x'
      ? { left: '50%', marginLeft: `${offset}px` }
      : { top: '50%', marginTop: `${offset}px` };
  }
  if (str.startsWith('r')) {
    const offset = parseInt(str.substring(1)) || 0;
    return axis === 'x'
      ? { right: `${offset}px`, left: 'auto' }
      : { bottom: `${offset}px`, top: 'auto' };
  }
  return axis === 'x'
    ? { left: `${parseInt(str)}px` }
    : { top: `${parseInt(str)}px` };
}

type FontDefinition = {
  family: string;
  size: number;
};

function HudComponent({
  name,
  data,
  isRoot = false,
  fontMap,
  loadedFonts,
  line,
  onElementClick
}: {
  name: string;
  data: KVMap;
  isRoot?: boolean;
  fontMap: Record<string, FontDefinition>;
  loadedFonts: string[];
  line?: number;
  onElementClick?: (line: number) => void;
}) {
  if (typeof data !== 'object') return null;

  // Helper to safely get string value from KVNode
  const getStr = (key: string): string => {
    const node = data[key];
    return node && typeof node.value === 'string' ? node.value : '';
  };

  const controlName = getStr('ControlName');
  const fieldName = getStr('fieldName') || name;

  const xposStr = getStr('xpos') || '0';
  const yposStr = getStr('ypos') || '0';
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

  // Styles
  const posStyleX = parsePosition(xposStr, 'x');
  const posStyleY = parsePosition(yposStr, 'y');

  const style: React.CSSProperties = {
    position: isRoot ? 'relative' : 'absolute',
    ...posStyleX,
    ...posStyleY,
    zIndex: parseInt(zposStr),
    width: wideStr ? parseInt(wideStr) : isRoot ? '100%' : 0,
    height: tallStr ? parseInt(tallStr) : isRoot ? '100%' : 0,
    display: visible ? 'block' : 'none',
    color: parseColor(getStr('fgcolor')),
    backgroundColor: parseColor(getStr('bgcolor')),
    // Border for debugging/visibility if no bg
    border: getStr('bgcolor') ? 'none' : isRoot ? '1px solid rgba(255,255,255,0.5)' : '1px dashed rgba(255,255,255,0.1)',
    overflow: isRoot ? 'visible' : 'hidden',
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    cursor: !isRoot && line && onElementClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s ease'
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isRoot && line && onElementClick) {
      e.stopPropagation();
      onElementClick(line);
    }
  };

  const labelText = getStr('labelText') || '';
  const textAlignment = getStr('textAlignment') || 'west';

  // Text Alignment mapping
  let justifyContent = 'flex-start';
  let alignItems = 'flex-start';

  if (textAlignment.includes('center')) {
    justifyContent = 'center';
    alignItems = 'center';
  } else if (
    textAlignment.includes('east') ||
    textAlignment.includes('right')
  ) {
    justifyContent = 'flex-end';
  }

  if (controlName === 'CExLabel' || controlName === 'Label') {
    return (
      <div
        title={fieldName}
        onClick={handleClick}
        className={`relative ${!isRoot && line ? 'group' : ''}`}
        style={{
          ...style,
          display: visible ? 'flex' : 'none',
          justifyContent,
          alignItems
        }}
      >
        {labelText.replace(/%[a-zA-Z0-9_]+%/g, 'VAR')}
        {isFontMissing && (
          <Tooltip content={`Missing font: ${mappedFamily} (${fontName})`}>
            <ExclamationTriangleIcon className='absolute top-0 right-0 text-yellow-500' />
          </Tooltip>
        )}
        {!isRoot && line && (
          <div className='absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
            {fieldName}
          </div>
        )}
      </div>
    );
  }

  if (controlName === 'ImagePanel' || controlName === 'CExImageButton') {
    const image = getStr('image') || '';
    // CExImageButton might have text too, but usually it's an image or bg.
    // For now treat as image container if it has image, or just container.
    if (image) {
      return (
        <div
          title={fieldName}
          onClick={handleClick}
          className={`relative ${!isRoot && line ? 'group' : ''}`}
          style={{
            ...style,
            display: visible ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #444',
            // Source Engine missing texture pattern (purple/black checkerboard)
            backgroundImage:
              'repeating-conic-gradient(#ff00ff 0% 25%, #000000 0% 50%)',
            backgroundSize: '20px 20px',
            opacity: 0.8
          }}
        >
          <span
            style={{
              fontSize: '10px',
              color: 'white',
              textAlign: 'center',
              wordBreak: 'break-all',
              padding: '2px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: '4px'
            }}
          >
            {image}
          </span>
          {!isRoot && line && (
            <div className='absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
              {fieldName}
            </div>
          )}
        </div>
      );
    }
  }

  // Container or unknown
  return (
    <div 
      style={style} 
      title={fieldName} 
      onClick={handleClick}
      className={`relative ${!isRoot && line ? 'group' : ''}`}
    >
      {Object.entries(data).map(([childKey, childNode]) => {
        if (typeof childNode.value === 'object') {
          return (
            <HudComponent
              key={childKey}
              name={childKey}
              data={childNode.value}
              fontMap={fontMap}
              loadedFonts={loadedFonts}
              line={childNode.line}
              onElementClick={onElementClick}
            />
          );
        }
        return null;
      })}
      {!isRoot && line && (
        <div className='absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none z-50'>
          {fieldName}
        </div>
      )}
    </div>
  );
}

type HudFile = {
  name: string;
  path: string;
  content: string;
};

type FontFile = {
  name: string;
  url: string;
  family: string;
  blob: Blob;
};

type FileNode = {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
};

function FileTreeNode({
  node,
  level,
  onSelect,
  activePath,
  loadingPaths
}: {
  node: FileNode;
  level: number;
  onSelect: (node: FileNode) => void;
  activePath: string | null;
  loadingPaths: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hoverItemBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200';
  const activeItemBg = isDark ? 'bg-gray-800' : 'bg-gray-200';

  const isActive = node.path === activePath;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  return (
    <div style={{ paddingLeft: level * 12 }}>
      <Flex
        align='center'
        gap='2'
        className={`p-1 rounded cursor-pointer ${hoverItemBg} ${isActive ? activeItemBg : ''}`}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className='text-gray-500'>
            {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
        )}
        {node.type === 'file' && (
          <FileTextIcon className='text-gray-500 ml-4' />
        )}
        {loadingPaths.has(node.path) && (
          <ReloadIcon className='text-blue-500 ml-1 animate-spin' />
        )}
        <Text size='1' className='truncate select-none'>
          {node.name}
        </Text>
      </Flex>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              activePath={activePath}
              loadingPaths={loadingPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HudEditor() {
  const { theme } = useTheme();
  const [files, setFiles] = useState<HudFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [parsed, setParsed] = useState<KVMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';
  const containerBg = isDark ? 'bg-gray-900' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-300';
  const activeItemBg = isDark ? 'bg-gray-800' : 'bg-gray-200';
  const hoverItemBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200';

  const [isDragging, setIsDragging] = useState(false);

  // File Explorer State
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  // Font state
  const [fonts, setFonts] = useState<FontFile[]>([]);
  const [fontMap, setFontMap] = useState<Record<string, FontDefinition>>({}); // Scheme Name -> Definition
  const [showFontDialog, setShowFontDialog] = useState(false);

  // UI state
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [customWidth, setCustomWidth] = useState('16');
  const [customHeight, setCustomHeight] = useState('9');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [editorWidth, setEditorWidth] = useState(600);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'editor' | 'preview-height' | null>(null);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');

  const activeFile = files[activeFileIndex];

  const [previewHeight, setPreviewHeight] = useState(400);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load manifest
  useEffect(() => {
    fetch('/default_hud/manifest.json')
      .then((res) => res.json())
      .then((data) => setFileTree(data))
      .catch((err) => console.error('Failed to load manifest', err));
  }, []);

  // Parse ClientScheme.res to extract font mappings
  useEffect(() => {
    const clientScheme = files.find(
      (f: HudFile) => f.name.toLowerCase() === 'clientscheme.res'
    );
    if (clientScheme) {
      try {
        const scheme = parseKeyValues(clientScheme.content);
        const schemeFonts = (scheme['Scheme'] as KeyValues)?.[
          'Fonts'
        ] as KeyValues;

        if (schemeFonts) {
          const newMap: Record<string, FontDefinition> = {};
          Object.entries(schemeFonts).forEach(([fontName, fontDef]) => {
            // This is simplified. Real scheme parsing is complex (conditional blocks).
            // We look for "name" in the first block (usually "1")
            const firstBlock = (fontDef as KeyValues)?.['1'] as KeyValues;
            const family = firstBlock?.['name'] as string;
            const tall = firstBlock?.['tall'] as string;

            if (family) {
              newMap[fontName] = {
                family,
                size: parseInt(tall) || 14
              };
            }
          });
          setFontMap((prev) => ({ ...prev, ...newMap }));
        }
      } catch (e) {
        console.error('Failed to parse ClientScheme', e);
      }
    }
  }, [files]);

  useEffect(() => {
    if (!activeFile) return;
    try {
      const res = parseKeyValuesWithLineNumbers(activeFile.content);
      setParsed(res);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [activeFile]);

  const handleElementClick = (line: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
  };

  const handleCodeChange = (newCode: string) => {
    const newFiles = [...files];
    newFiles[activeFileIndex] = {
      ...newFiles[activeFileIndex],
      content: newCode
    };
    setFiles(newFiles);
  };

  const processFiles = (fileList: FileList) => {
    const filesToAdd: HudFile[] = [];
    let processedCount = 0;
    const totalFiles = fileList.length;

    Array.from(fileList).forEach((file) => {
      if (file.name.endsWith('.ttf') || file.name.endsWith('.otf')) {
        // Handle Font
        const url = URL.createObjectURL(file);
        // Extract family name? For now use filename without extension
        const family = file.name.split('.')[0];

        // Inject @font-face
        const style = document.createElement('style');
        style.textContent = `
                    @font-face {
                        font-family: '${family}';
                        src: url('${url}');
                    }
                `;
        document.head.appendChild(style);

        setFonts((prev: FontFile[]) => [
          ...prev,
          { name: file.name, url, family, blob: file }
        ]);
        processedCount++;
        if (processedCount === totalFiles) {
          setFiles((prev: HudFile[]) => [...prev, ...filesToAdd]);
        }
      } else {
        // Handle Text File
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          filesToAdd.push({ name: file.name, path: `uploaded/${file.name}`, content });
          processedCount++;

          if (processedCount === totalFiles) {
            setFiles((prev: HudFile[]) => [...prev, ...filesToAdd]);
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) return; // Don't remove last file

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  const downloadFonts = async () => {
    const zip = new JSZip();

    // Add fonts
    fonts.forEach((font: FontFile) => {
      zip.file(font.name, font.blob);
    });

    // Add ClientScheme if present
    const scheme = files.find(
      (f: HudFile) => f.name.toLowerCase() === 'clientscheme.res'
    );
    if (scheme) {
      zip.file('ClientScheme.res', scheme.content);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_fonts.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditorWillMount = (monaco: any) => {
    // Register custom language
    monaco.languages.register({ id: 'keyvalues' });

    // Define tokens
    monaco.languages.setMonarchTokensProvider('keyvalues', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
          [/[{}ئ]/, 'delimiter.bracket'],
          [/[a-zA-Z0-9_\-.]+/, 'keyword'], // Unquoted keys/values
          [/#base/, 'keyword.directive']
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ]
      }
    });

    // Define theme configuration (optional, vs-dark usually handles standard tokens well)
    monaco.editor.defineTheme('keyvalues-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'keyword', foreground: '9CDCFE' },
        { token: 'delimiter.bracket', foreground: 'D4D4D4' }
      ],
      colors: {}
    });

    monaco.editor.defineTheme('keyvalues-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000' },
        { token: 'string', foreground: 'A31515' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'delimiter.bracket', foreground: '000000' }
      ],
      colors: {}
    });
  };

  const handleNodeSelect = async (node: FileNode) => {
    if (node.type !== 'file') return;

    setActivePath(node.path);

    // Check if already loaded by path
    const existingIndex = files.findIndex((f) => f.path === node.path);
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex);
      return;
    }

    // Show loading indicator
    setLoadingPaths((prev) => new Set(prev).add(node.path));

    try {
      const res = await fetch(`/default_hud/${node.path}`);
      const text = await res.text();

      setFiles((prev) => [...prev, { name: node.name, path: node.path, content: text }]);
      setActiveFileIndex(files.length); // It will be the last one
    } catch (e) {
      console.error('Failed to load file', e);
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
    }
  };

  // Calculate preview dimensions based on aspect ratio and available space
  const getPreviewDimensions = () => {
    const scrollbarMargin = 24; // Safety margin for scrollbars
    const topBarHeight = 64; // Header height (pt-16 = 4rem = 64px)
    const controlsHeight = 40; // Height of the controls bar
    const paddingY = 32; // Vertical padding (p-4 top + p-4 bottom)
    const paddingX = 80; // Main container padding + gaps + resize handles

    // Total vertical space occupied by UI elements other than the preview/editor area
    const uiVerticalOverhead = topBarHeight + controlsHeight + paddingY + scrollbarMargin;

    const availableHeight = window.innerHeight - uiVerticalOverhead;
    const availableWidth = window.innerWidth - (layoutMode === 'horizontal' ? (sidebarVisible ? sidebarWidth : 0) + editorWidth + paddingX : paddingX) - scrollbarMargin;
    
    let aspectW, aspectH;
    if (aspectRatio === 'custom') {
      aspectW = parseInt(customWidth) || 16;
      aspectH = parseInt(customHeight) || 9;
    } else {
      [aspectW, aspectH] = aspectRatio.split(':').map(Number);
    }
    
    let width, height;
    
    if (layoutMode === 'horizontal') {
      // In horizontal mode, try to fit within available height
      
      // First, calculate dimensions based on available width
      width = Math.min(1600, availableWidth);
      height = Math.round((width * aspectH) / aspectW);
      
      // If height exceeds available height, check if we can constrain it
      if (height > availableHeight) {
        const widthIfConstrained = Math.round((availableHeight * aspectW) / aspectH);
        
        // Only constrain by height if the resulting width is not too small (e.g. < 320px)
        if (widthIfConstrained >= 320) {
          height = availableHeight;
          width = widthIfConstrained;
        }
      }
    } else {
      // Vertical mode - use the user-resizable height
      height = previewHeight;
      width = Math.round((height * aspectW) / aspectH);
      
      // If width exceeds available width, constrain by width
      if (width > availableWidth) {
        width = availableWidth;
        height = Math.round((width * aspectH) / aspectW);
      }
    }
    
    return { width, height };
  };

  const previewDimensions = getPreviewDimensions();

  // Resize handlers
  const handleMouseDown = (panel: 'sidebar' | 'editor' | 'preview-height') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(panel);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      if (isResizing === 'sidebar') {
        const newWidth = Math.max(200, Math.min(500, e.clientX - 16));
        setSidebarWidth(newWidth);
      } else if (isResizing === 'editor') {
        // In vertical mode, editor width is shared with sidebar
        if (layoutMode === 'vertical') {
           return;
        }
        
        const sidebarOffset = sidebarVisible ? sidebarWidth + 20 : 0;
        const newWidth = Math.max(400, e.clientX - sidebarOffset - 16);
        setEditorWidth(newWidth);
      } else if (isResizing === 'preview-height') {
        const newHeight = Math.max(200, e.clientY - 120); // Offset for top bar + controls
        setPreviewHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, sidebarVisible, sidebarWidth, layoutMode]);

  return (
    <Flex className='min-h-screen w-full pt-16' direction='column' gap='2' px='4' pb='2'>
        {/* Top Controls Bar */}
        <Flex justify='between' align='center' gap='4' className='flex-shrink-0 mb-2'>
        <Flex gap='2' align='center'>
          <IconButton
            size='2'
            onClick={() => setSidebarVisible(!sidebarVisible)}
          >
            <HamburgerMenuIcon />
          </IconButton>
          <Text size='2' weight='bold'>TF2 HUD Editor</Text>
        </Flex>

        <Flex gap='2' align='center'>
          <Text size='2'>Layout:</Text>
          <Button
            size='1'
            variant='soft'
            onClick={() => setLayoutMode(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')}
          >
            {layoutMode === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </Button>

          <div className={`border-l ${borderColor} h-6 mx-2`}></div>

          <Text size='2'>Aspect Ratio:</Text>
          <Select.Root value={aspectRatio} onValueChange={setAspectRatio}>
            <Select.Trigger />
            <Select.Content>
              <Select.Item value='4:3'>4:3</Select.Item>
              <Select.Item value='16:9'>16:9</Select.Item>
              <Select.Item value='16:10'>16:10</Select.Item>
              <Select.Item value='custom'>Custom</Select.Item>
            </Select.Content>
          </Select.Root>

          {aspectRatio === 'custom' && (
            <Flex gap='1' align='center'>
              <input
                type='number'
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className={`w-16 px-2 py-1 rounded border ${borderColor} ${containerBg}`}
                min='1'
              />
              <Text size='2'>:</Text>
              <input
                type='number'
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                className={`w-16 px-2 py-1 rounded border ${borderColor} ${containerBg}`}
                min='1'
              />
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* Main Content */}
      {/* Main Content */}
      <Flex className='flex-1 min-h-0' gap='2' direction={layoutMode === 'horizontal' ? 'row' : 'column'}>
        
        {/* Vertical Mode: Preview Section (Top) */}
        {layoutMode === 'vertical' && (
          <Flex
            direction='column'
            className='w-full'
            gap='2'
            style={{ flexShrink: 0 }}
          >
            <Text size='4'>Preview</Text>
            <Card className={`relative border ${borderColor} ${containerBg}`}>
              <ScrollArea
                type='auto'
                scrollbars='both'
                style={{
                  width: '100%',
                  height: `${previewDimensions.height}px`
                }}
              >
                <div
                  className='relative'
                  style={{
                    width: `${previewDimensions.width}px`,
                    height: `${previewDimensions.height}px`,
                    minWidth: `${previewDimensions.width}px`,
                    minHeight: `${previewDimensions.height}px`,
                    margin: '0 auto'
                  }}
                >
                  {parsed &&
                    Object.entries(parsed).map(([childKey, childNode]) =>
                      typeof childNode.value === 'object' ? (
                        <HudComponent
                          key={childKey}
                          name={childKey}
                          data={childNode.value}
                          isRoot={true}
                          fontMap={fontMap}
                          loadedFonts={fonts.map((f) => f.family)}
                          line={childNode.line}
                          onElementClick={handleElementClick}
                        />
                      ) : null
                    )}
                </div>
              </ScrollArea>
            </Card>

            {/* Resize Handle for Preview Height */}
            <div
              className={`h-3 cursor-row-resize w-full ${isDark ? 'hover:bg-blue-500/50' : 'hover:bg-blue-400/50'} transition-colors flex items-center justify-center`}
              onMouseDown={handleMouseDown('preview-height')}
              style={{ flexShrink: 0 }}
            >
              <div className={`w-16 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
            </div>
          </Flex>
        )}

        {/* Sidebar and Editor Container */}
        <Flex 
          className='flex-none min-h-0' 
          gap='0'
          style={{
            width: layoutMode === 'horizontal' ? 'auto' : '100%',
            height: layoutMode === 'vertical' ? '600px' : `${windowHeight - 135}px`,
            marginBottom: layoutMode === 'vertical' ? '16px' : '0'
          }}
          align='stretch'
        >
          {/* Sidebar */}
          {sidebarVisible && (
            <>
              <Flex
                direction='column'
                className={`h-full rounded-md border transition-colors overflow-hidden ${containerBg} ${isDragging ? 'border-blue-500' : borderColor}`}
                p='2'
                gap='2'
                style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Flex justify='between' align='center' className='mb-2'>
                  <Text size='3'>Files</Text>
                  <input
                    type='file'
                    multiple
                    ref={fileInputRef}
                    className='hidden'
                    onChange={handleFileUpload}
                    accept='.res,.txt,.ttf,.otf'
                  />
                  <Flex gap='2'>
                    <IconButton
                      size='1'
                      variant='ghost'
                      onClick={() => setShowFontDialog(true)}
                    >
                      <FontBoldIcon />
                    </IconButton>
                    <IconButton
                      size='1'
                      variant='ghost'
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PlusIcon />
                    </IconButton>
                  </Flex>
                </Flex>

                <ScrollArea className='flex-1'>
                  <Flex direction='column' gap='1'>
                    {fileTree.map((node) => (
                      <FileTreeNode
                        key={node.path}
                        node={node}
                        level={0}
                        onSelect={handleNodeSelect}
                        activePath={activePath}
                        loadingPaths={loadingPaths}
                      />
                    ))}
                  </Flex>
                </ScrollArea>

                {isDragging && (
                  <Flex
                    align='center'
                    justify='center'
                    className='absolute inset-0 bg-black/50 pointer-events-none rounded-md'
                  >
                    <Text size='4'>Drop files here</Text>
                  </Flex>
                )}
              </Flex>

              <div
                className={`w-3 cursor-col-resize flex items-center justify-center h-full ${isDark ? 'hover:bg-blue-500/50' : 'hover:bg-blue-400/50'} transition-colors`}
                onMouseDown={handleMouseDown('sidebar')}
                style={{ flexShrink: 0 }}
              >
                <div className={`h-8 w-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
              </div>
            </>
          )}

          {/* Editor */}
          <Flex
            direction='column'
            className='h-full'
            gap='2'
            style={{ 
              width: layoutMode === 'horizontal' ? `${editorWidth}px` : 'auto',
              flex: layoutMode === 'horizontal' ? 'none' : '1',
              flexShrink: 0 
            }}
          >
            {files.length > 0 && (
              <ScrollArea
                type='auto'
                scrollbars='horizontal'
                className={`border-b ${borderColor}`}
                style={{ maxHeight: '42px' }}
              >
                <Flex gap='1' className='pb-1' style={{ minWidth: 'max-content' }}>
                  {files.map((file, index) => (
                    <Flex
                      key={file.path}
                      align='center'
                      gap='2'
                      className={`px-3 py-1 rounded-t cursor-pointer whitespace-nowrap ${
                        index === activeFileIndex
                          ? `${activeItemBg} border-b-2 border-blue-500`
                          : hoverItemBg
                      }`}
                      onClick={() => setActiveFileIndex(index)}
                    >
                      <FileTextIcon className='flex-shrink-0' />
                      <Text size='2' className='select-none'>
                        {file.name}
                      </Text>
                      <IconButton
                        size='1'
                        variant='ghost'
                        className='flex-shrink-0'
                        onClick={(e) => removeFile(index, e)}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>
                  ))}
                </Flex>
              </ScrollArea>
            )}

            <Flex direction='column' className='flex-1 min-h-0'>
              <div className={`flex-1 border ${borderColor} rounded overflow-hidden`}>
                {activeFile && (
                  <Editor
                    height='100%'
                    defaultLanguage='keyvalues'
                    value={activeFile.content}
                    theme={isDark ? 'keyvalues-dark' : 'keyvalues-light'}
                    beforeMount={handleEditorWillMount}
                    onMount={(editor) => { editorRef.current = editor; }}
                    onChange={(value) => handleCodeChange(value || '')}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      padding: { top: 16, bottom: 16 },
                      fixedOverflowWidgets: true
                    }}
                  />
                )}
              </div>
              {error && <Text color='red'>{error}</Text>}
            </Flex>
          </Flex>

          {/* Horizontal Mode: Resize Handle & Preview */}
          {layoutMode === 'horizontal' && (
            <>
              <div
                className={`w-3 cursor-col-resize flex items-center justify-center h-full ${isDark ? 'hover:bg-blue-500/50' : 'hover:bg-blue-400/50'} transition-colors`}
                onMouseDown={handleMouseDown('editor')}
                style={{ flexShrink: 0 }}
              >
                <div className={`h-8 w-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
              </div>

              <Flex direction='column' className='flex-1 h-full' gap='2'>
                <Text size='4'>Preview</Text>
                <Card className={`flex-1 relative border ${borderColor} ${containerBg}`}>
                  <ScrollArea type='auto' scrollbars='both' className='w-full h-full'>
                    <div
                      className='relative'
                      style={{
                        width: `${previewDimensions.width}px`,
                        height: `${previewDimensions.height}px`,
                        minWidth: `${previewDimensions.width}px`,
                        minHeight: `${previewDimensions.height}px`
                      }}
                    >
                      {parsed &&
                        Object.entries(parsed).map(([childKey, childNode]) =>
                          typeof childNode.value === 'object' ? (
                            <HudComponent
                              key={childKey}
                              name={childKey}
                              data={childNode.value}
                              isRoot={true}
                              fontMap={fontMap}
                              loadedFonts={fonts.map((f) => f.family)}
                              line={childNode.line}
                              onElementClick={handleElementClick}
                            />
                          ) : null
                        )}
                    </div>
                  </ScrollArea>
                </Card>
              </Flex>
            </>
          )}
        </Flex>
      </Flex>

      {/* Font Dialog */}
      <Dialog.Root open={showFontDialog} onOpenChange={setShowFontDialog}>
        <Dialog.Content>
          <Dialog.Title>Font Manager</Dialog.Title>
          <Dialog.Description>
            Upload .ttf/.otf files and ClientScheme.res to map fonts.
          </Dialog.Description>

          <Flex direction='column' gap='3' className='mt-4'>
            <Text weight='bold'>Loaded Fonts:</Text>
            {fonts.length === 0 && <Text color='gray'>No fonts loaded.</Text>}
            {fonts.map((font: FontFile, i: number) => (
              <Flex key={i} justify='between' align='center'>
                <Text>
                  {font.name} ({font.family})
                </Text>
              </Flex>
            ))}

            <Text weight='bold' className='mt-2'>
              Mappings (from ClientScheme):
            </Text>
            {Object.keys(fontMap).length === 0 && (
              <Text color='gray'>
                No mappings found. Load ClientScheme.res.
              </Text>
            )}
            <ScrollArea className='max-h-40'>
              <Flex direction='column' gap='1'>
                {Object.entries(fontMap).map(([schemeName, def]) => (
                  <Text key={schemeName} size='1'>
                    {schemeName} -&gt; {def.family} ({def.size}px)
                  </Text>
                ))}
              </Flex>
            </ScrollArea>

            <Button onClick={downloadFonts} disabled={fonts.length === 0}>
              <DownloadIcon /> Download Fonts Zip
            </Button>
          </Flex>

          <Flex gap='3' mt='4' justify='end'>
            <Dialog.Close>
              <Button variant='soft' color='gray'>
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
);
}
