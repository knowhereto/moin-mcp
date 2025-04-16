export interface KnowledgeBaseMetaData {
  category: string;
  author: string;
  title: string;
}

export interface KnowledgeBaseSimilarTextPart {
  text: string;
  similarity: number;
  start: number;
  stop: number;
}

export interface KnowledgeBaseContentElement {
  md: string;
}

export interface KnowledgeBaseResource {
  resourceDocId: string;
  type: string;
  status: string;
  url: string;
  metaData: KnowledgeBaseMetaData;
  similarTextParts: KnowledgeBaseSimilarTextPart[];
  bestMatchScore: number;
  content: KnowledgeBaseContentElement[];
}

export function formatOutput(resources: KnowledgeBaseResource[]): string[] {
  return resources.map(resource => 
    `# Source from type ${resource.type}: ${resource.url}

# Content:
${resource.content[0].md}

---\n`
  );
}
