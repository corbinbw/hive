/**
 * Context Builder
 * 
 * Builds the full prompt for an agent including:
 * - Agent instructions
 * - Document context
 * - User message
 */

import { Agent, Document } from './types';

const MAX_CONTEXT_CHARS = 100000; // ~25k tokens

/**
 * Build the full context for an agent execution
 */
export async function buildAgentContext(
  agent: Agent,
  userMessage: string
): Promise<string> {
  const parts: string[] = [];
  
  // 1. Agent instructions
  if (agent.instructions) {
    parts.push(`## Your Role\n\n${agent.instructions}`);
  }
  
  // 2. Document context
  if (agent.documents && agent.documents.length > 0) {
    const docContent = buildDocumentContext(agent.documents);
    if (docContent) {
      parts.push(`## Reference Documents\n\n${docContent}`);
    }
  }
  
  // 3. User message
  parts.push(`## User Request\n\n${userMessage}`);
  
  return parts.join('\n\n---\n\n');
}

/**
 * Build concatenated document context with size limits
 */
function buildDocumentContext(documents: Document[]): string {
  const docParts: string[] = [];
  let totalChars = 0;
  
  for (const doc of documents) {
    const docHeader = `### ${doc.filename}\n\n`;
    const docContent = doc.content || '';
    const docLength = docHeader.length + docContent.length;
    
    // Check if adding this doc would exceed limit
    if (totalChars + docLength > MAX_CONTEXT_CHARS) {
      // Try to add truncated version
      const remaining = MAX_CONTEXT_CHARS - totalChars - docHeader.length - 100;
      if (remaining > 500) {
        docParts.push(docHeader + docContent.slice(0, remaining) + '\n\n[...truncated]');
      }
      break;
    }
    
    docParts.push(docHeader + docContent);
    totalChars += docLength;
  }
  
  return docParts.join('\n\n');
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Build a summary prompt for the king agent
 */
export function buildKingAgentPrompt(
  agents: Agent[],
  userMessage: string
): string {
  const agentList = agents
    .filter(a => !a.isKing)
    .map(a => `- **${a.name}**: ${a.description}`)
    .join('\n');
  
  return `You are the King Agent - an orchestrator that routes requests to specialized agents.

## Available Agents

${agentList}

## Your Job

1. Analyze the user's request
2. Decide which agent is best suited to handle it
3. If you can handle it yourself (general questions), do so
4. If routing to another agent, explain what you're doing

## User Request

${userMessage}`;
}

/**
 * Build a handoff summary from one agent to another
 */
export function buildHandoffContext(
  fromAgent: Agent,
  toAgent: Agent,
  previousResponse: string,
  userMessage: string
): string {
  return `## Handoff from ${fromAgent.name}

The previous agent provided this context:

${previousResponse}

---

## Your Task

Continue helping with: ${userMessage}`;
}
