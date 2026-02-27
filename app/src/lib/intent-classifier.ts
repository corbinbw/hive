/**
 * Intent Classification for Agent Routing
 * 
 * Simple keyword-based classifier for MVP.
 * Can be upgraded to LLM-based classification later.
 */

export interface IntentResult {
  category: IntentCategory;
  confidence: number;
  keywords: string[];
}

export type IntentCategory = 
  | 'research'
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'general';

const INTENT_PATTERNS: Record<IntentCategory, string[]> = {
  research: [
    'find', 'search', 'look up', 'research', 'investigate',
    'what is', 'who is', 'learn about', 'discover', 'explore',
    'competitors', 'market', 'industry', 'trends', 'data'
  ],
  coding: [
    'code', 'program', 'function', 'api', 'bug', 'fix',
    'implement', 'build', 'create', 'develop', 'script',
    'javascript', 'typescript', 'python', 'react', 'node',
    'error', 'debug', 'test', 'deploy', 'refactor'
  ],
  writing: [
    'write', 'draft', 'compose', 'email', 'blog', 'article',
    'copy', 'content', 'post', 'message', 'letter', 'document',
    'rewrite', 'edit', 'proofread', 'summarize', 'outline'
  ],
  analysis: [
    'analyze', 'evaluate', 'assess', 'compare', 'review',
    'breakdown', 'examine', 'audit', 'report', 'metrics',
    'performance', 'statistics', 'numbers', 'data', 'insights'
  ],
  general: []
};

/**
 * Classify the intent of a message
 */
export async function classifyIntent(message: string): Promise<IntentResult> {
  const lowerMessage = message.toLowerCase();
  const words = lowerMessage.split(/\s+/);
  
  const scores: Record<IntentCategory, number> = {
    research: 0,
    coding: 0,
    writing: 0,
    analysis: 0,
    general: 0
  };
  
  const matchedKeywords: string[] = [];
  
  // Score each category based on keyword matches
  for (const [category, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        scores[category as IntentCategory] += pattern.split(' ').length;
        matchedKeywords.push(pattern);
      }
    }
  }
  
  // Find highest scoring category
  let bestCategory: IntentCategory = 'general';
  let bestScore = 0;
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as IntentCategory;
    }
  }
  
  // Calculate confidence (0-1)
  const totalWords = words.length;
  const confidence = bestScore > 0 
    ? Math.min(bestScore / Math.max(totalWords * 0.3, 2), 1)
    : 0.2;
  
  return {
    category: bestCategory,
    confidence,
    keywords: matchedKeywords
  };
}

/**
 * Get suggested capabilities for an intent
 */
export function suggestCapabilities(intent: IntentCategory): string[] {
  const mapping: Record<IntentCategory, string[]> = {
    research: ['web_search', 'web_fetch', 'summarize'],
    coding: ['read_files', 'write_files', 'execute_code'],
    writing: ['read_files', 'write_files', 'summarize'],
    analysis: ['read_files', 'web_fetch', 'summarize'],
    general: ['web_search', 'web_fetch', 'read_files']
  };
  
  return mapping[intent] || mapping.general;
}
