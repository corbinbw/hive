/**
 * Agent Management API
 * 
 * GET  /api/agents     - List all agents
 * POST /api/agents     - Create new agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { Agent, CreateAgentInput } from '@/lib/types';
import { getAgentStore, saveAgentStore } from '@/lib/agent-store';

export async function GET() {
  try {
    const store = await getAgentStore();
    return NextResponse.json({ agents: store.agents });
  } catch (error: any) {
    console.error('Failed to list agents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentInput = await request.json();
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    
    const store = await getAgentStore();
    
    // Check for duplicate name
    if (store.agents.some(a => a.name.toLowerCase() === body.name.toLowerCase())) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 400 }
      );
    }
    
    // Create new agent
    const agent: Agent = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      description: body.description || '',
      instructions: body.instructions || '',
      documents: [],
      capabilities: body.capabilities || ['general'],
      model: body.model,
      status: 'idle',
      isKing: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    store.agents.push(agent);
    await saveAgentStore(store);
    
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
