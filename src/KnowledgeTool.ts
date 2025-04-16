import { KnowledgeBaseResource, formatOutput } from "./models/KnowledgeBase.js";

export class KnowledgeTool {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async queryKnowledgebase(query: string): Promise<string[]> {
    const headers = {
      "x-api-key": this.apiKey,
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
      const response = await fetch(`${this.apiUrl}/knowledge/search`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
      const resources = (await response.json()) as KnowledgeBaseResource[];
      if (resources.length === 0) return [];
    
      const bestMatchScore = resources[0].bestMatchScore;
      const filteredResources = resources.filter(resource => bestMatchScore - resource.bestMatchScore <= 0.1);
      return formatOutput(filteredResources);
    } catch (error) {
      console.error("Error making NWS request:", error);
      return [];
    }
  }
  
  async createArticle(payload: {
    title: string;
    body: string;
    metadata?: Record<string, string | number | boolean>;
    activeOn?: Array<{ agent: string; channel: string }>;
    strict?: boolean;
  }): Promise<any> {
    const headers = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json"
    };
    try {
      const response = await fetch(`${this.apiUrl}/knowledge`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating article:", error);
      throw error;
    }
  }
  
  async retrieveArticles(filters: { id?: string; title?: string }): Promise<any> {
    const headers = {
      "x-api-key": this.apiKey
    };
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters.id) queryParams.append("id", filters.id);
    if (filters.title) queryParams.append("title", filters.title);
    
    try {
      const response = await fetch(`${this.apiUrl}/knowledge?${queryParams.toString()}`, {
        method: "GET",
        headers
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error retrieving articles:", error);
      throw error;
    }
  }
  
  async updateArticle(id: string, payload: {
    title?: string;
    body?: string;
    metadata?: Record<string, string | number | boolean>;
    activeOn?: Array<{ agent: string; channel: string }>;
  }): Promise<any> {
    const headers = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json"
    };
    try {
      const response = await fetch(`${this.apiUrl}/knowledge/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error updating article:", error);
      throw error;
    }
  }
  
  async deleteArticle(id: string): Promise<any> {
    const headers = {
      "x-api-key": this.apiKey
    };
    try {
      const response = await fetch(`${this.apiUrl}/knowledge/${id}`, {
        method: "DELETE",
        headers
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error deleting article:", error);
      throw error;
    }
  }
}
