export interface User {
  id: string;
  username: string;
  email: string;
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
}
