#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { KnowledgeTool } from "./KnowledgeTool.js";

const MOIN_AI_HOST = process.env.MOIN_AI_HOST || 'https://api.moin.ai';
const MOIN_API_URL_V1 = `${MOIN_AI_HOST}/api/v1`;

const MOIN_AI_API_KEY = process.env.MOIN_AI_API_KEY!;
if (!MOIN_AI_API_KEY) {
  console.error("Error: MOIN_AI_API_KEY environment variable is required");
  process.exit(1);
}

// Server implementation
const server = new Server(
  { name: "moin_ai", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const kbToolInstance = new KnowledgeTool(MOIN_API_URL_V1, MOIN_AI_API_KEY);

const KB_SEARCH_TOOL: Tool = {
  name: "knowledgebase_search",
  description:
    "Performs a retrieval augmented generation search using the moin AI knowledge base. " +
    "Use this for information gathering, recent events, or when you need specific company information. " +
    "Supports a RAG similarity search on embeddings. Maximum 15 results per request.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Search query: a fully, naturally formulated sentence (max 400 chars, 50 words)",
      },
    },
    required: ["query"],
  },
};

const KB_CREATE_TOOL: Tool = {
  name: "knowledgebase_create",
  description:
    "Creates a new external article in the knowledge base.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Article Title (min 3 characters)" },
      body: { type: "string", description: "Article Content (min 1 character)" },
      metadata: { type: "object", description: "Optional metadata (flat structure)" },
      activeOn: { 
        type: "array", 
        items: { 
          type: "object", 
          properties: { 
            agent: { type: "string" }, 
            channel: { type: "string" }
          },
          required: ["agent", "channel"]
        },
        description: "Optional active channels or agents. The default agent is 'default' and the default channel is also 'default'." 
      },
      strict: { type: "boolean", description: "If true, restricts to active agents/channels" }
    },
    required: ["title", "body"],
  },
};

const KB_RETRIEVE_TOOL: Tool = {
  name: "knowledgebase_retrieve",
  description:
    "Retrieves articles from the knowledge base with optional filters (id, title).",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Filter by article ID" },
      title: { type: "string", description: "Filter by article title" },
    },
    additionalProperties: false,
  },
};

const KB_UPDATE_TOOL: Tool = {
  name: "knowledgebase_update",
  description:
    "Updates an existing article in the knowledge base. Provide the article ID and the fields to update.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Article ID" },
      title: { type: "string", description: "Updated title (min 3 characters)" },
      body: { type: "string", description: "Updated content (min 1 character)" },
      metadata: { type: "object", description: "Optional metadata (flat structure)" },
      activeOn: { 
        type: "array", 
        items: { 
          type: "object", 
          properties: { 
            agent: { type: "string" }, 
            channel: { type: "string" }
          },
          required: ["agent", "channel"]
        },
        description: "Optional active channels" 
      },
    },
    required: ["id"],
  },
};

const KB_DELETE_TOOL: Tool = {
  name: "knowledgebase_delete",
  description:
    "Deletes an article from the knowledge base by ID.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Article ID to delete" },
    },
    required: ["id"],
  },
};

// Add all tools to the list
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [KB_SEARCH_TOOL, KB_CREATE_TOOL, KB_RETRIEVE_TOOL, KB_UPDATE_TOOL, KB_DELETE_TOOL],
}));

function isRagSearchArgs(args: unknown): args is { query: string } {
  return typeof args === "object" &&
         args !== null &&
         "query" in args &&
         typeof (args as { query: string }).query === "string";
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    if (!args) throw new Error("No arguments provided");

    switch (name) {
      case "knowledgebase_search": {
        if (!isRagSearchArgs(args)) {
          throw new Error("Invalid arguments");
        }
        const { query } = args;
        const results = await kbToolInstance.queryKnowledgebase(query);
        return {
          content: [{ type: "text", text: JSON.stringify(results) }],
          isError: false,
        };
      }
      case "knowledgebase_create": {
        // Expecting title and body, optional metadata, activeOn and strict
        const { title, body, metadata, activeOn, strict } = args as {
          title: string;
          body: string;
          metadata?: Record<string, string | number | boolean>;
          activeOn?: Array<{ agent: string; channel: string }>;
          strict?: boolean;
        };
        const result = await kbToolInstance.createArticle({ title, body, metadata, activeOn, strict });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: false,
        };
      }
      case "knowledgebase_retrieve": {
        const filters = args as { id?: string; title?: string };
        const result = await kbToolInstance.retrieveArticles(filters);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: false,
        };
      }
      case "knowledgebase_update": {
        const { id, ...payload } = args as { id: string; title?: string; body?: string; metadata?: Record<string, string | number | boolean>; activeOn?: Array<{ agent: string; channel: string }> };
        const result = await kbToolInstance.updateArticle(id, payload);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: false,
        };
      }
      case "knowledgebase_delete": {
        const { id } = args as { id: string };
        const result = await kbToolInstance.deleteArticle(id);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
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
        { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);
  transport.onerror = (error: Error): void => {
    console.error(`STDIO transport error: ${error}`, { context: "stdio-transport" });
  };
  transport.onclose = (): void => {
    console.error("STDIO transport closed");
  };
  console.error("moinAI MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});