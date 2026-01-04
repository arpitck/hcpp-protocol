# HCPP Core Specification (Draft v0.1)

A communication format for context exchange between AI agents.

**This is a working draft.** Feedback welcome, corrections needed.

---

## What HCPP Is

HCPP defines a **packet format** for passing context between AI agents. 

It does not define:
- How packets are transported (use HTTP, A2A, websockets, whatever)
- Where packets are stored (if at all — that's your choice)
- How agents discover each other

---

## Context Packet Schema

### Required Fields

```typescript
interface HCPPPacket {
  hcpp_version: "1.0";
  context_id: string;          // Unique identifier
  type: PacketType;            // What kind of context
  content: string;             // The actual content
  source_service: string;      // Which agent produced this
  timestamp: string;           // ISO 8601 format
}

type PacketType = 
  | "fact"                     // Verified/extracted information
  | "inference"                // Conclusions drawn by AI
  | "preference"               // User preferences
  | "goal"                     // Objectives to achieve
  | "artifact_reference";      // Reference to external media
```

### Optional Fields

```typescript
interface HCPPPacketOptional {
  semantic_tags?: string[];           // For categorization
  confidence?: number;                // 0.0 to 1.0
  confidence_note?: string;           // "Model-specific, not comparable"
  relationships?: {
    derived_from?: string[];          // Parent context IDs
    supports?: string[];              // Related context IDs
    conflicts_with?: string[];        // Contradicting context IDs
  };
  metadata?: Record<string, unknown>; // Any additional data
  
  // For artifact_reference type only
  content_ref?: string;               // URL to media
  content_hash?: string;              // Verification hash
}
```

---

## Context ID Format

```
ctx_[8-character-random]
```

Examples:
- `ctx_7f9a2c1e`
- `ctx_abc12345`

---

## Packet Types

| Type | Use Case |
|------|----------|
| `fact` | Extracted or verified information |
| `inference` | Conclusions drawn by AI |
| `preference` | User constraints or preferences |
| `goal` | Objectives to achieve |
| `artifact_reference` | Reference to images, files, etc. |

---

## Relationships

| Relationship | Meaning |
|--------------|---------|
| `derived_from` | This packet was created from these parent packets |
| `supports` | This packet provides evidence for these packets |
| `conflicts_with` | This packet contradicts these packets |

---

## Example: Three-Stage Pipeline

### Stage 1: Vision Agent Extracts

```json
{
  "hcpp_version": "1.0",
  "context_id": "ctx_001abc",
  "type": "fact",
  "content": "12 pages, PDF format, contains tables in sections 3-5",
  "source_service": "vision_agent",
  "timestamp": "2026-01-03T14:20:00Z",
  "semantic_tags": ["extraction", "document"],
  "confidence": 0.94
}
```

### Stage 2: Claude Analyzes

```json
{
  "hcpp_version": "1.0",
  "context_id": "ctx_002def",
  "type": "inference",
  "content": "Non-standard indemnification clause in Section 4. Risk level: medium-high.",
  "source_service": "claude_sonnet_4",
  "timestamp": "2026-01-03T14:21:00Z",
  "semantic_tags": ["analysis", "legal", "risk"],
  "confidence": 0.87,
  "confidence_note": "Model-specific, not comparable across services",
  "relationships": {
    "derived_from": ["ctx_001abc"]
  }
}
```

### Stage 3: Gemini Synthesizes

```json
{
  "hcpp_version": "1.0",
  "context_id": "ctx_003ghi",
  "type": "inference",
  "content": "3 unusual clauses warrant review before signing.",
  "source_service": "gemini_pro",
  "timestamp": "2026-01-03T14:22:00Z",
  "semantic_tags": ["synthesis", "recommendation"],
  "confidence": 0.82,
  "relationships": {
    "derived_from": ["ctx_001abc", "ctx_002def"]
  }
}
```

---

## Artifact References

For images, files, diagrams:

```json
{
  "hcpp_version": "1.0",
  "context_id": "ctx_diagram_xyz",
  "type": "artifact_reference",
  "content": "System architecture diagram showing API gateway",
  "source_service": "claude_artifacts",
  "timestamp": "2026-01-03T14:25:00Z",
  "semantic_tags": ["diagram", "architecture"],
  "content_ref": "https://storage.example.com/diagram.png",
  "content_hash": "sha256:abc123...",
  "metadata": {
    "format": "png",
    "dimensions": "1920x1080"
  }
}
```

**Note:** HCPP references media, it doesn't transfer it. Where you store media is your choice.

---

## Known Limitations

1. **Confidence scores aren't comparable** — Different models calculate confidence differently
2. **Semantic tags are fuzzy** — No shared ontology across services
3. **Privacy flags are advisory** — No enforcement mechanism
4. **Version 1.0 is minimal** — Many features intentionally left out

---

## What's Intentionally NOT Defined

- Transport mechanism
- Storage/persistence
- Agent discovery
- Authentication
- Streaming
- Encryption

These are all valid concerns but outside scope of the packet format.

---

## Changelog

**v0.1 (January 2026):** Initial draft
