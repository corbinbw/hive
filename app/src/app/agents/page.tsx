'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Agent } from '@/lib/types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data.agents);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAgent(id: string, name: string) {
    if (!confirm(`Delete agent "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete agent');
      setAgents(agents.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const statusColors = {
    idle: 'bg-gray-400',
    working: 'bg-green-500 animate-pulse',
    error: 'bg-red-500',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Agents</h1>
            <p className="text-gray-600 mt-1">Create and manage your AI team</p>
          </div>
          <Link
            href="/agents/new"
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium"
          >
            + New Agent
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">
                    {agent.isKing ? '👑' : '🤖'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                      <span className="text-sm text-gray-500 capitalize">{agent.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {agent.description || 'No description'}
              </p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-4">
                {agent.capabilities?.slice(0, 3).map(cap => (
                  <span
                    key={cap}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    {cap}
                  </span>
                ))}
                {(agent.capabilities?.length || 0) > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    +{agent.capabilities!.length - 3}
                  </span>
                )}
              </div>

              {/* Documents count */}
              <div className="text-sm text-gray-500 mb-4">
                📄 {agent.documents?.length || 0} documents
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Link
                  href={`/agents/${agent.id}`}
                  className="flex-1 text-center py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition text-sm font-medium"
                >
                  Edit
                </Link>
                {!agent.isKing && (
                  <button
                    onClick={() => deleteAgent(agent.id, agent.name)}
                    className="flex-1 text-center py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-600 mb-6">Create your first agent to get started</p>
            <Link
              href="/agents/new"
              className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            >
              Create Agent
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
