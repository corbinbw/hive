/**
 * Individual Agent API
 * 
 * GET    /api/agents/[id]  - Get agent details
 * PUT    /api/agents/[id]  - Update agent
 * DELETE /api/agents/[id]  - Delete agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { UpdateAgentInput } from '@/lib/types';
import { getAgent, updateAgent, deleteAgent } from '@/lib/agent-store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = await getAgent(id);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error('Failed to get agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get agent' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateAgentInput = await request.json();
    
    const agent = await getAgent(id);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Prevent modifying king agent's core properties
    if (agent.isKing && body.name) {
      return NextResponse.json(
        { error: 'Cannot rename the King Agent' },
        { status: 400 }
      );
    }
    
    const updated = await updateAgent(id, {
      name: body.name?.trim() || agent.name,
      description: body.description ?? agent.description,
      instructions: body.instructions ?? agent.instructions,
      capabilities: body.capabilities ?? agent.capabilities,
      model: body.model ?? agent.model,
    });
    
    return NextResponse.json({ agent: updated });
  } catch (error: any) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const deleted = await deleteAgent(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Agent not found or cannot be deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
