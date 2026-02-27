# Hive Agent Orchestration Spec

## Overview

Hive adds an agent management layer on top of OpenClaw. Users can:
- Create custom sub-agents with their own instructions and context
- Upload documents as agent knowledge
- Chat through a king agent that routes to specialists
- Monitor agent activity in real-time

## Core User Stories

1. **As a user, I want to create a new agent** so I can specialize it for a specific task
2. **As a user, I want to upload documents to an agent** so it has relevant context
3. **As a user, I want to chat and have my request auto-routed** so I don't have to think about which agent to use
4. **As a user, I want to see which agents are working** so I know what's happening
5. **As a user, I want to explicitly call an agent** with @mention or /command

## Data Model

### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;        // System prompt
  documents: Document[];       // Context files
  capabilities: string[];      // Allowed tools
  status: 'idle' | 'working';
  createdAt: Date;
  updatedAt: Date;
}
```

### Document
```typescript
interface Document {
  id: string;
  agentId: string;
  filename: string;
  content: string;             // Extracted text
  mimeType: string;
  size: number;
  uploadedAt: Date;
}
```

### Task
```typescript
interface Task {
  id: string;
  agentId: string;
  input: string;               // User's request
  output: string;              // Agent's response
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}
```

## API Routes

### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create agent
- `GET /api/agents/[id]` - Get agent details
- `PUT /api/agents/[id]` - Update agent
- `DELETE /api/agents/[id]` - Delete agent

### Documents
- `GET /api/agents/[id]/documents` - List agent documents
- `POST /api/agents/[id]/documents` - Upload document
- `DELETE /api/agents/[id]/documents/[docId]` - Remove document

### Chat / Orchestration
- `POST /api/chat` - Send message to king agent
- `GET /api/chat/history` - Get chat history
- `GET /api/agents/status` - Get live status of all agents

### Tasks
- `GET /api/tasks` - List recent tasks
- `GET /api/tasks/[id]` - Get task details

## UI Pages

```
/                     → Dashboard (agent grid + activity feed)
/agents               → Agent list
/agents/new           → Create agent
/agents/[id]          → Edit agent (instructions, docs, capabilities)
/chat                 → Chat interface
/activity             → Full activity log
/settings             → OpenClaw connection, preferences
```

## King Agent Routing Logic

```typescript
async function routeMessage(message: string, agents: Agent[]): Promise<Agent> {
  // 1. Check for explicit @mention
  const mention = extractMention(message);
  if (mention) {
    return agents.find(a => a.name.toLowerCase() === mention.toLowerCase());
  }
  
  // 2. Classify intent
  const intent = await classifyIntent(message);
  
  // 3. Match to agent capabilities
  const bestMatch = agents
    .filter(a => a.capabilities.includes(intent.category))
    .sort((a, b) => scoreRelevance(b, intent) - scoreRelevance(a, intent))[0];
  
  return bestMatch || getKingAgent();
}
```

## Context Injection

When a sub-agent is called:
1. Load agent's instruction prompt
2. Load all document contents (concatenated)
3. Prepend to the user's message
4. Send to OpenClaw session

```typescript
function buildAgentPrompt(agent: Agent, userMessage: string): string {
  const docs = agent.documents.map(d => d.content).join('\n\n---\n\n');
  
  return `
${agent.instructions}

## Context Documents

${docs}

## User Request

${userMessage}
  `.trim();
}
```

## OpenClaw Integration

Uses existing OpenClaw features:
- `sessions_spawn` for sub-agent execution
- `sessions_list` for status monitoring
- `sessions_history` for activity feed
- WebSocket connection for real-time updates

## File Structure

```
hive/
├── app/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                 # Dashboard
│       │   ├── agents/
│       │   │   ├── page.tsx             # Agent list
│       │   │   ├── new/page.tsx         # Create agent
│       │   │   └── [id]/page.tsx        # Edit agent
│       │   ├── chat/page.tsx            # Chat interface
│       │   └── api/
│       │       ├── agents/
│       │       │   ├── route.ts         # List/create
│       │       │   └── [id]/
│       │       │       ├── route.ts     # Get/update/delete
│       │       │       └── documents/route.ts
│       │       ├── chat/route.ts        # Send message
│       │       └── tasks/route.ts       # Task history
│       ├── lib/
│       │   ├── orchestrator.ts          # King agent + routing
│       │   ├── context-builder.ts       # Document injection
│       │   ├── openclaw-client.ts       # OpenClaw API wrapper
│       │   └── intent-classifier.ts     # Route classification
│       └── components/
│           ├── AgentCard.tsx
│           ├── AgentEditor.tsx
│           ├── DocumentUploader.tsx
│           ├── ChatInterface.tsx
│           └── ActivityFeed.tsx
├── storage/
│   ├── agents.json                      # Agent configs (SQLite later)
│   └── documents/                       # Uploaded files
└── docs/
    └── AGENT_ORCHESTRATION_SPEC.md      # This file
```

## Phase 1 Deliverables (MVP)

- [ ] Agent CRUD (create, read, update, delete)
- [ ] Document upload and storage
- [ ] Basic chat with king agent routing
- [ ] Agent status display
- [ ] Activity feed

## Success Criteria

1. User can create an agent in < 2 minutes
2. User can upload a document and have agent reference it
3. Chat messages route to correct agent 80%+ of the time
4. Dashboard shows real-time agent status

## Open Questions

1. How to handle long-running tasks? (polling vs websocket)
2. Max document size / count per agent?
3. Should agents be able to call other agents?
4. How to handle agent failures gracefully?
