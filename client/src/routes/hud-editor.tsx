import { Flex, Text, ScrollArea, Card, IconButton, Button, Dialog, Tooltip } from "@radix-ui/themes";
import { useState, useEffect, useRef } from "react";
import { parseKeyValues, KeyValues } from "../lib/keyvalues";
import { PlusIcon, Cross2Icon, FileTextIcon, DownloadIcon, FontBoldIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import JSZip from "jszip";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

// Basic mapping of TF2 colors to CSS colors
const COLOR_MAP: Record<string, string> = {
    "0 0 0 255": "black",
    "255 255 255 255": "white",
    "255 0 0 255": "red",
    "0 255 0 255": "green",
    "0 0 255 255": "blue",
};

function parseColor(colorStr: string): string {
    if (!colorStr) return "transparent";
    if (COLOR_MAP[colorStr]) return COLOR_MAP[colorStr];
    
    const parts = colorStr.split(" ").map(Number);
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
    return axis === 'x' ? { left: `${parseInt(str)}px` } : { top: `${parseInt(str)}px` };
}

type FontDefinition = {
    family: string;
    size: number;
};

function HudComponent({ name, data, isRoot = false, fontMap, loadedFonts }: { name: string; data: KeyValues; isRoot?: boolean; fontMap: Record<string, FontDefinition>; loadedFonts: string[] }) {
    if (typeof data !== "object") return null;

    const controlName = (data["ControlName"] as string);
    const fieldName = (data["fieldName"] as string) || name;
    
    const xposStr = (data["xpos"] as string) || "0";
    const yposStr = (data["ypos"] as string) || "0";
    const zposStr = (data["zpos"] as string) || "0";
    const wideStr = (data["wide"] as string);
    const tallStr = (data["tall"] as string);
    
    const visible = (data["visible"] as string) !== "0";
    const fontName = (data["font"] as string);
    
    const fontDef = fontName ? fontMap[fontName] : null;
    const mappedFamily = fontDef?.family || "inherit";
    const fontSize = fontDef?.size || 14; // Default to 14px if unknown
    
    // Check if font is loaded (if it's not a generic one)
    const isFontMissing = fontName && mappedFamily !== "inherit" && !loadedFonts.includes(mappedFamily) && !["Arial", "Verdana", "Tahoma"].includes(mappedFamily);
    const fontFamily = isFontMissing ? "monospace" : mappedFamily;

    // Styles
    const posStyleX = parsePosition(xposStr, 'x');
    const posStyleY = parsePosition(yposStr, 'y');
    
    const style: React.CSSProperties = {
        position: isRoot ? "relative" : "absolute",
        ...posStyleX,
        ...posStyleY,
        zIndex: parseInt(zposStr),
        width: wideStr ? parseInt(wideStr) : (isRoot ? "100%" : 0),
        height: tallStr ? parseInt(tallStr) : (isRoot ? "100%" : 0),
        display: visible ? "block" : "none",
        color: parseColor(data["fgcolor"] as string),
        backgroundColor: parseColor(data["bgcolor"] as string),
        // Border for debugging/visibility if no bg
        border: (data["bgcolor"] ? "none" : "1px dashed rgba(255,255,255,0.1)"),
        overflow: isRoot ? "visible" : "hidden",
        fontFamily: fontFamily,
        fontSize: `${fontSize}px`,
    };

    const labelText = (data["labelText"] as string) || "";
    const textAlignment = (data["textAlignment"] as string) || "west";
    
    // Text Alignment mapping
    let justifyContent = "flex-start";
    let alignItems = "flex-start";
    
    if (textAlignment.includes("center")) {
        justifyContent = "center";
        alignItems = "center";
    } else if (textAlignment.includes("east") || textAlignment.includes("right")) {
        justifyContent = "flex-end";
    }

    if (controlName === "CExLabel" || controlName === "Label") {
        return (
            <div style={{ ...style, display: visible ? "flex" : "none", justifyContent, alignItems }}>
                {labelText.replace(/%[a-zA-Z0-9_]+%/g, "VAR")}
                {isFontMissing && (
                    <Tooltip content={`Missing font: ${mappedFamily} (${fontName})`}>
                        <ExclamationTriangleIcon className="absolute top-0 right-0 text-yellow-500" />
                    </Tooltip>
                )}
            </div>
        );
    }

    if (controlName === "ImagePanel" || controlName === "CExImageButton") {
        const image = (data["image"] as string) || "";
        // CExImageButton might have text too, but usually it's an image or bg.
        // For now treat as image container if it has image, or just container.
        if (image) {
             return (
                 <div style={{
                     ...style, 
                     display: visible ? "flex" : "none", 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     border: '1px solid #444', 
                     // Source Engine missing texture pattern (purple/black checkerboard)
                     backgroundImage: 'repeating-conic-gradient(#ff00ff 0% 25%, #000000 0% 50%)',
                     backgroundSize: '20px 20px',
                     opacity: 0.8
                 }}>
                    <span style={{
                        fontSize: '10px', 
                        color: 'white', 
                        textAlign: 'center', 
                        wordBreak: 'break-all', 
                        padding: '2px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        borderRadius: '4px'
                    }}>
                        {image}
                    </span>
                 </div>
            );
        }
    }

    // Container or unknown
    return (
        <div style={style} title={fieldName}>
            {Object.entries(data).map(([childKey, value]) => {
                if (typeof value === "object") {
                    return <HudComponent key={childKey} name={childKey} data={value} fontMap={fontMap} loadedFonts={loadedFonts} />;
                }
                return null;
            })}
        </div>
    );
}

type HudFile = {
    name: string;
    content: string;
};

type FontFile = {
    name: string;
    url: string;
    family: string;
    blob: Blob;
};

export default function HudEditor() {
    const { theme } = useTheme();
    const [files, setFiles] = useState<HudFile[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [parsed, setParsed] = useState<KeyValues | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Font state
    const [fonts, setFonts] = useState<FontFile[]>([]);
    const [fontMap, setFontMap] = useState<Record<string, FontDefinition>>({}); // Scheme Name -> Definition
    const [showFontDialog, setShowFontDialog] = useState(false);

    const activeFile = files[activeFileIndex];

    // Load default HUD file
    useEffect(() => {
        fetch('/default_hud/HudPlayerHealth.res')
            .then(res => res.text())
            .then(text => {
                setFiles([{ name: "HudPlayerHealth.res", content: text }]);
            })
            .catch(err => console.error("Failed to load default HUD", err));
    }, []);

    // Parse ClientScheme.res to extract font mappings
    useEffect(() => {
        const clientScheme = files.find((f: HudFile) => f.name.toLowerCase() === "clientscheme.res");
        if (clientScheme) {
            try {
                const scheme = parseKeyValues(clientScheme.content);
                const schemeFonts = (scheme["Scheme"] as KeyValues)?.["Fonts"] as KeyValues;
                
                if (schemeFonts) {
                    const newMap: Record<string, FontDefinition> = {};
                    Object.entries(schemeFonts).forEach(([fontName, fontDef]) => {
                        // This is simplified. Real scheme parsing is complex (conditional blocks).
                        // We look for "name" in the first block (usually "1")
                        const firstBlock = (fontDef as KeyValues)?.["1"] as KeyValues;
                        const family = (firstBlock?.["name"] as string);
                        const tall = (firstBlock?.["tall"] as string);
                        
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
                console.error("Failed to parse ClientScheme", e);
            }
        }
    }, [files]);

    useEffect(() => {
        if (!activeFile) return;
        try {
            const res = parseKeyValues(activeFile.content);
            setParsed(res);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, [activeFile]);

    const handleCodeChange = (newCode: string) => {
        const newFiles = [...files];
        newFiles[activeFileIndex] = { ...newFiles[activeFileIndex], content: newCode };
        setFiles(newFiles);
    };

    const processFiles = (fileList: FileList) => {
        const filesToAdd: HudFile[] = [];
        let processedCount = 0;
        const totalFiles = fileList.length;

        Array.from(fileList).forEach(file => {
            if (file.name.endsWith(".ttf") || file.name.endsWith(".otf")) {
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
                
                setFonts((prev: FontFile[]) => [...prev, { name: file.name, url, family, blob: file }]);
                processedCount++;
                if (processedCount === totalFiles) {
                     setFiles((prev: HudFile[]) => [...prev, ...filesToAdd]);
                }
            } else {
                // Handle Text File
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const content = ev.target?.result as string;
                    filesToAdd.push({ name: file.name, content });
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
        const scheme = files.find((f: HudFile) => f.name.toLowerCase() === "clientscheme.res");
        if (scheme) {
            zip.file("ClientScheme.res", scheme.content);
        }
        
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "custom_fonts.zip";
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
                    [/#base/, 'keyword.directive'],
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
                { token: 'delimiter.bracket', foreground: 'D4D4D4' },
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
                { token: 'delimiter.bracket', foreground: '000000' },
            ],
            colors: {}
        });
    };

    const isDark = theme === 'dark';
    const containerBg = isDark ? 'bg-gray-900' : 'bg-gray-100';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-300';
    const activeItemBg = isDark ? 'bg-gray-800' : 'bg-gray-200';
    const hoverItemBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200';

    return (
        <Flex className='h-screen w-full pt-16' gap="4" p="4">
            {/* Sidebar */}
            <Flex 
                direction="column" 
                className={`w-64 h-full rounded-md border transition-colors ${containerBg} ${isDragging ? 'border-blue-500' : borderColor}`} 
                p="2" 
                gap="2"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <Flex justify="between" align="center" className="mb-2">
                    <Text size="3" weight="bold">Files</Text>
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        accept=".res,.txt,.ttf,.otf"
                    />
                    <Flex gap="2">
                        <IconButton size="1" variant="ghost" onClick={() => setShowFontDialog(true)}>
                            <FontBoldIcon />
                        </IconButton>
                        <IconButton size="1" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                            <PlusIcon />
                        </IconButton>
                    </Flex>
                </Flex>
                <ScrollArea className="flex-1">
                    <Flex direction="column" gap="1">
                        {files.map((file, index) => (
                            <Flex 
                                key={index} 
                                align="center" 
                                justify="between"
                                className={`p-2 rounded cursor-pointer ${hoverItemBg} ${index === activeFileIndex ? `${activeItemBg} border ${borderColor}` : ''}`}
                                onClick={() => setActiveFileIndex(index)}
                            >
                                <Flex align="center" gap="2" className="overflow-hidden">
                                    <FileTextIcon />
                                    <Text size="1" className="truncate">{file.name}</Text>
                                </Flex>
                                {files.length > 1 && (
                                    <IconButton size="1" variant="ghost" color="red" onClick={(e) => removeFile(index, e)}>
                                        <Cross2Icon />
                                    </IconButton>
                                )}
                            </Flex>
                        ))}
                    </Flex>
                </ScrollArea>
                {isDragging && (
                    <Flex align="center" justify="center" className="absolute inset-0 bg-black/50 pointer-events-none rounded-md">
                        <Text size="4" weight="bold">Drop files here</Text>
                    </Flex>
                )}
            </Flex>

            {/* Editor */}
            <Flex direction="column" className="flex-1 h-full" gap="2">
                <Text size="4" weight="bold">Editor - {activeFile ? activeFile.name : 'No File'}</Text>
                <div className={`flex-1 border ${borderColor} rounded overflow-hidden`}>
                    {activeFile && (
                        <Editor
                            height="100%"
                            defaultLanguage="keyvalues"
                            value={activeFile.content}
                            theme={isDark ? 'keyvalues-dark' : 'keyvalues-light'}
                            beforeMount={handleEditorWillMount}
                            onChange={(value) => handleCodeChange(value || "")}
                            options={{
                                minimap: { enabled: false },
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                wordWrap: "on",
                                padding: { top: 16, bottom: 16 },
                            }}
                        />
                    )}
                </div>
                {error && <Text color="red">{error}</Text>}
            </Flex>
            
            {/* Preview */}
            <Flex direction="column" className="flex-1 h-full" gap="2">
                <Text size="4" weight="bold">Preview</Text>
                <Card className={`flex-1 relative overflow-hidden border ${borderColor} ${containerBg}`}>
                    <div className="relative w-full h-full">
                        {parsed && Object.entries(parsed).map(([childKey, value]) => (
                             typeof value === 'object' ? <HudComponent key={childKey} name={childKey} data={value} isRoot={true} fontMap={fontMap} loadedFonts={fonts.map(f => f.family)} /> : null
                        ))}
                    </div>
                </Card>
            </Flex>
            
            {/* Font Dialog */}
            <Dialog.Root open={showFontDialog} onOpenChange={setShowFontDialog}>
                <Dialog.Content>
                    <Dialog.Title>Font Manager</Dialog.Title>
                    <Dialog.Description>
                        Upload .ttf/.otf files and ClientScheme.res to map fonts.
                    </Dialog.Description>
                    
                    <Flex direction="column" gap="3" className="mt-4">
                        <Text weight="bold">Loaded Fonts:</Text>
                        {fonts.length === 0 && <Text color="gray">No fonts loaded.</Text>}
                        {fonts.map((font: FontFile, i: number) => (
                            <Flex key={i} justify="between" align="center">
                                <Text>{font.name} ({font.family})</Text>
                            </Flex>
                        ))}
                        
                        <Text weight="bold" className="mt-2">Mappings (from ClientScheme):</Text>
                        {Object.keys(fontMap).length === 0 && <Text color="gray">No mappings found. Load ClientScheme.res.</Text>}
                        <ScrollArea className="max-h-40">
                            <Flex direction="column" gap="1">
                                {Object.entries(fontMap).map(([schemeName, def]) => (
                                    <Text key={schemeName} size="1">{schemeName} -&gt; {def.family} ({def.size}px)</Text>
                                ))}
                            </Flex>
                        </ScrollArea>
                        
                        <Button onClick={downloadFonts} disabled={fonts.length === 0}>
                            <DownloadIcon /> Download Fonts Zip
                        </Button>
                    </Flex>
                    
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Close</Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Flex>
    );
}
