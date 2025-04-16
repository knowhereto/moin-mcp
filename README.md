
# moinAI MCP Server

**moinAI MCP Server** is a lightweight gateway that connects AI platforms like *Cursor*, *Claude Desktop*, or your own LLM environments with **moinAI**.  
It enables direct interaction with the curated Knowledge Base from the **moinAI platform** – for content queries, article management, or dynamic knowledge integration into AI workflows.

---

## What Can You Do with the Moin MCP Server?

- Retrieve content from the moinAI Knowledge Base via prompt – directly in your AI environment  
- Create, edit, or delete articles in your Knowledge Base – all via command  
- Automate content management processes in your own tools or AI-driven workflows  
- Build custom tools and integrations based on a stable, locally running interface

---

## Integration into AI Platforms (e.g., Cursor or Claude Desktop)

### 1. Requirements

- **Node.js installed**
- **Access to the moinAI platform** ([moin.ai](https://moin.ai))
- **API key** (available under *Bot Settings > API Settings* in the moinAI Hub)

### 2. Local Setup via NPX

Add the following configuration to your AI platform settings:

```json
{
  "mcpServers": {
    "moin-mcp-server": {
      "command": "npx",
      "args": ["-y", "@moin_ai/moin-mcp"],
      "env": {
        "MOIN_AI_API_KEY": "your_api_key"
      }
    }
  }
}
```

👉 This runs the MCP Server locally and connects your AI platform to your moinAI Knowledge Base.

---

## Supported Tools

The Moin MCP Server provides a set of useful tools:

| Tool                | Description                                                       |
|---------------------|-------------------------------------------------------------------|
| `queryKnowledgebase` | Search the Knowledge Base for relevant content                   |
| `createArticle`       | Create a new article directly in your moinAI Knowledge Base     |
| `retrieveArticles`    | Retrieve existing articles using filter criteria                |
| `updateArticle`       | Update existing content in your Knowledge Base                  |
| `deleteArticle`       | Permanently delete articles from your moinAI environment        |

These tools can be triggered via prompt from your AI platform.

---

## 📄 License

Released under the **MIT License**. See the [LICENSE](./LICENSE) file for more information.

---

## 🙌 Contribute

Found a bug or have ideas for new tools?  
Open an issue or submit a pull request – we welcome contributions!