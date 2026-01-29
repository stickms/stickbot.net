import {
  Flex,
  Text,
  ContextMenu,
} from '@radix-ui/themes';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FileTextIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

export type FileNode = {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
};

export const findNodeByPath = (
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

export const pathExistsInTree = (nodes: FileNode[], targetPath: string): boolean => {
  for (const node of nodes) {
    if (node.path === targetPath) return true;
    if (node.children && pathExistsInTree(node.children, targetPath)) {
      return true;
    }
  }
  return false;
};

export const insertFileNode = (
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

export const sortFileNodes = (nodes: FileNode[]): FileNode[] => {
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

export function FileTreeNode({
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

export function FileExplorer({
  fileTree,
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
  fileTree: FileNode[];
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
  return (
    <Flex direction='column' gap='1'>
      {fileTree.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          level={0}
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
    </Flex>
  );
}
