export interface UserSettings {
  indentation: 2 | 4;
  language: 'es' | 'en';
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  settings?: UserSettings;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface FileItem {
  id: string;
  projectId: string;
  filename: string;
  filepath: string; // relative to workspace root
  folder?: string;  // subfolder within project (scripts only)
  type: 'script' | 'dataset' | 'doc'; // script is .py, doc is .md, dataset is csv/txt/etc.
  size: number; // in bytes
  updatedAt: string;
}

// Un artefacto generado por un script, recolectado en la carpeta output/ del proyecto.
// No se persiste en db.json; se lista escaneando el filesystem vía /output-files.
export interface OutputFile {
  name: string;
  size: number;  // bytes
  mtime: number; // epoch ms
  ext: string;   // extensión sin punto, en minúsculas ('png', 'md', 'csv', '')
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number; // in milliseconds
  timestamp: string;
  generatedFiles?: string[];
}

export interface EnvRestoreState {
  inProgress: boolean;
  pending: string[];
  done: string[];
  failed: string[];
  total: number;
}

// AI assistant types
export interface AIConfig {
  provider: 'openai' | 'deepseek' | 'gemini' | 'custom';
  model: string;
  baseUrl?: string;
  enabled: boolean;
  hasKey: boolean;    // server never sends the real key
  validated: boolean; // connection was tested successfully at last save
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  proposals?: DiffProposal[]; // parsed <diff_proposal> blocks for this message
}

// Context snapshot sent to /api/ai/chat alongside the message history
export interface IdeSelection {
  text: string;
  fromLine: number;
  toLine: number;
  from: number; // char offset in document
  to: number;
}

// Compact summary of a previewed dataset, derived from the /preview endpoint,
// attached to the IDE context so the AI tutor can reason about real data.
export interface DatasetContext {
  filename: string;
  shape: [number, number];        // [rows, cols] as returned by /preview
  columns: string[];
  dtypes: Record<string, string>;
  sample: string[][];             // first ~15 rows (trimmed from head[])
}

export interface IdeContext {
  code: string;           // full file content (will be line-numbered on server)
  selection?: IdeSelection;
  fileName?: string;
  projectName?: string;
  execution?: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
  };
  datasets?: DatasetContext[]; // datasets the user previewed this session
}

// A proposed code change from the AI tutor
export interface DiffProposal {
  target: 'selection' | 'file';
  description: string;
  content: string;        // the new code content to apply
  beforeContent?: string; // captured at parse time for diff display
  applied?: boolean;      // true once the user accepted it
  rejected?: boolean;     // true once the user dismissed it
}

export interface OutdatedPackage {
  name: string;
  version: string;
  latest_version: string;
}

export interface PackageUpdateState {
  outdated: OutdatedPackage[];
  lastChecked: string | null;
  dismissed: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
