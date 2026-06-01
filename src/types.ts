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
  type: 'script' | 'dataset'; // script is .py, dataset is csv/txt/etc.
  size: number; // in bytes
  updatedAt: string;
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
  hasKey: boolean; // server never sends the real key
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
