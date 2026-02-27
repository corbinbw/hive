/**
 * Hive Agent Orchestrator
 * 
 * Routes messages to the appropriate sub-agent based on intent
 * and manages agent execution through OpenClaw
 */

import { Agent, Task } from './types';
import { classifyIntent, IntentResult } from './intent-classifier';
import { buildAgentContext } from './context-builder';

export interface OrchestrationResult {
  agent: Agent;
  task: Task;
  response: string;
}

/**
 * Extract @mention from message
 */
export function extractMention(message: string): string | null {
  const match = message.match(/^@(\w+)\s/);
  return match ? match[1] : null;
}

/**
 * Score how relevant an agent is for a given intent
 */
function scoreRelevance(agent: Agent, intent: IntentResult): number {
  let score = 0;
  
  // Capability match
  if (agent.capabilities?.includes(intent.category)) {
    score += 50;
  }
  
  // Keyword match in agent description
  const keywords = intent.keywords || [];
  const agentText = `${agent.name} ${agent.description} ${agent.instructions}`.toLowerCase();
  for (const keyword of keywords) {
    if (agentText.includes(keyword.toLowerCase())) {
      score += 10;
    }
  }
  
  // Confidence boost
  score *= intent.confidence;
  
  return score;
}

/**
 * Route a message to the best matching agent
 */
export async function routeMessage(
  message: string,
  agents: Agent[],
  kingAgent: Agent
): Promise<Agent> {
  // 1. Check for explicit @mention
  const mention = extractMention(message);
  if (mention) {
    const mentioned = agents.find(
      a => a.name.toLowerCase() === mention.toLowerCase()
    );
    if (mentioned) return mentioned;
  }
  
  // 2. Classify intent
  const intent = await classifyIntent(message);
  
  // 3. If low confidence or general query, use king agent
  if (intent.confidence < 0.5 || intent.category === 'general') {
    return kingAgent;
  }
  
  // 4. Score and rank agents
  const scored = agents
    .filter(a => a.id !== kingAgent.id)
    .map(a => ({ agent: a, score: scoreRelevance(a, intent) }))
    .sort((a, b) => b.score - a.score);
  
  // 5. Return best match or fall back to king
  return scored[0]?.score > 30 ? scored[0].agent : kingAgent;
}

/**
 * Execute a task through an agent
 */
export async function executeTask(
  agent: Agent,
  message: string,
  openclawClient: any
): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    agentId: agent.id,
    input: message,
    output: '',
    status: 'pending',
    startedAt: new Date(),
  };
  
  try {
    task.status = 'running';
    
    // Build context with agent instructions + documents
    const contextualPrompt = await buildAgentContext(agent, message);
    
    // Spawn sub-agent session in OpenClaw
    const result = await openclawClient.spawnAgent({
      task: contextualPrompt,
      label: `hive-${agent.name.toLowerCase().replace(/\s+/g, '-')}`,
      model: agent.model || 'sonnet',
    });
    
    task.output = result.response;
    task.status = 'completed';
    task.completedAt = new Date();
    
  } catch (error: any) {
    task.status = 'failed';
    task.output = error.message || 'Task failed';
    task.completedAt = new Date();
  }
  
  return task;
}

/**
 * Main orchestration entry point
 */
export async function orchestrate(
  message: string,
  agents: Agent[],
  kingAgent: Agent,
  openclawClient: any
): Promise<OrchestrationResult> {
  // Route to best agent
  const selectedAgent = await routeMessage(message, agents, kingAgent);
  
  // Execute task
  const task = await executeTask(selectedAgent, message, openclawClient);
  
  return {
    agent: selectedAgent,
    task,
    response: task.output,
  };
}
