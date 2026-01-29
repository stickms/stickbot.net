import { useState, useCallback, useEffect } from 'react';
import {
  FileNode,
  findNodeByPath,
  pathExistsInTree,
  insertFileNode,
  sortFileNodes
} from '../components/file-explorer';
import {
  saveFile,
  loadFile,
  deleteFile,
  getAllKeys
} from '../lib/storage';
import { HudFile } from '../lib/types';

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

export function useFileSystem() {
  const [files, setFiles] = useState<HudFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [scrollToPath, setScrollToPath] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
  const [fileCache, setFileCache] = useState<Record<string, string>>({});

  const activeFile = files[activeFileIndex];

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

    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === oldPath) {
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

    if (node.type === 'file') {
      const content = await loadFile(oldPath);
      if (content) {
        await saveFile(newPath, content);
        await deleteFile(oldPath);
      }
      setFiles((prev) =>
        prev.map((f) =>
          f.path === oldPath ? { ...f, path: newPath, name: newName } : f
        )
      );
      if (activePath === oldPath) setActivePath(newPath);
    } else {
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

    if (node.type === 'file') {
      await deleteFile(node.path);
      const idx = files.findIndex((f) => f.path === node.path);
      if (idx !== -1) {
        const newFiles = files.filter((_, i) => i !== idx);
        setFiles(newFiles);
        if (activeFileIndex >= newFiles.length)
          setActiveFileIndex(Math.max(0, newFiles.length - 1));
      }
    } else {
      const allKeys = await getAllKeys();
      const keysToDelete = allKeys.filter((k) => k.startsWith(node.path + '/'));
      for (const key of keysToDelete) {
        await deleteFile(key);
      }
      const newFiles = files.filter((f) => !f.path.startsWith(node.path + '/'));
      setFiles(newFiles);
      if (activeFileIndex >= newFiles.length)
        setActiveFileIndex(Math.max(0, newFiles.length - 1));
    }
    setDeleteTarget(null);
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
      
      if (normalizedParent) {
        expandToPath(newPath);
      }
      setRenamingPath(newPath);
      setScrollToPath(newPath);
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
      setRenamingPath(newPath);
      
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
      setRenamingPath,
      expandToPath
    ]
  );

  const handleMove = async (
    sourceNode: FileNode,
    targetNode: FileNode | null
  ) => {
    if (targetNode && targetNode.type !== 'folder') return;

    const targetPath = targetNode ? targetNode.path : '';
    const newPath = targetPath
      ? `${targetPath}/${sourceNode.name}`
      : sourceNode.name;

    if (sourceNode.path === newPath) return;

    const removeNode = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter((n) => n.path !== sourceNode.path)
        .map((n) => {
          if (n.children) return { ...n, children: removeNode(n.children) };
          return n;
        });
    };
    const tempTree = removeNode(fileTree);

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

    if (activePath === sourceNode.path) {
      setActivePath(updatedSource.path);
    } else if (activePath && activePath.startsWith(sourceNode.path + '/')) {
      setActivePath(
        updatedSource.path + activePath.substring(sourceNode.path.length)
      );
    }
  };

  const handleNodeSelect = async (node: FileNode) => {
    setActivePath(node.path);

    if (node.type !== 'file') return;

    const existingIndex = files.findIndex((f) => f.path === node.path);
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex);
      return;
    }

    setLoadingPaths((prev) => new Set(prev).add(node.path));

    try {
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
      setActiveFileIndex(files.length);
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

  // Load manifest
  useEffect(() => {
    const loadManifest = async () => {
      try {
        const customManifest = await loadFile('__MANIFEST__');
        if (customManifest) {
          setFileTree(sortFileNodes(JSON.parse(customManifest)));
          return;
        }

        const res = await fetch('/default_hud/manifest.json');
        const data = await res.json();
        setFileTree(sortFileNodes(data));
      } catch (err) {
        console.error('Failed to load manifest', err);
      }
    };
    loadManifest();
  }, []);

  return {
    files,
    setFiles,
    activeFileIndex,
    setActiveFileIndex,
    activeFile,
    fileTree,
    setFileTree,
    activePath,
    setActivePath,
    loadingPaths,
    setLoadingPaths,
    renamingPath,
    setRenamingPath,
    expandedPaths,
    setExpandedPaths,
    scrollToPath,
    setScrollToPath,
    deleteTarget,
    setDeleteTarget,
    fileCache,
    setFileCache,
    toggleExpand,
    expandToPath,
    saveTree,
    handleRenameSubmit,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleCreateFolder,
    handleCreateFile,
    handleMove,
    handleNodeSelect,
    WELCOME_TEXT
  };
}
