import {
  Flex,
  Text,
  ScrollArea,
  Card,
  IconButton,
  Button,
  Dialog,
  Tooltip,
  Select,
  AlertDialog,
  DropdownMenu
} from '@radix-ui/themes';
import { useState, useEffect, useRef } from 'react';
import {
  parseKeyValues,
  parseKeyValuesWithLineNumbers,
  KeyValues,
  KVMap,
  extractBaseIncludes,
  mergeKVMap,
  checkCondition
} from '../lib/keyvalues';
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
  HamburgerMenuIcon,
  UploadIcon
} from '@radix-ui/react-icons';
import JSZip from 'jszip';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

function parseColor(colorStr: string): string {
  if (!colorStr) return 'transparent';

  const parts = colorStr.split(' ').map(Number);
  if (parts.length >= 3) {
    const a = parts.length > 3 ? parts[3] / 255 : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return colorStr;
}

function parsePosition(
  posStr: string,
  axis: 'x' | 'y',
  scale: number = 1
): React.CSSProperties {
  if (!posStr) return axis === 'x' ? { left: 0 } : { top: 0 };

  const str = String(posStr).toLowerCase();

  if (str.startsWith('c')) {
    const offset = parseInt(str.substring(1)) || 0;
    return axis === 'x'
      ? { left: '50%', marginLeft: `${offset * scale}px` }
      : { top: '50%', marginTop: `${offset * scale}px` };
  }
  if (str.startsWith('r')) {
    const offset = parseInt(str.substring(1)) || 0;
    return axis === 'x'
      ? { right: `${offset * scale}px`, left: 'auto' }
      : { bottom: `${offset * scale}px`, top: 'auto' };
  }
  return axis === 'x'
    ? { left: `${parseInt(str) * scale}px` }
    : { top: `${parseInt(str) * scale}px` };
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
  onElementClick,
  outlineColor,
  hoveredLine,
  onHover,
  scaleX = 1,
  scaleY = 1,
  platform = 'WIN32',
  sourceFile
}: {
  name: string;
  data: KVMap;
  isRoot?: boolean;
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
}) {
  const textRef = useRef<HTMLDivElement>(null);

  // Dynamic text sizing
  useEffect(() => {
    if (textRef.current) {
      const el = textRef.current;
      const parent = el.parentElement;
      if (parent) {
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;
        const textWidth = el.scrollWidth;
        const textHeight = el.scrollHeight;

        let scale = 1;
        if (textWidth > parentWidth || textHeight > parentHeight) {
          const scaleW = parentWidth / textWidth;
          const scaleH = parentHeight / textHeight;
          scale = Math.min(scaleW, scaleH);
        }

        el.style.transform = `scale(${Math.min(1, scale)})`;
        el.style.transformOrigin = 'center'; // Or based on alignment
      }
    }
  }); // Run on every render to adjust to size changes

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
        const cond = def.condition.replace(/[\[\]]/g, ''); // remove []
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
  const posStyleX = parsePosition(xposStr, 'x', scaleX);
  const posStyleY = parsePosition(yposStr, 'y', scaleY);

  const style: React.CSSProperties = {
    position: isRoot ? 'relative' : 'absolute',
    ...posStyleX,
    ...posStyleY,
    zIndex: parseInt(zposStr),
    width: wideStr ? parseInt(wideStr) * scaleX : isRoot ? '100%' : 0,
    height: tallStr ? parseInt(tallStr) * scaleY : isRoot ? '100%' : 0,
    display: visible ? 'block' : 'none',
    color: parseColor(getStr('fgcolor')),
    backgroundColor: parseColor(getStr('bgcolor')),
    // Border for debugging/visibility if no bg
    border: getStr('bgcolor')
      ? 'none'
      : isRoot
        ? '1px solid rgba(255,255,255,0.5)'
        : `1px dashed ${outlineColor || 'rgba(255,255,255,0.1)'}`,
    overflow: 'visible',
    fontFamily: fontFamily,
    fontSize: `${fontSize * Math.min(scaleX, scaleY)}px`,
    cursor: !isRoot && line && onElementClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s ease'
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
        data-hud-line={line}
        data-hud-source={sourceFile}
        className={`relative ${!isRoot && line ? '' : ''}`}
        style={{
          ...style,
          display: visible ? 'flex' : 'none',
          justifyContent,
          alignItems
        }}
      >
        <span ref={textRef} className='whitespace-nowrap'>
          {labelText.replace(/%[a-zA-Z0-9_]+%/g, 'VAR')}
        </span>
        {isFontMissing && (
          <Tooltip content={`Missing font: ${mappedFamily} (${fontName})`}>
            <ExclamationTriangleIcon className='absolute top-0 right-0 text-yellow-500' />
          </Tooltip>
        )}
        {!isRoot && line && hoveredLine === line && (
          <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
            <span className='whitespace-nowrap'>{fieldName}</span>
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
          data-hud-line={line}
          data-hud-source={sourceFile}
          className={`relative ${!isRoot && line ? '' : ''}`}
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
          {!isRoot && line && hoveredLine === line && (
            <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none'>
              <span className='whitespace-nowrap'>{fieldName}</span>
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
      data-hud-line={line}
      data-hud-source={sourceFile}
      className={`relative ${!isRoot && line ? '' : ''}`}
    >
      {Object.entries(data).map(([childKey, childNode]) => {
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
          />
        );
      })}
      {!isRoot && line && hoveredLine === line && (
        <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/70 text-white text-xs font-mono px-2 py-1 pointer-events-none z-50'>
          <span className='whitespace-nowrap'>{fieldName}</span>
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

function resolvePath(currentPath: string, importPath: string): string {
  // Normalize slashes
  const normalizedImport = importPath.replace(/\\/g, '/');
  const normalizedCurrent = currentPath.replace(/\\/g, '/');

  // If it looks like a root path (starts with resource/ or scripts/), use it as is
  if (
    normalizedImport.toLowerCase().startsWith('resource/') ||
    normalizedImport.toLowerCase().startsWith('scripts/')
  ) {
    return normalizedImport;
  }

  const currentDir = normalizedCurrent.substring(
    0,
    normalizedCurrent.lastIndexOf('/')
  );
  const parts = [
    ...currentDir.split('/').filter((p) => p),
    ...normalizedImport.split('/').filter((p) => p)
  ];

  const stack: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      stack.pop();
    } else if (part !== '.') {
      stack.push(part);
    }
  }

  return stack.join('/');
}

const STORAGE_KEY = 'hud-editor-storage';

function saveToStorage(path: string, content: string) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[path] = content;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

function loadFromStorage(path: string): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return data[path] || null;
  } catch (e) {
    console.error('Failed to load from storage', e);
    return null;
  }
}

export default function HudEditor() {
  const { theme } = useTheme();
  const [files, setFiles] = useState<HudFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
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
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [customWidth, setCustomWidth] = useState('16');
  const [customHeight, setCustomHeight] = useState('9');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [editorWidth, setEditorWidth] = useState(600);
  const [isResizing, setIsResizing] = useState<
    'sidebar' | 'editor' | 'preview-height' | null
  >(null);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>(
    'horizontal'
  );
  const [outlineColor, setOutlineColor] = useState<string>(
    'rgba(255,255,255,0.1)'
  );
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [platform, setPlatform] = useState<string>('WIN32');
  const [fileCache, setFileCache] = useState<Record<string, string>>({});
  const [parsedPreview, setParsedPreview] = useState<KVMap | null>(null);

  // Update outline color based on theme
  useEffect(() => {
    setOutlineColor(isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)');
  }, [isDark]);

  const activeFile = files[activeFileIndex];

  const [previewHeight, setPreviewHeight] = useState(400);
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

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
      // Just check for syntax errors
      parseKeyValuesWithLineNumbers(activeFile.content);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [activeFile]);

  const handleElementClick = (line: number, sourceFile?: string) => {
    if (sourceFile && sourceFile !== files[activeFileIndex]?.path) {
      // Switch to the file
      const fileIndex = files.findIndex((f) => f.path === sourceFile);
      if (fileIndex !== -1) {
        setActiveFileIndex(fileIndex);
        // Wait for editor to switch? The effect will run.
        // We might need to scroll after switch.
        // For now, let's just switch. The user can click again or we can try to scroll.
        // Ideally we pass a 'scrollToLine' state.
      } else {
        // File not open, try to open it?
        // We have the content in cache, so we can add it to files.
        const content = fileCache[sourceFile];
        if (content) {
          setFiles((prev) => [
            ...prev,
            { name: sourceFile, path: sourceFile, content }
          ]);
          setActiveFileIndex(files.length);
        }
      }
    }

    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
  };

  const handleCodeChange = (newCode: string) => {
    const newFiles = [...files];
    const file = newFiles[activeFileIndex];
    newFiles[activeFileIndex] = {
      ...file,
      content: newCode
    };
    setFiles(newFiles);

    // Save to local storage
    if (file.path) {
      saveToStorage(file.path, newCode);
      // Also update cache so other files using this as base see the change immediately
      setFileCache((prev) => ({ ...prev, [file.path]: newCode }));
    }
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
          filesToAdd.push({
            name: file.name,
            path: `uploaded/${file.name}`,
            content
          });
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

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  const downloadHud = async () => {
    const zip = new JSZip();

    // Recursive function to add files to zip
    const addFilesToZip = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          if (node.children) {
            await addFilesToZip(node.children);
          }
        } else {
          // It's a file
          let content = loadFromStorage(node.path);

          if (!content) {
            try {
              const res = await fetch(`/default_hud/${node.path}`);
              if (res.ok) {
                content = await res.text();
              }
            } catch (e) {
              console.error(`Failed to fetch ${node.path} for download`, e);
            }
          }

          if (content) {
            zip.file(node.path, content);
          }
        }
      }
    };

    await addFilesToZip(fileTree);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hud_export.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const zip = await JSZip.loadAsync(arrayBuffer);

        const promises: Promise<void>[] = [];

        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            promises.push(
              zipEntry.async('string').then((content) => {
                // Save to storage
                // We use the relative path from the zip as the key
                saveToStorage(relativePath, content);
              })
            );
          }
        });

        await Promise.all(promises);

        // Reload to reflect changes
        window.location.reload();
      } catch (err) {
        console.error('Failed to import HUD', err);
        alert('Failed to import HUD. Please ensure it is a valid ZIP file.');
      }
    };
    reader.readAsArrayBuffer(file);
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
      // Check local storage first
      const stored = loadFromStorage(node.path);
      let text = stored;

      if (!text) {
        const res = await fetch(`/default_hud/${node.path}`);
        text = await res.text();
      }

      setFiles((prev) => [
        ...prev,
        { name: node.name, path: node.path, content: text! }
      ]);
      setFileCache((prev) => ({ ...prev, [node.path]: text! }));
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

  // Helper to merge KVMaps - MOVED TO LIB
  // const mergeKVMap = ...

  // Recursive function to load base files and parse
  const loadAndParse = async (
    path: string,
    visited: Set<string> = new Set()
  ): Promise<KVMap> => {
    if (visited.has(path)) return {}; // Cycle detection
    visited.add(path);

    let content = fileCache[path];

    // If not in cache (and not the active file which might be newer), try to fetch
    // Note: active file content is in files[activeFileIndex].content
    const activeFile = files.find((f) => f.path === path);
    if (activeFile) {
      content = activeFile.content;
    }

    if (!content) {
      // Check storage
      const stored = loadFromStorage(path);
      if (stored) {
        content = stored;
        setFileCache((prev) => ({ ...prev, [path]: content! }));
      } else {
        try {
          const res = await fetch(`/default_hud/${path}`);
          if (!res.ok) throw new Error('Not found');
          content = await res.text();
          setFileCache((prev) => ({ ...prev, [path]: content! }));
        } catch (e) {
          console.warn(`Failed to load base file: ${path}`, e);
          return {};
        }
      }
    }

    const includes = extractBaseIncludes(content);
    let mergedBase: KVMap = {};

    // Process includes in order (assuming top-down)
    for (const include of includes) {
      const resolvedPath = resolvePath(path, include);
      const baseMap = await loadAndParse(resolvedPath, visited);
      mergedBase = mergeKVMap(mergedBase, baseMap);
    }

    const currentMap = parseKeyValuesWithLineNumbers(content);

    // Attach source file to definitions
    const attachSource = (map: KVMap) => {
      for (const node of Object.values(map)) {
        if (node.definitions) {
          for (const def of node.definitions) {
            def.sourceFile = path;
            if (typeof def.value === 'object') {
              attachSource(def.value);
            }
          }
        }
      }
    };
    attachSource(currentMap);

    return mergeKVMap(mergedBase, currentMap);
  };

  // Effect to update parsed preview when active file changes
  useEffect(() => {
    if (activeFileIndex === -1 || !files[activeFileIndex]) {
      setParsedPreview(null);
      return;
    }

    const activeFile = files[activeFileIndex];

    // Debounce slightly to avoid rapid re-fetching during typing if we were fetching
    // But since we cache, it might be fine.
    // However, we need to handle the async nature.

    let isMounted = true;

    const update = async () => {
      const result = await loadAndParse(activeFile.path, new Set());
      if (isMounted) {
        setParsedPreview(result);
      }
    };

    update();

    return () => {
      isMounted = false;
    };
  }, [activeFileIndex, files, fileCache]); // Depend on fileCache to trigger re-parse if a base file loads
  // Note: We depend on 'files' so if user edits the active file, it re-runs.
  // Ideally we should depend on files[activeFileIndex].content but that's hard to express.
  // 'files' changes on every edit.

  // Calculate preview dimensions based on aspect ratio and available space
  const getPreviewDimensions = () => {
    const scrollbarMargin = 24; // Safety margin for scrollbars
    const topBarHeight = 64; // Header height (pt-16 = 4rem = 64px)
    const controlsHeight = 40; // Height of the controls bar
    const paddingY = 32; // Vertical padding (p-4 top + p-4 bottom)
    const paddingX = 80; // Main container padding + gaps + resize handles

    // Total vertical space occupied by UI elements other than the preview/editor area
    const uiVerticalOverhead =
      topBarHeight + controlsHeight + paddingY + scrollbarMargin;

    const availableHeight = window.innerHeight - uiVerticalOverhead;
    const availableWidth =
      window.innerWidth -
      (layoutMode === 'horizontal'
        ? sidebarWidth + editorWidth + paddingX
        : paddingX) -
      scrollbarMargin;

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
        const widthIfConstrained = Math.round(
          (availableHeight * aspectW) / aspectH
        );

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
    }

    return { width, height };
  };

  const previewDimensions = getPreviewDimensions();

  // Resize handlers
  const handleMouseDown =
    (panel: 'sidebar' | 'editor' | 'preview-height') =>
    (e: React.MouseEvent) => {
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

        const sidebarOffset = sidebarWidth + 20;
        const minPreviewWidth = 300; // Minimum width to keep for preview
        const maxEditorWidth =
          window.innerWidth - sidebarOffset - minPreviewWidth - 40; // 40 for paddings/margins

        const newWidth = Math.max(
          400,
          Math.min(maxEditorWidth, e.clientX - sidebarOffset - 16)
        );
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
  }, [isResizing, sidebarWidth, layoutMode]);

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    // Get all elements under cursor
    const elements = document.elementsFromPoint(e.clientX, e.clientY);

    // Filter for HUD elements with line numbers
    const hudElements = elements.filter((el) =>
      el.hasAttribute('data-hud-line')
    );

    if (hudElements.length === 0) {
      if (hoveredLine !== null) setHoveredLine(null);
      return;
    }

    // Sort by area (smallest first) to prioritize nested elements
    // We can approximate area by clientWidth * clientHeight
    const sorted = hudElements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      const areaA = rectA.width * rectA.height;
      const areaB = rectB.width * rectB.height;
      return areaA - areaB;
    });

    const target = sorted[0];
    const line = parseInt(target.getAttribute('data-hud-line') || '0');

    if (line && line !== hoveredLine) {
      setHoveredLine(line);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    // Get all elements under cursor
    const elements = document.elementsFromPoint(e.clientX, e.clientY);

    // Filter for HUD elements with line numbers
    const hudElements = elements.filter((el) =>
      el.hasAttribute('data-hud-line')
    );

    if (hudElements.length === 0) return;

    // Sort by area (smallest first)
    const sorted = hudElements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      const areaA = rectA.width * rectA.height;
      const areaB = rectB.width * rectB.height;
      return areaA - areaB;
    });

    const target = sorted[0];
    const line = parseInt(target.getAttribute('data-hud-line') || '0');
    // We need to get the source file from the element too?
    // We can't easily get the source file from the DOM element unless we add it as attribute.
    // Let's add data-hud-source attribute.
    const source = target.getAttribute('data-hud-source') || undefined;

    if (line) {
      handleElementClick(line, source);
    }
  };

  const handlePreviewMouseLeave = () => {
    setHoveredLine(null);
  };

  // Calculate scales
  const scaleX = previewDimensions.width / 640;
  const scaleY = previewDimensions.height / 480;

  return (
    <Flex
      className='min-h-screen w-full pt-16'
      direction='column'
      gap='2'
      px='4'
      pb='2'
    >
      {/* Top Controls Bar */}
      <Flex justify='end' align='center' gap='4' className='flex-shrink-0 mb-2'>
        <Flex gap='2' align='center'>
          {/* Desktop Toolbar */}
          <Flex gap='2' align='center' className='hidden lg:flex'>
            <Text size='2'>Layout:</Text>
            <Button
              size='1'
              variant='soft'
              onClick={() =>
                setLayoutMode(
                  layoutMode === 'horizontal' ? 'vertical' : 'horizontal'
                )
              }
            >
              {layoutMode === 'horizontal' ? 'Horizontal' : 'Vertical'}
            </Button>

            <div className={`border-l ${borderColor} h-6 mx-2`}></div>

            <Flex gap='2' align='center'>
              <Text size='2'>Outline:</Text>
              <div className='relative w-6 h-6 rounded overflow-hidden border border-gray-300'>
                <input
                  type='color'
                  value={
                    outlineColor.startsWith('#') ? outlineColor : '#ffffff'
                  } // Simple fallback for color input
                  onChange={(e) => setOutlineColor(e.target.value)}
                  className='absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer'
                />
              </div>
            </Flex>

            <div className={`border-l ${borderColor} h-6 mx-2`}></div>

            <Button onClick={downloadHud} variant='surface'>
              <DownloadIcon />
              Download HUD
            </Button>

            <label>
              <input
                type='file'
                accept='.zip'
                style={{ display: 'none' }}
                onChange={handleImport}
              />
              <Button variant='surface' style={{ cursor: 'pointer' }} asChild>
                <span>
                  <UploadIcon />
                  Import HUD
                </span>
              </Button>
            </label>

            <Text size='2'>Platform:</Text>
            <Select.Root value={platform} onValueChange={setPlatform}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value='WIN32'>Windows (WIN32)</Select.Item>
                <Select.Item value='X360'>Xbox 360 (X360)</Select.Item>
                <Select.Item value='OSX'>Mac (OSX)</Select.Item>
                <Select.Item value='LINUX'>Linux</Select.Item>
              </Select.Content>
            </Select.Root>

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

            <div className={`border-l ${borderColor} h-6 mx-2`}></div>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button color='red' variant='soft'>
                  Reset HUD
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content maxWidth='450px'>
                <AlertDialog.Title>Reset HUD</AlertDialog.Title>
                <AlertDialog.Description size='2'>
                  Are you sure? This will delete all your local changes and
                  restore the default HUD files. This action cannot be undone.
                </AlertDialog.Description>

                <Flex gap='3' mt='4' justify='end'>
                  <AlertDialog.Cancel>
                    <Button variant='soft' color='gray'>
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant='solid' color='red' onClick={handleReset}>
                      Reset HUD
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>

          {/* Mobile Menu */}
          <Flex className='lg:hidden'>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton variant='ghost'>
                  <HamburgerMenuIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <Flex direction='column' gap='2'>
                  <Text size='2'>Aspect Ratio</Text>
                  <Select.Root
                    value={aspectRatio}
                    onValueChange={setAspectRatio}
                  >
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value='4:3'>4:3</Select.Item>
                      <Select.Item value='16:9'>16:9</Select.Item>
                      <Select.Item value='16:10'>16:10</Select.Item>
                      <Select.Item value='custom'>Custom</Select.Item>
                    </Select.Content>
                  </Select.Root>

                  <Text size='2'>Layout</Text>
                  <Select.Root
                    value={layoutMode}
                    onValueChange={(v: any) => setLayoutMode(v)}
                  >
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value='horizontal'>Horizontal</Select.Item>
                      <Select.Item value='vertical'>Vertical</Select.Item>
                    </Select.Content>
                  </Select.Root>

                  <Text size='2'>Platform</Text>
                  <Select.Root value={platform} onValueChange={setPlatform}>
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value='WIN32'>Windows (WIN32)</Select.Item>
                      <Select.Item value='X360'>Xbox 360 (X360)</Select.Item>
                      <Select.Item value='OSX'>Mac (OSX)</Select.Item>
                      <Select.Item value='LINUX'>Linux</Select.Item>
                    </Select.Content>
                  </Select.Root>

                  <DropdownMenu.Separator />

                  <Button onClick={downloadHud} variant='surface'>
                    <DownloadIcon />
                    Download HUD
                  </Button>

                  <label>
                    <input
                      type='file'
                      accept='.zip'
                      style={{ display: 'none' }}
                      onChange={handleImport}
                    />
                    <Button
                      variant='surface'
                      style={{ cursor: 'pointer', width: '100%' }}
                      asChild
                    >
                      <span>
                        <UploadIcon />
                        Import HUD
                      </span>
                    </Button>
                  </label>

                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <Button color='red' variant='soft'>
                        Reset Defaults
                      </Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content maxWidth='450px'>
                      <AlertDialog.Title>Reset HUD</AlertDialog.Title>
                      <AlertDialog.Description size='2'>
                        Are you sure? This will delete all your local changes
                        and restore the default HUD files. This action cannot be
                        undone.
                      </AlertDialog.Description>

                      <Flex gap='3' mt='4' justify='end'>
                        <AlertDialog.Cancel>
                          <Button variant='soft' color='gray'>
                            Cancel
                          </Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button
                            variant='solid'
                            color='red'
                            onClick={handleReset}
                          >
                            Reset HUD
                          </Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </Flex>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>

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
      <Flex
        className='flex-1 min-h-0'
        gap='2'
        direction={layoutMode === 'horizontal' ? 'row' : 'column'}
      >
        {/* Vertical Mode: Preview Section (Top) */}
        {layoutMode === 'vertical' && (
          <Flex
            direction='column'
            className='w-full'
            gap='2'
            style={{ flexShrink: 0 }}
          >
            <Text size='4'>Preview</Text>
            <Card
              className={`relative border ${borderColor} ${containerBg} p-0 overflow-hidden`}
            >
              <ScrollArea
                type='hover'
                scrollbars='both'
                style={{
                  width: '100%',
                  height: `${previewDimensions.height}px`
                }}
              >
                <div
                  className='relative shadow-lg'
                  style={{
                    width: `${previewDimensions.width}px`,
                    height: `${previewDimensions.height}px`,
                    minWidth: `${previewDimensions.width}px`,
                    minHeight: `${previewDimensions.height}px`,
                    // Background for the HUD area itself to distinguish it
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    margin: '0 auto'
                  }}
                  onMouseMove={handlePreviewMouseMove}
                  onMouseLeave={handlePreviewMouseLeave}
                  onClick={handlePreviewClick}
                >
                  {parsedPreview &&
                    Object.entries(parsedPreview).map(
                      ([childKey, childNode]) => {
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
                            isRoot={true}
                            fontMap={fontMap}
                            loadedFonts={fonts.map((f) => f.family)}
                            line={lastLine}
                            onElementClick={handleElementClick}
                            outlineColor={outlineColor}
                            hoveredLine={hoveredLine}
                            onHover={setHoveredLine}
                            scaleX={scaleX}
                            scaleY={scaleY}
                            platform={platform}
                            sourceFile={lastSourceFile}
                          />
                        );
                      }
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
              <div
                className={`w-16 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
              />
            </div>
          </Flex>
        )}

        {/* Sidebar and Editor Container */}
        <Flex
          className='flex-none min-h-0'
          gap='0'
          style={{
            width: '100%',
            height:
              layoutMode === 'vertical' ? '600px' : `${windowHeight - 135}px`,
            marginBottom: layoutMode === 'vertical' ? '16px' : '0'
          }}
          align='stretch'
        >
          {/* Sidebar */}
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
            className={`w-3 cursor-col-resize flex items-center justify-center rounded-md h-full ${isDark ? 'hover:bg-blue-500/50' : 'hover:bg-blue-400/50'} transition-colors`}
            onMouseDown={handleMouseDown('sidebar')}
            style={{ flexShrink: 0 }}
          >
            <div
              className={`h-8 w-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
            />
          </div>

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
                <Flex
                  gap='1'
                  className='pb-1'
                  style={{ minWidth: 'max-content' }}
                >
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
              <div
                className={`flex-1 border ${borderColor} rounded overflow-hidden`}
              >
                {activeFile && (
                  <Editor
                    height='100%'
                    defaultLanguage='keyvalues'
                    value={activeFile.content}
                    theme={isDark ? 'keyvalues-dark' : 'keyvalues-light'}
                    beforeMount={handleEditorWillMount}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
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
                className={`w-3 cursor-col-resize flex items-center justify-center h-full rounded-md ${isDark ? 'hover:bg-blue-500/50' : 'hover:bg-blue-400/50'} transition-colors`}
                onMouseDown={handleMouseDown('editor')}
                style={{ flexShrink: 0 }}
              >
                <div
                  className={`h-8 w-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
                />
              </div>

              <Flex direction='column' className='flex-1 h-full' gap='2'>
                <Text size='4'>Preview</Text>
                <Card
                  className={`flex-1 relative border ${borderColor} ${containerBg}`}
                >
                  <ScrollArea
                    type='hover'
                    scrollbars='both'
                    className='w-full h-full'
                  >
                    <div
                      className='relative'
                      style={{
                        width: `${previewDimensions.width}px`,
                        height: `${previewDimensions.height}px`,
                        minWidth: `${previewDimensions.width}px`,
                        minHeight: `${previewDimensions.height}px`
                      }}
                      onMouseMove={handlePreviewMouseMove}
                      onMouseLeave={handlePreviewMouseLeave}
                      onClick={handlePreviewClick}
                    >
                      {parsedPreview &&
                        Object.entries(parsedPreview).map(
                          ([childKey, childNode]) => {
                            // Merge definitions for this child key
                            let mergedData: KVMap = {};
                            let lastSourceFile: string | undefined;
                            let lastLine: number | undefined;
                            let shouldShow = false;

                            for (const def of childNode.definitions) {
                              if (typeof def.value === 'object') {
                                if (checkCondition(def.condition, platform)) {
                                  mergedData = mergeKVMap(
                                    mergedData,
                                    def.value
                                  );
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
                                isRoot={true}
                                fontMap={fontMap}
                                loadedFonts={fonts.map((f) => f.family)}
                                line={lastLine}
                                onElementClick={handleElementClick}
                                outlineColor={outlineColor}
                                hoveredLine={hoveredLine}
                                onHover={setHoveredLine}
                                scaleX={scaleX}
                                scaleY={scaleY}
                                platform={platform}
                                sourceFile={lastSourceFile}
                              />
                            );
                          }
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
