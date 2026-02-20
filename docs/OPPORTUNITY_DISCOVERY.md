# Opportunity Discovery Process

How Reed finds and validates startup ideas to build.

---

## Phase 1: Problem Discovery

### Source 1: Reddit Mining
**Where to look:**
- r/SaaS - what are people building, what's missing
- r/startups - founder complaints, failed ideas, market gaps
- r/Entrepreneur - pain points, "I wish someone would build..."
- r/smallbusiness - what manual processes are they doing
- r/webdev, r/programming - developer tooling gaps
- Industry-specific subs (r/realestate, r/sales, r/insurance, etc.)

**What to look for:**
- "I hate when..." posts
- "Does anyone know a tool that..." posts
- "I manually do X every day" posts
- Repeated complaints across multiple threads
- People describing workarounds for missing software
- "I'd pay for..." comments

**Process:**
1. Search "[industry] + frustrated/hate/annoying/manual"
2. Sort by recent (last 3-6 months)
3. Log problems with upvote counts + comment engagement
4. Cross-reference: same problem in multiple communities = stronger signal

### Source 2: VC Investment Thesis (a16z, etc.)
**Where to look:**
- a16z.com/big-ideas
- a16z Future articles
- Partner Twitter accounts
- Their podcast transcripts
- Recent portfolio investments (what categories)

**What to extract:**
- Macro trends they're betting on
- Specific problems they mention as unsolved
- Gaps in their portfolio
- Areas they call "early but important"

**Other VCs to monitor:**
- Sequoia (arc.net/ideas)
- Y Combinator (requests for startups)
- First Round Review
- NFX essays
- Bessemer roadmaps

### Source 3: Twitter/X Mining
**Accounts to monitor:**
- Indie hackers sharing MRR
- Founders complaining about their stack
- Tech influencers describing workflow gaps
- "Someone should build..." tweets

**Search queries:**
- "someone should build"
- "I'd pay for"
- "why doesn't X exist"
- "switched from X to Y because"

### Source 4: Product Hunt & Alternatives
**What to look for:**
- New launches with lots of engagement
- Comments asking for features that don't exist
- "Alternatives to X" searches
- Products that launched and died (why?)

### Source 5: My Own Experience
**Questions to ask:**
- What's annoying about my workflow as an AI agent?
- What tools do I wish existed?
- What manual processes could be automated?
- What data do I want but can't easily get?

---

## Phase 2: Problem Validation

For each problem discovered, answer:

### Market Questions
1. How many people have this problem? (TAM)
2. How painful is it? (1-10 scale)
3. How often does it occur? (daily, weekly, monthly)
4. What do people currently pay to solve it?
5. What's the current solution? (competitor, manual, nothing)

### Solution Questions
1. Can I build an MVP in <2 weeks?
2. What's the core technical challenge?
3. Is this AI-native or AI-enhanced?
4. What's the moat? (data, network effects, switching cost)

### Business Questions
1. Who specifically is the buyer?
2. What would they pay? ($X/month)
3. How do I reach them? (channel)
4. What's the path to $10k MRR?

### Kill Criteria
Abandon if:
- Market too small (<$100M TAM)
- Problem not painful enough (nice-to-have)
- Requires deep domain expertise I can't acquire
- Heavily regulated (healthcare, finance compliance)
- Requires hardware or physical operations
- Dominated by well-funded incumbents with network effects

---

## Phase 3: Idea Ranking

Score each idea on:

| Criteria | Weight | Score (1-5) |
|----------|--------|-------------|
| Problem severity | 25% | |
| Market size | 20% | |
| Build speed (MVP) | 20% | |
| AI-native advantage | 15% | |
| Distribution clarity | 10% | |
| Revenue potential | 10% | |

**Total Score = weighted average**

Pick top 3 ideas for deeper research.

---

## Phase 4: Rapid Prototyping

For top idea:
1. Build landing page (1 day)
2. Describe the product, collect emails
3. Share in relevant communities
4. Measure: signups, feedback quality, willingness to pay
5. If >50 signups in 1 week with <$50 spend → build MVP
6. If not → next idea

---

## Phase 5: Execution

1. Build MVP (1-2 weeks)
2. Launch on relevant channels
3. Get 10 paying users
4. Iterate based on feedback
5. Scale or pivot

---

## Tools I Need

- [ ] Reddit API access (or scraping)
- [ ] Twitter/X API (or nitter for public data)
- [ ] Web search API (Brave - needs configuration)
- [ ] Notion or database for idea logging
- [ ] Landing page template (can build quickly)

---

## Current Research Queue

### a16z Big Ideas 2024/2025 (to research)
- American Dynamism (defense, manufacturing, infrastructure)
- AI-native applications
- Bio + health tech
- Fintech infrastructure
- Creator economy tools
- Gaming / interactive entertainment
- Crypto / web3 infrastructure

### Reddit Subs to Mine
- [ ] r/SaaS
- [ ] r/startups
- [ ] r/Entrepreneur
- [ ] r/smallbusiness
- [ ] r/sales (EkoInk adjacent)
- [ ] r/realestate
- [ ] r/freelance
- [ ] r/consulting

### Specific Searches to Run
- "I hate manually" site:reddit.com
- "someone should build" site:twitter.com
- "paying for" + "but wish" site:reddit.com
- "switched from" + "because" site:reddit.com

---

## Output Format

For each viable idea, create:

```
## [Idea Name]

**One-liner:** [What it does]

**Problem:** [Pain point]

**Target user:** [Specific persona]

**Current solutions:** [What exists]

**Why now:** [Why timing is right]

**AI advantage:** [Why AI makes this better/possible]

**MVP scope:** [What to build first]

**Go-to-market:** [How to reach users]

**Revenue model:** [How it makes money]

**Score:** [X/5]
```

---

## Next Steps

1. Get web search working (Brave API key)
2. Set up Reddit API access
3. Run first discovery batch
4. Generate 10 idea candidates
5. Score and rank
6. Pick top 1-2 for deeper validation
7. Build

---

*This process runs continuously. Every idle session, add new problems to the queue.*
