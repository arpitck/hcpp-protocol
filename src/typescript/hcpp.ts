/**
 * HCPP - Hyper Context Processing Protocol
 * A simple reference implementation for context exchange in multi-AI systems.
 * 
 * This is a communication format, not a storage solution.
 * 
 * Author: Arpit Khuraswar
 * GitHub: https://github.com/arpitck
 */

// ============================================================================
// Types
// ============================================================================

export type PacketType = 
  | "fact" 
  | "inference" 
  | "preference" 
  | "goal" 
  | "artifact_reference";

export interface HCPPPacket {
  hcpp_version: "1.0";
  context_id: string;
  type: PacketType;
  content: string;
  source_service: string;
  timestamp: string;
  semantic_tags?: string[];
  confidence?: number;
  confidence_note?: string;
  relationships?: {
    derived_from?: string[];
    supports?: string[];
    conflicts_with?: string[];
  };
  metadata?: Record<string, unknown>;
  // For artifact references
  content_ref?: string;
  content_hash?: string;
}

export interface CreatePacketOptions {
  type?: PacketType;
  tags?: string[];
  source?: string;
  confidence?: number;
  derivedFrom?: string[];
  supports?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate a unique context ID
 */
function generateContextId(): string {
  const random = Math.random().toString(36).substring(2, 10);
  return `ctx_${random}`;
}

/**
 * Create an HCPP packet from any content
 * 
 * @example
 * const packet = toHcpp(claudeResponse.content, {
 *   type: "inference",
 *   tags: ["analysis", "risk"],
 *   source: "claude_api",
 *   confidence: 0.87,
 *   derivedFrom: [previousPacket.context_id]
 * });
 */
export function toHcpp(content: string, options: CreatePacketOptions = {}): HCPPPacket {
  const packet: HCPPPacket = {
    hcpp_version: "1.0",
    context_id: generateContextId(),
    type: options.type || "inference",
    content,
    source_service: options.source || "unknown",
    timestamp: new Date().toISOString(),
  };

  if (options.tags && options.tags.length > 0) {
    packet.semantic_tags = options.tags;
  }

  if (options.confidence !== undefined) {
    packet.confidence = options.confidence;
    packet.confidence_note = "Model-specific, not comparable across services";
  }

  if (options.derivedFrom || options.supports) {
    packet.relationships = {};
    if (options.derivedFrom) {
      packet.relationships.derived_from = options.derivedFrom;
    }
    if (options.supports) {
      packet.relationships.supports = options.supports;
    }
  }

  if (options.metadata) {
    packet.metadata = options.metadata;
  }

  return packet;
}

/**
 * Create an artifact reference packet (for images, files, etc.)
 * 
 * @example
 * const imagePacket = toHcppArtifact(
 *   "Architecture diagram",
 *   "https://storage.example.com/diagram.png",
 *   {
 *     tags: ["diagram", "architecture"],
 *     source: "claude_artifacts",
 *     metadata: { format: "png", dimensions: "1920x1080" }
 *   }
 * );
 */
export function toHcppArtifact(
  description: string, 
  url: string, 
  options: CreatePacketOptions & { hash?: string } = {}
): HCPPPacket {
  const packet = toHcpp(description, { ...options, type: "artifact_reference" });
  packet.content_ref = url;
  if (options.hash) {
    packet.content_hash = options.hash;
  }
  return packet;
}

/**
 * Parse an HCPP packet from JSON
 */
export function fromHcpp(json: string | object): HCPPPacket {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  
  if (data.hcpp_version !== "1.0") {
    throw new Error(`Unsupported HCPP version: ${data.hcpp_version}`);
  }
  
  return data as HCPPPacket;
}

/**
 * Convert packet to JSON string
 */
export function toJson(packet: HCPPPacket, pretty = false): string {
  return JSON.stringify(packet, null, pretty ? 2 : undefined);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter packets by semantic tags
 * 
 * @example
 * const analysisPackets = filterByTags(packets, ["analysis", "risk"]);
 */
export function filterByTags(packets: HCPPPacket[], tags: string[]): HCPPPacket[] {
  return packets.filter(p => 
    p.semantic_tags && tags.some(tag => p.semantic_tags!.includes(tag))
  );
}

/**
 * Filter packets by minimum confidence
 */
export function filterByConfidence(packets: HCPPPacket[], minConfidence: number): HCPPPacket[] {
  return packets.filter(p => 
    p.confidence !== undefined && p.confidence >= minConfidence
  );
}

/**
 * Filter packets by type
 */
export function filterByType(packets: HCPPPacket[], types: PacketType[]): HCPPPacket[] {
  return packets.filter(p => types.includes(p.type));
}

/**
 * Get the derivation chain for a packet (all ancestors)
 */
export function getDerivationChain(
  packet: HCPPPacket, 
  allPackets: HCPPPacket[]
): HCPPPacket[] {
  const chain: HCPPPacket[] = [packet];
  const visited = new Set<string>([packet.context_id]);
  
  function collectAncestors(p: HCPPPacket) {
    const parentIds = p.relationships?.derived_from || [];
    for (const parentId of parentIds) {
      if (visited.has(parentId)) continue;
      visited.add(parentId);
      
      const parent = allPackets.find(pkt => pkt.context_id === parentId);
      if (parent) {
        chain.push(parent);
        collectAncestors(parent);
      }
    }
  }
  
  collectAncestors(packet);
  return chain;
}

/**
 * Extract just the content from packets (useful for passing to agents)
 */
export function extractContent(packets: HCPPPacket[]): string[] {
  return packets.map(p => p.content);
}

/**
 * Create a summary of packets for debugging
 */
export function summarize(packets: HCPPPacket[]): string {
  return packets.map(p => 
    `[${p.context_id}] ${p.type} from ${p.source_service}: ${p.content.substring(0, 50)}...`
  ).join("\n");
}

// ============================================================================
// Example Usage
// ============================================================================

// Example: Multi-AI Pipeline
async function examplePipeline() {
  const packets: HCPPPacket[] = [];
  
  // Stage 1: Vision agent extracts document
  const visionResult = "12 pages, English, PDF format, contains tables";
  const extractionPacket = toHcpp(visionResult, {
    type: "fact",
    tags: ["extraction", "document"],
    source: "vision_agent",
    confidence: 0.94
  });
  packets.push(extractionPacket);
  
  // Stage 2: Claude analyzes
  const claudeResult = "Document contains non-standard indemnification in Section 4. Risk: medium-high.";
  const analysisPacket = toHcpp(claudeResult, {
    type: "inference",
    tags: ["analysis", "legal", "risk"],
    source: "claude_sonnet_4",
    confidence: 0.87,
    derivedFrom: [extractionPacket.context_id]
  });
  packets.push(analysisPacket);
  
  // Stage 3: Gemini synthesizes
  const geminiResult = "Compared to standard templates, 3 clauses warrant review.";
  const synthesisPacket = toHcpp(geminiResult, {
    type: "inference",
    tags: ["synthesis", "recommendation"],
    source: "gemini_pro",
    confidence: 0.82,
    derivedFrom: [extractionPacket.context_id, analysisPacket.context_id]
  });
  packets.push(synthesisPacket);
  
  // Query and filter
  console.log("All packets:");
  console.log(summarize(packets));
  
  console.log("\nHigh confidence analysis:");
  const highConfidence = filterByConfidence(
    filterByTags(packets, ["analysis"]), 
    0.8
  );
  console.log(summarize(highConfidence));
  
  console.log("\nDerivation chain for synthesis:");
  const chain = getDerivationChain(synthesisPacket, packets);
  console.log(summarize(chain));
  
  return packets;
}

// Run example if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  examplePipeline().catch(console.error);
}
