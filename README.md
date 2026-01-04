# HCPP - Hyper Context Processing Protocol

**A reference design for context exchange in multi-AI systems.**

I keep building systems that coordinate multiple AI services — Claude for analysis, Gemini for synthesis, GPT for formatting. And I keep writing custom transformation code for every handoff.

This is my attempt to standardize that.

---

## The Problem

When you're wiring AI agents together in automated pipelines:

```typescript
// What I keep writing for every project
function visionToClaude(output: VisionResult): ClaudeInput {
  return formatForClaude(output);  // Custom logic
}

function claudeToGemini(output: ClaudeResult): GeminiInput {
  return formatForGemini(output);  // Different custom logic, loses confidence
}

function geminiToGpt(output: GeminiResult): GptInput {
  return formatForGpt(output);  // Yet another format, provenance gone
}
```

Every handoff requires custom code. Metadata gets lost. Provenance disappears.

---

## What HCPP Proposes

Structured context packets that agents pass to each other:

```typescript
interface HCPPPacket {
  hcpp_version: "1.0";
  context_id: string;
  type: "fact" | "inference" | "preference" | "goal" | "artifact_reference";
  content: string;
  semantic_tags: string[];
  confidence?: number;
  source_service: string;
  timestamp: string;
  relationships?: {
    derived_from?: string[];
    supports?: string[];
  };
}
```

Then pipelines become:

```typescript
// Vision agent produces standard packet
const extractionPacket = toHcpp(visionResult, {
  type: "fact",
  tags: ["extraction"],
  source: "vision_agent"
});

// Claude receives standard packet, produces standard packet
const analysisPacket = toHcpp(claudeResult, {
  type: "inference",
  tags: ["analysis"],
  confidence: 0.87,
  derivedFrom: [extractionPacket.contextId]
});

// Gemini receives both packets, provenance intact
const synthesisPacket = toHcpp(geminiResult, {
  type: "inference",
  tags: ["synthesis"],
  derivedFrom: [extractionPacket.contextId, analysisPacket.contextId]
});
```

---

## Quick Start

### TypeScript

```typescript
import { toHcpp, HCPPPacket } from 'hcpp';

// Create a packet from any agent output
const packet = toHcpp(agentOutput, {
  type: "inference",
  tags: ["analysis"],
  source: "claude_api",
  confidence: 0.88
});

// Pass to next agent
const nextResult = await nextAgent.process(packet);

// Chain continues with provenance
const nextPacket = toHcpp(nextResult, {
  type: "inference",
  tags: ["synthesis"],
  derivedFrom: [packet.contextId]
});
```

### Python

```python
from hcpp import to_hcpp

# Same pattern
packet = to_hcpp(agent_output,
    type="inference",
    tags=["analysis"],
    source="claude_api",
    confidence=0.88
)

# Pass to next agent
next_result = await next_agent.process(packet)
```

---

## What This Is

- ✓ A JSON schema for context packets
- ✓ A communication format between agents
- ✓ Reference implementations (TypeScript, Python)
- ✓ An exploration of the design space

## What This Isn't

- ✗ A storage solution (you decide if/where to persist)
- ✗ A transport protocol (use HTTP, A2A, whatever)
- ✗ Something AI labs will adopt
- ✗ A finished specification

---

## Related Protocols

**MCP (Anthropic):** Connects AI to data sources. Different problem — MCP fetches data, HCPP structures what agents pass to each other.

**A2A (Google):** Agent-to-agent transport. HCPP could be the structured payload inside A2A messages. A2A is the postal service; HCPP is how you organize the contents.

---

## Project Status

**Draft v0.1** — Building this because I need it. Sharing to see if others have the same problem.

### What I'm Looking For

- Does this solve a real problem you have?
- What's missing?
- What's overengineered?
- Better existing solutions?

---

## Get Involved

**Author:** Arpit Khuraswar  
**GitHub:** https://github.com/arpitck  
**Email:** arpitck@gmail.com

---

## License

Apache 2.0

---

*This emerged from real frustration building multi-agent systems. It might be useful, it might be flawed, it might already be solved better elsewhere. Let's find out together.*
