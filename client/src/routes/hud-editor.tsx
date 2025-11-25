import {
  Flex,
  Text,
  ScrollArea,
  Card,
  IconButton,
  Button,
  Dialog,
  Select,
  AlertDialog,
  DropdownMenu,
  ContextMenu,
  Tooltip
} from '@radix-ui/themes';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ComponentProps } from 'react';
import {
  parseKeyValues,
  parseKeyValuesWithLineNumbers,
  KeyValues,
  KVMap,
  extractBaseIncludes,
  mergeKVMap,
  checkCondition,
  hasConditionalBlocks
} from '../lib/keyvalues';
import {
  saveFile,
  loadFile,
  clearAllFiles,
  deleteFile,
  getAllKeys
} from '../lib/storage';
import {
  PlusIcon,
  Cross2Icon,
  FileTextIcon,
  DownloadIcon,
  FontBoldIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ReloadIcon,
  HamburgerMenuIcon,
  UploadIcon,
  FilePlusIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircledIcon
} from '@radix-ui/react-icons';
import JSZip from 'jszip';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

import HudComponent, { FontDefinition } from '../components/hud-component';

type MonacoInstance = Parameters<
  NonNullable<ComponentProps<typeof Editor>['beforeMount']>
>[0];

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

type SkippedElement = {
  name: string;
  line?: number;
  reason: 'zero-size' | 'missing-position';
};

type MissingFont = {
  name: string;
  line?: number;
  fontName: string;
  mappedFamily: string;
  sourceFile?: string;
};

type SchemeBorderMap = Record<string, KeyValues>;

const CLIENT_SCHEME_FILE = 'clientscheme.res';
const WELCOME_FILE = 'welcome.res';

const normalizePathKey = (value: string) =>
  value.replace(/\\/g, '/').toLowerCase();

const pathMatchesClientScheme = (path: string) => {
  const normalized = normalizePathKey(path);
  return (
    normalized === CLIENT_SCHEME_FILE ||
    normalized.endsWith(`/${CLIENT_SCHEME_FILE}`)
  );
};

const matchesClientScheme = (name: string, path: string) =>
  name.toLowerCase() === CLIENT_SCHEME_FILE || pathMatchesClientScheme(path);

const isClientSchemeHudFile = (file: HudFile) =>
  matchesClientScheme(file.name, file.path);

const matchesWelcomeFile = (value: string) =>
  normalizePathKey(value) === WELCOME_FILE;

const isWelcomeFile = (file: HudFile) =>
  matchesWelcomeFile(file.name) || matchesWelcomeFile(file.path);

const isClientSchemeNode = (node: FileNode) =>
  matchesClientScheme(node.name, node.path);

const findClientSchemeNode = (nodes: FileNode[]): FileNode | null => {
  for (const node of nodes) {
    if (node.type === 'file' && isClientSchemeNode(node)) {
      return node;
    }
    if (node.children) {
      const found = findClientSchemeNode(node.children);
      if (found) return found;
    }
  }
  return null;
};

const findNodeByPath = (
  nodes: FileNode[],
  targetPath: string
): FileNode | null => {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
};

const pathExistsInTree = (nodes: FileNode[], targetPath: string): boolean => {
  for (const node of nodes) {
    if (node.path === targetPath) return true;
    if (node.children && pathExistsInTree(node.children, targetPath)) {
      return true;
    }
  }
  return false;
};

const insertFileNode = (
  nodes: FileNode[],
  parentPath: string | null,
  newNode: FileNode
): FileNode[] => {
  if (!parentPath) {
    return [...nodes, newNode];
  }

  return nodes.map((node) => {
    if (node.path === parentPath && node.type === 'folder') {
      return {
        ...node,
        children: node.children ? [...node.children, newNode] : [newNode]
      };
    }
    if (node.children) {
      return {
        ...node,
        children: insertFileNode(node.children, parentPath, newNode)
      };
    }
    return node;
  });
};

const sortFileNodes = (nodes: FileNode[]): FileNode[] => {
  return nodes
    .map((node) => ({
      ...node,
      children: node.children ? sortFileNodes(node.children) : undefined
    }))
    .sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'folder' ? -1 : 1;
    });
};

function FileTreeNode({
  node,
  level,
  onSelect,
  activePath,
  loadingPaths,
  onRename,
  onDelete,
  onCreateFolder,
  onCreateFile,
  onMove,
  renamingPath,
  onRenameSubmit,
  onRenameCancel,
  expandedPaths,
  onToggleExpand,
  scrollToPath
}: {
  node: FileNode;
  level: number;
  onSelect: (node: FileNode) => void;
  activePath: string | null;
  loadingPaths: Set<string>;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onCreateFolder: (parentPath: string | null) => void;
  onCreateFile: (parentPath: string | null) => void;
  onMove: (sourceNode: FileNode, targetNode: FileNode) => void;
  renamingPath: string | null;
  onRenameSubmit: (node: FileNode, newName: string) => void;
  onRenameCancel: () => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  scrollToPath: string | null;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hoverItemBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200';
  const activeItemBg = isDark ? 'bg-gray-800' : 'bg-gray-200';

  const [editName, setEditName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const isActive = node.path === activePath;
  const isRenaming = renamingPath === node.path;
  const isOpen = expandedPaths.has(node.path);

  useEffect(() => {
    if (scrollToPath === node.path && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [scrollToPath, node.path]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setEditName(node.name);
    }
  }, [isRenaming, node.name]);

  useEffect(() => {
    if (!isRenaming) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!inputRef.current) return;
      if (inputRef.current.contains(event.target as Node)) {
        return;
      }
      onRenameSubmit(node, editName);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isRenaming, editName, node, onRenameSubmit]);

  const getParentPath = () => {
    if (node.type === 'folder') {
      return node.path;
    }
    const lastSlash = node.path.lastIndexOf('/');
    if (lastSlash === -1) return null;
    return node.path.substring(0, lastSlash);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRenaming) return;

    if (node.type === 'folder') {
      onToggleExpand(node.path);
      onSelect(node);
    } else {
      onSelect(node);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify(node));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.type === 'folder') {
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.classList.add('bg-blue-500/20');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-blue-500/20');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-blue-500/20');

    if (node.type !== 'folder') return;

    try {
      const data = e.dataTransfer.getData('application/json');
      const sourceNode = JSON.parse(data) as FileNode;

      // Prevent dropping on itself or children (simple check)
      if (sourceNode.path === node.path) return;
      if (node.path.startsWith(sourceNode.path + '/')) return;

      onMove(sourceNode, node);
    } catch (err) {
      console.error('Failed to parse drop data', err);
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          ref={nodeRef}
          style={{ paddingLeft: level * 12 }}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
            {node.type === 'file' && <FileTextIcon className='text-gray-500' />}
            {loadingPaths.has(node.path) && (
              <ReloadIcon className='text-blue-500 ml-1 animate-spin' />
            )}
            <Text size='1' className='truncate select-none flex-1'>
              {isRenaming ? (
                <input
                  ref={inputRef}
                  type='text'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => onRenameSubmit(node, editName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onRenameSubmit(node, editName);
                    if (e.key === 'Escape') onRenameCancel();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full bg-transparent outline-none border-b border-blue-500 ${isDark ? 'text-white' : 'text-black'}`}
                />
              ) : (
                node.name
              )}
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
                  onRename={onRename}
                  onDelete={onDelete}
                  onCreateFolder={onCreateFolder}
                  onCreateFile={onCreateFile}
                  onMove={onMove}
                  renamingPath={renamingPath}
                  onRenameSubmit={onRenameSubmit}
                  onRenameCancel={onRenameCancel}
                  expandedPaths={expandedPaths}
                  onToggleExpand={onToggleExpand}
                  scrollToPath={scrollToPath}
                />
              ))}
            </div>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={() => onRename(node)}>
          Rename
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => onCreateFile(getParentPath())}>
          New File
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => onCreateFolder(getParentPath())}>
          New Folder
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item color='red' onSelect={() => onDelete(node)}>
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
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

const WELCOME_TEXT = `"stickbot/welcome.res"
{
	"WelcomePanel"
	{
		"ControlName"		"EditablePanel"
		"fieldName"		"WelcomePanel"
		"xpos"			"c-150"
		"ypos"			"c-75"
		"wide"			"300"
		"tall"			"150"
		"visible"		"1"
		"enabled"		"1"
		"bgcolor_override"	"46 43 42 255"
		"PaintBackgroundType"	"2"
		
		"WelcomeLabel"
		{
			"ControlName"	"Label"
			"fieldName"		"WelcomeLabel"
			"font"			"DefaultLarge"
			"labelText"		"Welcome to Stick's TF2 HUD Editor"
			"textAlignment"	"center"
			"xpos"			"0"
			"ypos"			"20"
			"wide"			"300"
			"tall"			"40"
			"fgcolor_override" "255 255 255 255"
		}
		
		"InstructionLabel"
		{
			"ControlName"	"Label"
			"fieldName"		"InstructionLabel"
			"font"			"Default"
			"labelText"		"Select a file to start editing."
			"textAlignment"	"center"
			"xpos"			"0"
			"ypos"			"60"
			"wide"			"300"
			"tall"			"60"
			"fgcolor_override" "200 200 200 255"
		}
	}
}
`;

export default function HudEditor() {
  const { theme } = useTheme();
  const [files, setFiles] = useState<HudFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<
    MonacoInstance['editor']['IStandaloneCodeEditor'] | null
  >(null);
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
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);

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
  const [showConditionalHint, setShowConditionalHint] = useState(false);
  const [schemeColors, setSchemeColors] = useState<Record<string, string>>({});
  const [schemeBaseSettings, setSchemeBaseSettings] = useState<
    Record<string, string>
  >({});
  const [schemeBorders, setSchemeBorders] = useState<SchemeBorderMap>({});
  const [skippedElements, setSkippedElements] = useState<SkippedElement[]>([]);
  const [missingFonts, setMissingFonts] = useState<MissingFont[]>([]);
  const [errorDialogMessage, setErrorDialogMessage] = useState<string | null>(
    null
  );

  // File Management State
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [scrollToPath, setScrollToPath] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);

  const skippedElementsRef = useRef<SkippedElement[]>([]);
  const missingFontsRef = useRef<MissingFont[]>([]);

  const getCurrentDirectoryPath = useCallback(() => {
    if (!activePath) return '';

    const activeNode = findNodeByPath(fileTree, activePath);
    if (activeNode?.type === 'folder') {
      return activeNode.path;
    }

    const lastSlash = activePath.lastIndexOf('/');
    if (lastSlash === -1) return '';
    return activePath.substring(0, lastSlash);
  }, [activePath, fileTree]);

  const showErrorDialog = useCallback((message: string) => {
    setErrorDialogMessage(message);
  }, []);
  const autoOpenedClientSchemeRef = useRef(false);


  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandToPath = useCallback((path: string) => {
    const parts = path.split('/');
    const pathsToExpand = new Set<string>();
    let current = '';
    // Don't expand the leaf node itself if it's a file, but if it's a folder we might want to?
    // Usually we expand parents.
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      pathsToExpand.add(current);
    }
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      pathsToExpand.forEach((p) => next.add(p));
      return next;
    });
  }, []);

  // Helper to save tree
  const saveTree = useCallback(async (tree: FileNode[]) => {
    const normalized = sortFileNodes(tree);
    setFileTree(normalized);
    await saveFile('__MANIFEST__', JSON.stringify(normalized));
  }, []);

  const handleRenameSubmit = async (node: FileNode, newName: string) => {
    setRenamingPath(null);
    if (!newName || newName === node.name) return;

    const oldPath = node.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    if (oldPath === newPath) return;

    // Recursive update function
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === oldPath) {
          // Found the node to rename
          const updateChildrenPaths = (
            children: FileNode[],
            parentP: string
          ): FileNode[] => {
            return children.map((child) => {
              const childNewPath = `${parentP}/${child.name}`;
              return {
                ...child,
                path: childNewPath,
                children: child.children
                  ? updateChildrenPaths(child.children, childNewPath)
                  : undefined
              };
            });
          };

          return {
            ...node,
            name: newName,
            path: newPath,
            children: node.children
              ? updateChildrenPaths(node.children, newPath)
              : undefined
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    const newTree = updateNode(fileTree);
    await saveTree(newTree);

    // Move content in storage
    if (node.type === 'file') {
      const content = await loadFile(oldPath);
      if (content) {
        await saveFile(newPath, content);
        await deleteFile(oldPath);
      }
      // Update open files
      setFiles((prev) =>
        prev.map((f) =>
          f.path === oldPath ? { ...f, path: newPath, name: newName } : f
        )
      );
      if (activePath === oldPath) setActivePath(newPath);
    } else {
      // Folder rename - move all children content
      const allKeys = await getAllKeys();
      const keysToMove = allKeys.filter((k) => k.startsWith(oldPath + '/'));
      for (const key of keysToMove) {
        const content = await loadFile(key);
        if (content) {
          const newKey = newPath + key.substring(oldPath.length);
          await saveFile(newKey, content);
          await deleteFile(key);
        }
      }
      // Update open files paths
      setFiles((prev) =>
        prev.map((f) => {
          if (f.path.startsWith(oldPath + '/')) {
            return { ...f, path: newPath + f.path.substring(oldPath.length) };
          }
          return f;
        })
      );
    }
  };

  const handleDeleteRequest = (node: FileNode) => {
    setDeleteTarget(node);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const node = deleteTarget;

    const removeNode = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter((n) => n.path !== node.path)
        .map((n) => {
          if (n.children) return { ...n, children: removeNode(n.children) };
          return n;
        });
    };

    const newTree = removeNode(fileTree);
    await saveTree(newTree);

    // Delete content
    if (node.type === 'file') {
      await deleteFile(node.path);
      // Close if open
      const idx = files.findIndex((f) => f.path === node.path);
      if (idx !== -1) {
        const newFiles = files.filter((_, i) => i !== idx);
        setFiles(newFiles);
        if (activeFileIndex >= newFiles.length)
          setActiveFileIndex(Math.max(0, newFiles.length - 1));
      }
    } else {
      // Folder delete
      const allKeys = await getAllKeys();
      const keysToDelete = allKeys.filter((k) => k.startsWith(node.path + '/'));
      for (const key of keysToDelete) {
        await deleteFile(key);
      }
      // Close open files in folder
      const newFiles = files.filter((f) => !f.path.startsWith(node.path + '/'));
      setFiles(newFiles);
      if (activeFileIndex >= newFiles.length)
        setActiveFileIndex(Math.max(0, newFiles.length - 1));
    }
  };

  const handleCreateFolder = useCallback(
    async (parentPathOverride?: string | null) => {
      const currentDir = parentPathOverride ?? getCurrentDirectoryPath();
      const normalizedParent =
        currentDir && currentDir.length > 0 ? currentDir : null;

      let baseName = 'New Folder';
      let counter = 1;
      const buildPath = () =>
        normalizedParent ? `${normalizedParent}/${baseName}` : baseName;

      let newPath = buildPath();
      while (pathExistsInTree(fileTree, newPath)) {
        baseName = `New Folder (${counter})`;
        counter++;
        newPath = buildPath();
      }

      const newNode: FileNode = {
        name: baseName,
        type: 'folder',
        path: newPath,
        children: []
      };

      const newTree = insertFileNode(fileTree, normalizedParent, newNode);
      await saveTree(newTree);
      
      // Auto-expand parent if needed
      if (normalizedParent) {
        expandToPath(newPath);
      }
      // Trigger rename and scroll
      setRenamingPath(newPath);
      setScrollToPath(newPath);
      // Reset scroll target after animation
      setTimeout(() => setScrollToPath(null), 500);
    },
    [fileTree, getCurrentDirectoryPath, saveTree, expandToPath]
  );

  const handleCreateFile = useCallback(
    async (parentPathOverride?: string | null) => {
      const currentDir = parentPathOverride ?? getCurrentDirectoryPath();
      const normalizedParent =
        currentDir && currentDir.length > 0 ? currentDir : null;

      let baseName = 'new_file.res';
      let counter = 1;
      const buildPath = () =>
        normalizedParent ? `${normalizedParent}/${baseName}` : baseName;

      let newPath = buildPath();
      while (pathExistsInTree(fileTree, newPath)) {
        baseName = `new_file_${counter}.res`;
        counter++;
        newPath = buildPath();
      }

      const newNode: FileNode = {
        name: baseName,
        path: newPath,
        type: 'file'
      };

      const newTree = insertFileNode(fileTree, normalizedParent, newNode);

      await saveFile(newPath, '');
      await saveTree(newTree);

      setFiles((prev) => [
        ...prev,
        { name: baseName, path: newPath, content: '' }
      ]);
      setActiveFileIndex(files.length);
      setActivePath(newPath);
      setShowAddFileDialog(false);
      setRenamingPath(newPath);
      
      // Auto-expand and scroll
      expandToPath(newPath);
      setScrollToPath(newPath);
      setTimeout(() => setScrollToPath(null), 500);
    },
    [
      fileTree,
      files.length,
      getCurrentDirectoryPath,
      saveTree,
      setFiles,
      setActiveFileIndex,
      setActivePath,
      setShowAddFileDialog,
      setRenamingPath,
      expandToPath
    ]
  );

  const handleMove = async (
    sourceNode: FileNode,
    targetNode: FileNode | null
  ) => {
    // Move sourceNode to be a child of targetNode (folder) or root (null)
    if (targetNode && targetNode.type !== 'folder') return;

    const targetPath = targetNode ? targetNode.path : '';
    const newPath = targetPath
      ? `${targetPath}/${sourceNode.name}`
      : sourceNode.name;

    // Prevent moving to same location
    if (sourceNode.path === newPath) return;

    // 1. Remove from old location
    const removeNode = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter((n) => n.path !== sourceNode.path)
        .map((n) => {
          if (n.children) return { ...n, children: removeNode(n.children) };
          return n;
        });
    };
    const tempTree = removeNode(fileTree);

    // 2. Update paths recursively for sourceNode
    const updatePaths = (node: FileNode, parentPath: string): FileNode => {
      const myNewPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      return {
        ...node,
        path: myNewPath,
        children: node.children
          ? node.children.map((c) => updatePaths(c, myNewPath))
          : undefined
      };
    };
    const updatedSource = updatePaths(sourceNode, targetPath);

    const insertNode = (nodes: FileNode[]): FileNode[] => {
      if (!targetNode) {
        // Insert at root
        return [...nodes, updatedSource].sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
        });
      }
      return nodes.map((node) => {
        if (node.path === targetNode.path) {
          return {
            ...node,
            children: [...(node.children || []), updatedSource].sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'folder' ? -1 : 1;
            })
          };
        }
        if (node.children) {
          return { ...node, children: insertNode(node.children) };
        }
        return node;
      });
    };
    const newTree = insertNode(tempTree);
    await saveTree(newTree);

    // 4. Move content
    if (sourceNode.type === 'file') {
      const content = await loadFile(sourceNode.path);
      if (content) {
        await saveFile(updatedSource.path, content);
        await deleteFile(sourceNode.path);
      }
    } else {
      const allKeys = await getAllKeys();
      const keysToMove = allKeys.filter((k) =>
        k.startsWith(sourceNode.path + '/')
      );
      for (const key of keysToMove) {
        const content = await loadFile(key);
        if (content) {
          const newKey =
            updatedSource.path + key.substring(sourceNode.path.length);
          await saveFile(newKey, content);
          await deleteFile(key);
        }
      }
    }

    // 5. Update open files paths
    setFiles((prev) =>
      prev.map((f) => {
        if (f.path === sourceNode.path) {
          return { ...f, path: updatedSource.path };
        }
        if (f.path.startsWith(sourceNode.path + '/')) {
          return {
            ...f,
            path: updatedSource.path + f.path.substring(sourceNode.path.length)
          };
        }
        return f;
      })
    );

    // Update active path if needed
    if (activePath === sourceNode.path) {
      setActivePath(updatedSource.path);
    } else if (activePath && activePath.startsWith(sourceNode.path + '/')) {
      setActivePath(
        updatedSource.path + activePath.substring(sourceNode.path.length)
      );
    }
  };

  // Update outline color based on theme
  useEffect(() => {
    setOutlineColor(isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)');
  }, [isDark]);

  const activeFile = files[activeFileIndex];

  // Ensure welcome file is open if no files are open
  useEffect(() => {
    if (files.length === 0) {
      setFiles([
        {
          name: 'welcome.res',
          path: 'welcome.res',
          content: WELCOME_TEXT
        }
      ]);
      setActiveFileIndex(0);
    }
  }, [files.length]);

  const [previewHeight, setPreviewHeight] = useState(400);
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);

      // Enforce layout based on screen width
      if (window.innerWidth < 1024) {
        setLayoutMode('vertical');
      } else {
        setLayoutMode('horizontal');
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load manifest
  useEffect(() => {
    const loadManifest = async () => {
      try {
        // Check for custom manifest in storage first
        const customManifest = await loadFile('__MANIFEST__');
        if (customManifest) {
          setFileTree(sortFileNodes(JSON.parse(customManifest)));
          return;
        }

        // Fallback to default
        const res = await fetch('/default_hud/manifest.json');
        const data = await res.json();
        setFileTree(sortFileNodes(data));
      } catch (err) {
        console.error('Failed to load manifest', err);
      }
    };
    loadManifest();
  }, []);

  // Parse ClientScheme.res and cache fonts/colors/borders for rendering
  const applySchemeContent = useCallback((content: string) => {
    try {
      const scheme = parseKeyValues(content);
      const schemeSection = scheme['Scheme'] as KeyValues;
      const schemeFonts = (schemeSection?.['Fonts'] as KeyValues) || null;

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

      const colorsSection = schemeSection
        ? (schemeSection['Colors'] as KeyValues)
        : null;
      if (colorsSection) {
        const colorMap: Record<string, string> = {};
        Object.entries(colorsSection).forEach(([colorName, colorValue]) => {
          if (typeof colorValue === 'string') {
            colorMap[colorName.toLowerCase()] = colorValue;
          }
        });
        setSchemeColors(colorMap);
      }

      const baseSettingsSection = schemeSection
        ? (schemeSection['BaseSettings'] as KeyValues)
        : null;
      if (baseSettingsSection) {
        const flattened: Record<string, string> = {};
        Object.entries(baseSettingsSection).forEach(([key, value]) => {
          if (typeof value === 'string') {
            flattened[key] = value;
          }
        });
        setSchemeBaseSettings(flattened);
      }

      const bordersSection = schemeSection
        ? (schemeSection['Borders'] as KeyValues)
        : null;
      if (bordersSection) {
        const borderMap: SchemeBorderMap = {};
        Object.entries(bordersSection).forEach(([borderName, borderDef]) => {
          if (typeof borderDef === 'object' && borderDef !== null) {
            borderMap[borderName] = borderDef as KeyValues;
          }
        });
        setSchemeBorders(borderMap);
      }
    } catch (e) {
      console.error('Failed to parse ClientScheme', e);
    }
  }, []);

  useEffect(() => {
    const schemeFile = files.find(isClientSchemeHudFile);
    if (schemeFile) {
      applySchemeContent(schemeFile.content);
    }
  }, [files, applySchemeContent]);

  useEffect(() => {
    if (autoOpenedClientSchemeRef.current) return;
    if (files.some(isClientSchemeHudFile)) {
      autoOpenedClientSchemeRef.current = true;
      return;
    }
    if (!fileTree.length) return;

    const targetNode = findClientSchemeNode(fileTree);
    if (!targetNode) return;

    autoOpenedClientSchemeRef.current = true;
    setActivePath(targetNode.path);

    const openScheme = async () => {
      try {
        let text = await loadFile(targetNode.path);
        if (!text) {
          const res = await fetch(`/default_hud/${targetNode.path}`);
          if (res.ok) {
            text = await res.text();
          }
        }

        if (!text) return;

        const content = text;
        setFileCache((prev) => ({ ...prev, [targetNode.path]: content }));

        let openedScheme = false;
        setFiles((prev) => {
          if (prev.some(isClientSchemeHudFile)) {
            return prev;
          }

          openedScheme = true;
          return [
            ...prev,
            {
              name: targetNode.name,
              path: targetNode.path,
              content
            }
          ];
        });

        if (openedScheme) {
          const welcomeIndex = files.findIndex(isWelcomeFile);
          if (welcomeIndex !== -1) {
            setActiveFileIndex(welcomeIndex);
          }
        }
      } catch (err) {
        console.error('Failed to auto-open ClientScheme', err);
      }
    };

    openScheme();
  }, [fileTree, files]);

  useEffect(() => {
    if (!activeFile) return;
    try {
      // Just check for syntax errors
      parseKeyValuesWithLineNumbers(activeFile.content);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to parse file.';
      setError(message);
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
      saveFile(file.path, newCode).catch(console.error);
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
    } else {
      // Handle internal move to root
      try {
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          const sourceNode = JSON.parse(data) as FileNode;
          // Check if already at root
          if (!sourceNode.path.includes('/')) return;

          handleMove(sourceNode, null);
        }
      } catch {
        // Ignore
      }
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // if (files.length <= 1) return; // Allow removing last file (will trigger welcome)

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  const handleReset = async () => {
    await clearAllFiles();
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
          let content = await loadFile(node.path);

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

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Validation: Check for 'resource' folder at root
        const hasResource = Object.keys(zip.files).some(
          (path) =>
            path.startsWith('resource/') || path.startsWith('resource\\')
        );

        if (!hasResource) {
          showErrorDialog(
            'Invalid HUD structure. Please ensure the ZIP file contains a "resource" folder at the root.'
          );
          setIsImporting(false);
          return;
        }

        // Clear existing files
        await clearAllFiles();

        const promises: Promise<void>[] = [];
        const filePaths: string[] = [];

        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            filePaths.push(relativePath);
            promises.push(
              zipEntry.async('string').then((content) => {
                // Save to storage
                return saveFile(relativePath, content);
              })
            );
          }
        });

        // Build new file tree
        const buildFileTreeFromPaths = (paths: string[]): FileNode[] => {
          const root: FileNode[] = [];
          paths.sort();

          paths.forEach((path) => {
            const parts = path.split('/');
            let currentLevel = root;
            let currentPath = '';

            parts.forEach((part, index) => {
              if (!part) return;
              currentPath = currentPath ? `${currentPath}/${part}` : part;
              const isFile = index === parts.length - 1;

              let node = currentLevel.find((n) => n.name === part);

              if (!node) {
                node = {
                  name: part,
                  type: isFile ? 'file' : 'folder',
                  path: currentPath,
                  children: isFile ? undefined : []
                };
                currentLevel.push(node);
              }

              if (!isFile && node.children) {
                currentLevel = node.children;
              }
            });
          });

          return sortFileNodes(root);
        };

        const newTree = buildFileTreeFromPaths(filePaths);

        // Save the new manifest
        await saveFile('__MANIFEST__', JSON.stringify(newTree));

        await Promise.all(promises);

        // Reload to reflect changes
        window.location.reload();
      } catch (err) {
        console.error('Failed to import HUD', err);
        showErrorDialog(
          'Failed to import HUD. Please ensure it is a valid ZIP file.'
        );
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleEditorWillMount = (monacoInstance: MonacoInstance) => {
    // Register custom language
    monacoInstance.languages.register({ id: 'keyvalues' });

    // Define tokens
    monacoInstance.languages.setMonarchTokensProvider('keyvalues', {
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
    monacoInstance.editor.defineTheme('keyvalues-dark', {
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

    monacoInstance.editor.defineTheme('keyvalues-light', {
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
    setActivePath(node.path);

    if (node.type !== 'file') return;

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
      const stored = await loadFile(node.path);
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
  const loadAndParse = useCallback(
    async function loadAndParseInner(
      path: string,
      visited: Set<string> = new Set()
    ): Promise<KVMap> {
      if (visited.has(path)) return {}; // Cycle detection
      visited.add(path);

      let content = fileCache[path];

      // If not in cache (and not the active file which might be newer), try to fetch
      const activeFile = files.find((f) => f.path === path);
      if (activeFile) {
        content = activeFile.content;
      }

      if (!content) {
        // Check storage
        const stored = await loadFile(path);
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
        const baseMap = await loadAndParseInner(resolvedPath, visited);
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
    },
    [fileCache, files]
  );

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
  }, [activeFileIndex, files, fileCache, loadAndParse]); // Depend on fileCache to trigger re-parse if a base file loads
  // Note: We depend on 'files' so if user edits the active file, it re-runs.
  // Ideally we should depend on files[activeFileIndex].content but that's hard to express.
  // 'files' changes on every edit.

  useEffect(() => {
    if (!parsedPreview) {
      setShowConditionalHint(false);
      setSkippedElements([]);
      skippedElementsRef.current = [];
      setMissingFonts([]);
      missingFontsRef.current = [];
      return;
    }
    setShowConditionalHint(hasConditionalBlocks(parsedPreview));
    setSkippedElements(skippedElementsRef.current.slice());
    setMissingFonts(missingFontsRef.current.slice());
  }, [parsedPreview, platform]);

  const handleElementSkip = useCallback((info: SkippedElement) => {
    if (
      !skippedElementsRef.current.some(
        (item) =>
          item.name === info.name &&
          item.line === info.line &&
          item.reason === info.reason
      )
    ) {
      skippedElementsRef.current.push(info);
    }
  }, []);

  const handleMissingFont = useCallback((info: MissingFont) => {
    if (
      !missingFontsRef.current.some(
        (item) =>
          item.name === info.name &&
          item.line === info.line &&
          item.fontName === info.fontName
      )
    ) {
      missingFontsRef.current.push(info);
    }
  }, []);

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

  skippedElementsRef.current = [];
  missingFontsRef.current = [];

  const renderPreviewHeading = () => (
    <Flex align='center' gap='2'>
      <Text size='4'>Preview</Text>
      {showConditionalHint && (
        <Tooltip content='This file uses conditional blocks (e.g. "if_mvm"). They only apply in-game under certain conditions and are not shown as separate preview elements.'>
          <ExclamationTriangleIcon className='text-amber-500 cursor-help' />
        </Tooltip>
      )}
      {skippedElements.length > 0 && (
        <Tooltip
          content={
            <div className='max-w-xs'>
              <Text size='2' weight='bold' className='mb-1 block'>
                Skipped controls
              </Text>
              <div className='max-h-40 overflow-auto border border-dashed border-gray-500 rounded px-2 py-1'>
                <Flex direction='column' gap='1'>
                  {skippedElements.map((item, index) => {
                    const reasonLabel =
                      item.reason === 'zero-size'
                        ? 'width/height = 0'
                        : 'missing xpos/ypos';
                    return (
                      <Text
                        key={`${item.name}-${item.line ?? index}-${item.reason}`}
                        size='2'
                        className='whitespace-nowrap'
                      >
                        {`• ${item.name}${
                          item.line ? ` (line ${item.line})` : ''
                        } – ${reasonLabel}`}
                      </Text>
                    );
                  })}
                </Flex>
              </div>
            </div>
          }
        >
          <QuestionMarkCircledIcon className='text-blue-400 cursor-help' />
        </Tooltip>
      )}
      {missingFonts.length > 0 && (
        <Tooltip
          content={
            <div className='max-w-xs'>
              <Text size='2' weight='bold' className='mb-1 block'>
                Missing fonts
              </Text>
              <div className='max-h-40 overflow-auto border border-dashed border-amber-500 rounded px-2 py-1'>
                <Flex direction='column' gap='1'>
                  {missingFonts.map((item, index) => (
                    <Text
                      key={`${item.name}-${item.line ?? index}-${item.fontName}`}
                      size='2'
                      className='whitespace-nowrap'
                    >
                      {`• ${item.name}${
                        item.line ? ` (line ${item.line})` : ''
                      } – ${item.fontName} (${item.mappedFamily})`}
                    </Text>
                  ))}
                </Flex>
              </div>
            </div>
          }
        >
          <ExclamationTriangleIcon className='text-amber-500 cursor-help' />
        </Tooltip>
      )}
    </Flex>
  );

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
      <Flex
        justify='between'
        align='center'
        gap='4'
        className='flex-shrink-0 mb-2'
      >
        <Text>Stick's TF2 Hud Editor</Text>
        <Flex gap='2' align='center'>
          {/* Desktop Toolbar */}
          <Flex gap='2' align='center' className='hidden lg:flex'>
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
              <Button
                variant='surface'
                style={{ cursor: isImporting ? 'wait' : 'pointer' }}
                asChild
                disabled={isImporting}
              >
                <span>
                  {isImporting ? (
                    <ReloadIcon className='animate-spin' />
                  ) : (
                    <UploadIcon />
                  )}
                  {isImporting ? 'Importing...' : 'Import HUD'}
                </span>
              </Button>
            </label>

            <div className={`border-l ${borderColor} h-6 mx-2`}></div>

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
                      style={{
                        cursor: isImporting ? 'wait' : 'pointer',
                        width: '100%'
                      }}
                      asChild
                      disabled={isImporting}
                    >
                      <span>
                        {isImporting ? (
                          <ReloadIcon className='animate-spin' />
                        ) : (
                          <UploadIcon />
                        )}
                        {isImporting ? 'Importing...' : 'Import HUD'}
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
            {renderPreviewHeading()}
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
                  <div
                    className='pointer-events-none absolute inset-0 rounded border-2 border-white/30'
                    style={{ boxSizing: 'border-box' }}
                  />
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
                            onSkipElement={handleElementSkip}
                            onMissingFont={handleMissingFont}
                            schemeColors={schemeColors}
                            schemeBaseSettings={schemeBaseSettings}
                            schemeBorders={schemeBorders}
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
          <ContextMenu.Root>
            <ContextMenu.Trigger>
              <Flex
                direction='column'
                className={`h-full rounded-md border transition-colors overflow-hidden ${containerBg} ${isDragging ? 'border-blue-500' : borderColor}`}
                p='2'
                gap='2'
                style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => setActivePath(null)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFontDialog(true);
                      }}
                    >
                      <FontBoldIcon />
                    </IconButton>
                    <IconButton
                      size='1'
                      variant='ghost'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateFolder(null);
                      }}
                    >
                      <FilePlusIcon />
                    </IconButton>
                    <IconButton
                      size='1'
                      variant='ghost'
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddFileDialog(true);
                      }}
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
                        onRename={(n) => setRenamingPath(n.path)}
                        onDelete={handleDeleteRequest}
                        onCreateFolder={handleCreateFolder}
                        onCreateFile={handleCreateFile}
                        onMove={handleMove}
                        renamingPath={renamingPath}
                        onRenameSubmit={handleRenameSubmit}
                        onRenameCancel={() => setRenamingPath(null)}
                        expandedPaths={expandedPaths}
                        onToggleExpand={toggleExpand}
                        scrollToPath={scrollToPath}
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
            </ContextMenu.Trigger>
            <ContextMenu.Content>
              <ContextMenu.Item onSelect={() => handleCreateFile(null)}>
                New File
              </ContextMenu.Item>
              <ContextMenu.Item onSelect={() => handleCreateFolder(null)}>
                New Folder
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Root>

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
                    path={activeFile.path}
                    value={activeFile.content}
                    theme={isDark ? 'keyvalues-dark' : 'keyvalues-light'}
                    beforeMount={handleEditorWillMount}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                    onChange={(value) => handleCodeChange(value || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      lineNumbers: 'on'
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
                {renderPreviewHeading()}
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
                      <div
                        className='pointer-events-none absolute inset-0 rounded border-2 border-white/30'
                        style={{ boxSizing: 'border-box' }}
                      />
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
                                onSkipElement={handleElementSkip}
                                onMissingFont={handleMissingFont}
                                schemeColors={schemeColors}
                                schemeBaseSettings={schemeBaseSettings}
                                schemeBorders={schemeBorders}
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
            Load ClientScheme.res to map fonts.
          </Dialog.Description>

          <Flex direction='column' gap='3' className='mt-4'>
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

      {/* Add File Dialog */}
      <Dialog.Root
        open={showAddFileDialog}
        onOpenChange={(open) => {
          setShowAddFileDialog(open);
          if (!open) {
            setFileSearchQuery('');
          }
        }}
      >
        <Dialog.Content
          style={{
            maxWidth: 600,
            height: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Dialog.Title>Add File</Dialog.Title>

          <Flex direction='column' gap='3' className='flex-1 min-h-0 mt-4'>
            <input
              type='text'
              placeholder='Search files...'
              className={`w-full px-3 py-2 rounded border ${borderColor} ${containerBg}`}
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
              autoFocus
            />

            <ScrollArea className='flex-1 border rounded p-2'>
              {fileSearchQuery ? (
                <Flex direction='column' gap='1'>
                  {(() => {
                    const matches: FileNode[] = [];
                    const search = (nodes: FileNode[]) => {
                      for (const node of nodes) {
                        if (node.type === 'file') {
                          if (
                            node.name
                              .toLowerCase()
                              .includes(fileSearchQuery.toLowerCase())
                          ) {
                            matches.push(node);
                          }
                        } else if (node.children) {
                          search(node.children);
                        }
                      }
                    };
                    search(fileTree);

                    if (matches.length === 0) {
                      return <Text color='gray'>No matches found.</Text>;
                    }

                    return matches.map((node) => (
                      <div
                        key={node.path}
                        className={`p-1 rounded cursor-pointer ${hoverItemBg}`}
                        onClick={() => {
                          handleNodeSelect(node);
                          setShowAddFileDialog(false);
                        }}
                      >
                        <Flex align='center' gap='2'>
                          <FileTextIcon className='text-gray-500' />
                          <Text size='1'>{node.path}</Text>
                        </Flex>
                      </div>
                    ));
                  })()}
                </Flex>
              ) : (
                <Flex direction='column' gap='1'>
                  {fileTree.map((node) => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      level={0}
                      onSelect={(n) => {
                        handleNodeSelect(n);
                        setShowAddFileDialog(false);
                      }}
                      activePath={null}
                      loadingPaths={loadingPaths}
                      onRename={() => {}}
                      onDelete={() => {}}
                      onCreateFolder={() => {}}
                      onCreateFile={() => {}}
                      onMove={() => {}}
                      renamingPath={null}
                      onRenameSubmit={() => {}}
                      onRenameCancel={() => {}}
                      expandedPaths={new Set()}
                      onToggleExpand={() => {}}
                      scrollToPath={null}
                    />
                  ))}
                </Flex>
              )}
            </ScrollArea>
          </Flex>

          <Flex gap='3' mt='4' justify='between' align='center'>
            <Flex gap='3'>
              <Button variant='surface' onClick={() => handleCreateFile()}>
                Create Empty
              </Button>
              <label>
                <input
                  type='file'
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const content = ev.target?.result as string;
                        const path = file.name; // Root

                        const newNode: FileNode = {
                          name: file.name,
                          type: 'file',
                          path
                        };
                        const newTree = [...fileTree, newNode];
                        await saveTree(newTree);
                        await saveFile(path, content);

                        setFiles((prev) => [
                          ...prev,
                          { name: file.name, path, content }
                        ]);
                        setActiveFileIndex(files.length);
                        setShowAddFileDialog(false);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
                <Button variant='surface' asChild style={{ cursor: 'pointer' }}>
                  <span>Import Local</span>
                </Button>
              </label>
            </Flex>
            <Dialog.Close>
              <Button variant='soft' color='gray'>
                Cancel
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(errorDialogMessage)}
        onOpenChange={(open) => {
          if (!open) setErrorDialogMessage(null);
        }}
      >
        <Dialog.Content maxWidth='420px'>
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Description className='mt-2'>
            {errorDialogMessage}
          </Dialog.Description>
          <Flex justify='end' mt='4'>
            <Dialog.Close>
              <Button
                variant='soft'
                color='gray'
                onClick={() => setErrorDialogMessage(null)}
              >
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialog.Content maxWidth='450px'>
          <AlertDialog.Title>Delete Item</AlertDialog.Title>
          <AlertDialog.Description size='2'>
            Are you sure you want to delete "{deleteTarget?.name}"? This action
            cannot be undone.
          </AlertDialog.Description>

          <Flex gap='3' mt='4' justify='end'>
            <AlertDialog.Cancel>
              <Button variant='soft' color='gray'>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant='solid' color='red' onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

    </Flex>
  );
}
