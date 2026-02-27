'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgentCapability } from '@/lib/types';

const CAPABILITIES: { id: AgentCapability; label: string; description: string }[] = [
  { id: 'web_search', label: 'Web Search', description: 'Search the internet' },
  { id: 'web_fetch', label: 'Web Fetch', description: 'Read web pages' },
  { id: 'read_files', label: 'Read Files', description: 'Read local files' },
  { id: 'write_files', label: 'Write Files', description: 'Create and edit files' },
  { id: 'execute_code', label: 'Execute Code', description: 'Run code and commands' },
  { id: 'send_messages', label: 'Send Messages', description: 'Send emails/texts' },
  { id: 'summarize', label: 'Summarize', description: 'Condense information' },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [capabilities, setCapabilities] = useState<AgentCapability[]>(['general']);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          instructions,
          capabilities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      const { agent } = await res.json();
      router.push(`/agents/${agent.id}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  function toggleCapability(cap: AgentCapability) {
    setCapabilities(prev =>
      prev.includes(cap)
        ? prev.filter(c => c !== cap)
        : [...prev, cap]
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/agents"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Agent</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Research Agent"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Searches the web and compiles research reports"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              A short description of what this agent does
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="You are a research specialist. When given a topic, you search the web, compile findings, and present them in bullet points with sources..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Tell this agent how to behave, what to focus on, and how to format responses
            </p>
          </div>

          {/* Capabilities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Capabilities
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CAPABILITIES.map(cap => (
                <label
                  key={cap.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    capabilities.includes(cap.id)
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={capabilities.includes(cap.id)}
                    onChange={() => toggleCapability(cap.id)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{cap.label}</div>
                    <div className="text-sm text-gray-500">{cap.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/agents"
              className="px-6 py-2 text-gray-700 hover:text-gray-900 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
