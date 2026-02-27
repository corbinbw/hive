/**
 * Agent Store
 * 
 * Simple file-based storage for MVP.
 * Can be upgraded to SQLite/Postgres later.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Agent } from './types';

const STORE_DIR = process.env.HIVE_STORAGE_PATH || './storage';
const AGENTS_FILE = path.join(STORE_DIR, 'agents.json');
const DOCUMENTS_DIR = path.join(STORE_DIR, 'documents');

export interface AgentStore {
  agents: Agent[];
  version: number;
  updatedAt: Date;
}

const DEFAULT_KING_AGENT: Agent = {
  id: 'king-agent',
  name: 'King Agent',
  description: 'The orchestrator that routes requests to specialized agents',
  instructions: `You are the King Agent - an orchestrator that manages a team of specialized AI agents.

Your responsibilities:
1. Understand the user's request
2. Route to the most appropriate specialist agent
3. Handle general questions yourself
4. Synthesize responses when needed

Be helpful, direct, and efficient.`,
  documents: [],
  capabilities: ['general'],
  status: 'idle',
  isKing: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Get the agent store
 */
export async function getAgentStore(): Promise<AgentStore> {
  await ensureStorageDir();
  
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8');
    const store = JSON.parse(data) as AgentStore;
    
    // Ensure king agent exists
    if (!store.agents.some(a => a.isKing)) {
      store.agents.unshift(DEFAULT_KING_AGENT);
    }
    
    return store;
  } catch (error: any) {
    // File doesn't exist, create default store
    if (error.code === 'ENOENT') {
      const defaultStore: AgentStore = {
        agents: [DEFAULT_KING_AGENT],
        version: 1,
        updatedAt: new Date(),
      };
      await saveAgentStore(defaultStore);
      return defaultStore;
    }
    throw error;
  }
}

/**
 * Save the agent store
 */
export async function saveAgentStore(store: AgentStore): Promise<void> {
  await ensureStorageDir();
  store.updatedAt = new Date();
  await fs.writeFile(AGENTS_FILE, JSON.stringify(store, null, 2));
}

/**
 * Get a single agent by ID
 */
export async function getAgent(id: string): Promise<Agent | null> {
  const store = await getAgentStore();
  return store.agents.find(a => a.id === id) || null;
}

/**
 * Update an agent
 */
export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  const store = await getAgentStore();
  const index = store.agents.findIndex(a => a.id === id);
  
  if (index === -1) return null;
  
  store.agents[index] = {
    ...store.agents[index],
    ...updates,
    id, // Prevent ID changes
    updatedAt: new Date(),
  };
  
  await saveAgentStore(store);
  return store.agents[index];
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string): Promise<boolean> {
  const store = await getAgentStore();
  const index = store.agents.findIndex(a => a.id === id);
  
  if (index === -1) return false;
  
  // Prevent deleting king agent
  if (store.agents[index].isKing) {
    throw new Error('Cannot delete the King Agent');
  }
  
  store.agents.splice(index, 1);
  await saveAgentStore(store);
  
  // Also delete agent's documents
  const agentDocsDir = path.join(DOCUMENTS_DIR, id);
  try {
    await fs.rm(agentDocsDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
  }
  
  return true;
}

/**
 * Get the king agent
 */
export async function getKingAgent(): Promise<Agent> {
  const store = await getAgentStore();
  return store.agents.find(a => a.isKing) || DEFAULT_KING_AGENT;
}

/**
 * Save a document for an agent
 */
export async function saveDocument(
  agentId: string,
  filename: string,
  content: string
): Promise<string> {
  const agentDocsDir = path.join(DOCUMENTS_DIR, agentId);
  await fs.mkdir(agentDocsDir, { recursive: true });
  
  const docId = crypto.randomUUID();
  const docPath = path.join(agentDocsDir, `${docId}_${filename}`);
  await fs.writeFile(docPath, content);
  
  return docId;
}

/**
 * Get document content
 */
export async function getDocumentContent(agentId: string, docId: string): Promise<string | null> {
  const agentDocsDir = path.join(DOCUMENTS_DIR, agentId);
  
  try {
    const files = await fs.readdir(agentDocsDir);
    const docFile = files.find(f => f.startsWith(docId));
    if (!docFile) return null;
    
    return await fs.readFile(path.join(agentDocsDir, docFile), 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(agentId: string, docId: string): Promise<boolean> {
  const agentDocsDir = path.join(DOCUMENTS_DIR, agentId);
  
  try {
    const files = await fs.readdir(agentDocsDir);
    const docFile = files.find(f => f.startsWith(docId));
    if (!docFile) return false;
    
    await fs.unlink(path.join(agentDocsDir, docFile));
    return true;
  } catch (error) {
    return false;
  }
}
