import { useState, useEffect, useCallback, useRef } from 'react';
import {
  parseKeyValues,
  KeyValues
} from '../lib/keyvalues';
import { FontDefinition } from '../components/hud-component';
import {
  HudFile,
  FontFile,
  SchemeBorderMap,
  MissingFont,
  SkippedElement
} from '../lib/types';
import { FileNode } from '../components/file-explorer';

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

export const isClientSchemeHudFile = (file: HudFile) =>
  matchesClientScheme(file.name, file.path);

const matchesWelcomeFile = (value: string) =>
  normalizePathKey(value) === WELCOME_FILE;

export const isWelcomeFile = (file: HudFile) =>
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

export function useHudProject(
  files: HudFile[],
  fileTree: FileNode[],
  setFiles: React.Dispatch<React.SetStateAction<HudFile[]>>,
  setActiveFileIndex: React.Dispatch<React.SetStateAction<number>>,
  setActivePath: React.Dispatch<React.SetStateAction<string | null>>,
  setFileCache: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  loadFile: (path: string) => Promise<string | null>
) {
  const [fonts, setFonts] = useState<FontFile[]>([]);
  const [fontMap, setFontMap] = useState<Record<string, FontDefinition>>({});
  const [schemeColors, setSchemeColors] = useState<Record<string, string>>({});
  const [schemeBaseSettings, setSchemeBaseSettings] = useState<Record<string, string>>({});
  const [schemeBorders, setSchemeBorders] = useState<SchemeBorderMap>({});
  const [missingFonts, setMissingFonts] = useState<MissingFont[]>([]);
  const [skippedElements, setSkippedElements] = useState<SkippedElement[]>([]);
  
  const autoOpenedClientSchemeRef = useRef(false);

  const applySchemeContent = useCallback((content: string) => {
    try {
      const scheme = parseKeyValues(content);
      const schemeSection = scheme['Scheme'] as KeyValues;
      const schemeFonts = (schemeSection?.['Fonts'] as KeyValues) || null;

      if (schemeFonts) {
        const newMap: Record<string, FontDefinition> = {};
        Object.entries(schemeFonts).forEach(([fontName, fontDef]) => {
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
  }, [fileTree, files, loadFile, setActiveFileIndex, setActivePath, setFileCache, setFiles]);

  // Load default fonts
  useEffect(() => {
    const defaultFonts = [
      'ocra.ttf',
      'tf.ttf',
      'tf2.ttf',
      'tf2build.ttf',
      'tf2professor.ttf',
      'tf2secondary.ttf',
      'tfd.ttf',
      'tflogo.ttf'
    ];

    defaultFonts.forEach((fontFile) => {
      // Check if already loaded
      if (fonts.some(f => f.name === fontFile)) return;

      const family = fontFile.split('.')[0];
      const url = `/default_hud/resource/${fontFile}`;

      // Inject @font-face
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${family}';
          src: url('${url}');
        }
      `;
      document.head.appendChild(style);

      setFonts((prev) => [
        ...prev,
        { name: fontFile, url, family }
      ]);
    });
  }, []); // Run once on mount

  return {
    fonts,
    setFonts,
    fontMap,
    schemeColors,
    schemeBaseSettings,
    schemeBorders,
    missingFonts,
    setMissingFonts,
    skippedElements,
    setSkippedElements,
    applySchemeContent
  };
}
