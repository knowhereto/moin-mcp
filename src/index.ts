#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const MOIN_AI_HOST = process.env.MOIN_AI_HOST || 'https://api.moin.ai';
const MOIN_API_URL_V1 = `${MOIN_AI_HOST}/api/v1`;

// Check for API key
const MOIN_AI_API_KEY = process.env.MOIN_AI_API_KEY!;
if (!MOIN_AI_API_KEY) {
  console.error("Error: MOIN_AI_API_KEY environment variable is required");
  process.exit(1);
}

// Server implementation
const server = new Server(
  {
    name: "moin_ai",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

interface KnowledgeBaseMetaData {
  category: string;
  author: string;
  title: string;
}

interface KnowledgeBaseSimilarTextPart {
  text: string;
  similarity: number;
  start: number;
  stop: number;
}

interface KnowledgeBaseContentElement {
  md: string;
}

interface KnowledgeBaseResource {
  resourceDocId: string;
  type: string;
  status: string;
  url: string;
  metaData: KnowledgeBaseMetaData;
  similarTextParts: KnowledgeBaseSimilarTextPart[];
  bestMatchScore: number;
  content: KnowledgeBaseContentElement[];
}

function formatOutput(resources: KnowledgeBaseResource[]): string[] {
  const texts: string[] = [];
  resources.forEach(resource => {
    // add if available
    texts.push(`# Source from type ${resource.type}: ${resource.url}

# Content:
${resource.content[0].md}

---

`);
  });

  return texts;
}

// knowledge base api call
async function queryKnowledgebase(query: string): Promise<string[]> { // geändert
  const headers = {
    "x-api-key": MOIN_AI_API_KEY,
    "Content-Type": "application/json"
  };

  const body = {
    query,
    options: {
      topK: 15,
      includeContent: true,
    }
  };

  try {
    const response = await fetch(`${MOIN_API_URL_V1}/knowledge/search`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resources = (await response.json()) as KnowledgeBaseResource[];
    // nur bestmatches, deren similarity Abstand vom bestMatchScore kleiner gleich 0.1 ist
    if (resources.length === 0) {
      return [];
    }

    const bestMatchScore = resources[0].bestMatchScore;
    const filteredResources = resources.filter(resource => bestMatchScore - resource.bestMatchScore <= 0.1);
    
    return formatOutput(filteredResources);
  } catch (error) {
    console.error("Error making NWS request:", error);
    return [];
  }
}

const KB_SEARCH_TOOL: Tool = {
  name: "knowledgebase_search",
  description:
    "Performs a retrieval augmented generation search using the moin AI knowledge base, ideal for requests about company informations. " +
    "Use this for information gathering, recent events, or when you need special company informations, e.g. to anwer a question or to support in answer customer support request." +
    "Supports a RAG similarity search on embeddings. " +
    "Maximum 15 results per request. ",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query: should be a fully, naturally formulated sentence to get best similarity matches with the vector database (max 400 chars, 50 words)"
      }
    },
    required: ["query"],
  },
};

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [KB_SEARCH_TOOL],
}));

function isRagSearchArgs(args: unknown): args is { query: string; } {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as { query: string }).query === "string"
  );
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "knowledgebase_search": {
        if (!isRagSearchArgs(args)) {
          throw new Error("Invalid arguments");
        }
        const { query } = args;
        
        const results = await queryKnowledgebase(query);
        return {
          content: [{ type: "text", text: JSON.stringify(results) }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("moinAI MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});