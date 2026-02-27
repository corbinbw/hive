/**
 * Hive Type Definitions
 */

// ============ Agents ============

export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  documents: Document[];
  capabilities: AgentCapability[];
  model?: string;
  status: AgentStatus;
  isKing?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = 'idle' | 'working' | 'error';

export type AgentCapability = 
  | 'web_search'
  | 'web_fetch'
  | 'read_files'
  | 'write_files'
  | 'execute_code'
  | 'send_messages'
  | 'summarize'
  | 'research'
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'general';

export interface CreateAgentInput {
  name: string;
  description: string;
  instructions: string;
  capabilities?: AgentCapability[];
  model?: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  instructions?: string;
  capabilities?: AgentCapability[];
  model?: string;
}

// ============ Documents ============

export interface Document {
  id: string;
  agentId: string;
  filename: string;
  content: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface UploadDocumentInput {
  filename: string;
  content: string;
  mimeType: string;
}

// ============ Tasks ============

export interface Task {
  id: string;
  agentId: string;
  input: string;
  output: string;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============ Chat ============

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  agentId?: string;  // Optional explicit agent
}

export interface ChatResponse {
  message: ChatMessage;
  agent: Agent;
  task: Task;
}

// ============ Activity ============

export interface ActivityItem {
  id: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'agent_created' | 'document_uploaded';
  agentId?: string;
  agentName?: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
