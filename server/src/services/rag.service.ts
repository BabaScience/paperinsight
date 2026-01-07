import 'reflect-metadata';
import { injectable } from 'inversify';
import { get_encoding, Tiktoken } from 'tiktoken';
import { env } from '../config/env.js';
import { embeddingService } from './embedding.service.js';
import { vectorService } from './vector.service.js';
import { Chunk } from '../models/chunk.model.js';
import { Paper, IMermaidDiagram, MermaidDiagramType, IImplementationIdea } from '../models/paper.model.js';
import { IUserProfile } from '../models/user.model.js';
import { llmService } from './llm/llm.service.js';
import { tokenService, TokenUsageInfo } from './token.service.js';

/**
 * Custom error for token limit exceeded
 */
export class TokenLimitExceededError extends Error {
  public tokenUsage: TokenUsageInfo;

  constructor(message: string, tokenUsage: TokenUsageInfo) {
    super(message);
    this.name = 'TokenLimitExceededError';
    this.tokenUsage = tokenUsage;
  }
}

interface QueryResult {
  answer: string;
  sources: Array<{
    chunkId: string;
    content: string;
    score: number;
    sectionTitle?: string;
  }>;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (result: QueryResult) => void;
  onError: (error: Error) => void;
}

interface AnalysisResult {
  summary: string;
  keyInsights: string[];
  methodology?: string;
  limitations?: string;
  cached?: boolean;
}

interface VisualsResult {
  diagrams: IMermaidDiagram[];
  cached: boolean;
}

interface IdeasResult {
  ideas: IImplementationIdea[];
  userContext: {
    researchField?: string;
    interests?: string[];
    currentProjects?: string;
  };
  cached: boolean;
}

/**
 * Clean JSON response from LLM by removing markdown code fences
 * Some models (like DeepSeek) wrap JSON in ```json ... ``` blocks
 */
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();
  
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    // Find the end of the first line (which might be ```json or just ```)
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
    // Remove trailing ```
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  
  return cleaned.trim();
}

/**
 * Extract JSON from a response that may contain additional text
 * Handles cases where LLM returns JSON wrapped in explanation text
 */
function extractJsonFromResponse(response: string): string {
  const cleaned = cleanJsonResponse(response);
  
  // If it's already valid JSON, return it
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Try to find JSON object in the response
  }
  
  // Look for JSON object pattern - find the first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch {
      // Not valid JSON
    }
  }
  
  // Look for JSON array pattern - find the first [ and last ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonCandidate = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch {
      // Not valid JSON
    }
  }
  
  // Return original cleaned response (will fail at parse, but with better error)
  return cleaned;
}

const BASE_SYSTEM_PROMPT = `You are an expert research paper analyst. Your task is to answer questions about academic papers based on the provided context.

Guidelines:
- Base your answers primarily on the provided context from the paper
- If the context doesn't contain enough information, use the paper's abstract and title to provide a general answer, but clearly indicate when you're doing so
- Use precise academic language and maintain technical accuracy
- When citing specific findings or claims, reference the section they come from if available
- Be concise but thorough in your explanations
- If the question is about methodology, focus on the specific approaches used
- For results questions, include relevant statistics or data when available
- Structure your response clearly with paragraphs
- Use markdown formatting when helpful (lists, bold for emphasis, etc.)

If you truly cannot answer based on the provided information, explain what aspects of the question might not be covered in the paper.`;

/**
 * Expertise level guidance for AI responses
 */
const EXPERTISE_LEVEL_GUIDE: Record<string, string> = {
  beginner: 'The user is a beginner. Use simple, accessible language. Explain technical terms when you use them. Use analogies and everyday examples to make complex concepts easier to understand.',
  intermediate: 'The user has intermediate knowledge. You can use common technical terms without extensive explanation, but clarify more specialized jargon when needed.',
  advanced: 'The user has advanced knowledge in their field. Use technical language appropriately and focus on nuanced details and implications of findings.',
  expert: 'The user is an expert. Use technical language freely. Focus on subtle nuances, methodological details, and potential implications. You can assume familiarity with common concepts.',
};

/**
 * Preferred style guidance for AI responses
 */
const STYLE_GUIDE: Record<string, string> = {
  technical: 'Respond in a technical, precise manner with detailed explanations and proper terminology.',
  simplified: 'Keep explanations simple and straightforward. Prioritize clarity over comprehensiveness.',
  'examples-heavy': 'Include many concrete examples, analogies, and real-world applications to illustrate points.',
  concise: 'Be brief and to the point. Avoid unnecessary elaboration. Use bullet points where appropriate.',
};

/**
 * Build a dynamic system prompt that includes user profile context when relevant
 */
function buildSystemPrompt(profile?: IUserProfile, question: string = ''): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // If no profile or profile is empty, return base prompt
  if (!profile || Object.keys(profile).length === 0) {
    return prompt;
  }

  const profileContext: string[] = [];

  // Always apply expertise level - it affects communication style
  if (profile.expertiseLevel) {
    const levelGuide = EXPERTISE_LEVEL_GUIDE[profile.expertiseLevel];
    if (levelGuide) {
      profileContext.push(levelGuide);
    }
  }

  // Always apply preferred style if set
  if (profile.preferredStyle) {
    const styleGuide = STYLE_GUIDE[profile.preferredStyle];
    if (styleGuide) {
      profileContext.push(styleGuide);
    }
  }

  // Include research field context for better targeted responses
  if (profile.researchField) {
    profileContext.push(
      `The user's primary research field is ${profile.researchField}. When relevant, relate concepts to this field and use examples from this domain.`
    );
  }

  // Use interests for broader questions or when making connections
  if (profile.interests && profile.interests.length > 0) {
    const isOpenEndedQuestion = question.length === 0 || (
      question.toLowerCase().includes('what do you think') ||
      question.toLowerCase().includes('how does this relate') ||
      question.toLowerCase().includes('can you explain') ||
      question.toLowerCase().includes('what are the implications') ||
      question.toLowerCase().includes('summarize') ||
      question.length < 50 // Short questions are often broad
    );

    if (isOpenEndedQuestion) {
      profileContext.push(
        `The user is interested in: ${profile.interests.join(', ')}. When appropriate, draw connections to these topics or use examples from these areas.`
      );
    }
  }

  // Include current projects for methodology or application questions
  if (profile.currentProjects && question.length > 0) {
    const isMethodologyOrApplicationQuestion = 
      question.toLowerCase().includes('method') ||
      question.toLowerCase().includes('approach') ||
      question.toLowerCase().includes('apply') ||
      question.toLowerCase().includes('implement') ||
      question.toLowerCase().includes('use this') ||
      question.toLowerCase().includes('how can');

    if (isMethodologyOrApplicationQuestion) {
      profileContext.push(
        `The user is currently working on: ${profile.currentProjects}. If relevant, suggest how concepts might apply to their work.`
      );
    }
  }

  // Add bio context for very personalized responses if provided
  if (profile.bio) {
    profileContext.push(
      `Additional user context: ${profile.bio}`
    );
  }

  // If we have profile context, add it to the prompt
  if (profileContext.length > 0) {
    prompt += `

--- USER CONTEXT ---
${profileContext.join('\n\n')}

Adapt your response to this user's background and preferences while maintaining accuracy and helpfulness.`;
  }

  // Add language instruction - this should be at the end for emphasis
  if (profile.preferredLanguage && profile.preferredLanguage.toLowerCase() !== 'english') {
    prompt += `

--- LANGUAGE REQUIREMENT ---
IMPORTANT: You MUST respond entirely in ${profile.preferredLanguage}. All explanations, summaries, descriptions, and text must be written in ${profile.preferredLanguage}. Do not use English unless specifically quoting from the paper.`;
  }

  return prompt;
}

@injectable()
export class RagService {
  // Use cl100k_base encoding (used by GPT-4, GPT-3.5-turbo, text-embedding-ada-002)
  private encoding: Tiktoken;

  constructor() {
    this.encoding = get_encoding('cl100k_base');
  }

  /**
   * Check token limit and throw if exceeded
   */
  private async checkTokenLimit(userId: string, estimatedTokens: number): Promise<void> {
    const { allowed, info } = await tokenService.canUseTokens(userId, estimatedTokens);
    
    if (!allowed) {
      throw new TokenLimitExceededError(
        'You have reached your token limit. Please request an extension to continue using the AI features.',
        info
      );
    }
  }

  /**
   * Accurately count tokens using tiktoken
   */
  private countTokens(text: string): number {
    return this.encoding.encode(text).length;
  }

  /**
   * Count tokens for a chat message array
   * Accounts for message structure overhead
   */
  private countMessagesTokens(messages: Array<{ role: string; content: string }>): number {
    let tokenCount = 0;
    
    for (const message of messages) {
      // Each message has overhead tokens
      tokenCount += 4; // Every message has <|start|>, role, <|sep|>, content overhead
      tokenCount += this.countTokens(message.content);
      tokenCount += this.countTokens(message.role);
    }
    
    tokenCount += 2; // Priming tokens for assistant response
    
    return tokenCount;
  }

  /**
   * Estimate total tokens for a request including expected response
   */
  private estimateTokens(text: string, maxResponseTokens: number): number {
    const inputTokens = this.countTokens(text);
    // Add a small buffer (10%) for response variance
    const responseBuffer = Math.ceil(maxResponseTokens * 0.1);
    return inputTokens + maxResponseTokens + responseBuffer;
  }

  /**
   * Estimate tokens for messages plus expected response
   */
  private estimateMessagesTokens(
    messages: Array<{ role: string; content: string }>,
    maxResponseTokens: number
  ): number {
    const inputTokens = this.countMessagesTokens(messages);
    const responseBuffer = Math.ceil(maxResponseTokens * 0.1);
    return inputTokens + maxResponseTokens + responseBuffer;
  }

  async query(
    paperId: string,
    question: string,
    userProfile?: IUserProfile,
    userId?: string
  ): Promise<QueryResult> {
    // Get paper metadata first
    const paper = await Paper.findById(paperId)
      .select('title authors abstract rawText')
      .lean();

    if (!paper) {
      return {
        answer: "I couldn't find the paper. It may have been deleted.",
        sources: [],
      };
    }

    // Generate embedding for the question
    const queryEmbedding = await embeddingService.generateEmbedding(question);
    
    // Search for relevant chunks
    const searchResults = await vectorService.searchByPaperId(
      queryEmbedding,
      paperId,
      5
    );

    // Build sources from search results
    const sources = searchResults.map(r => ({
      chunkId: r.id,
      content: r.payload.content as string,
      score: r.score,
      sectionTitle: r.payload.sectionTitle as string | undefined,
    }));

    // Build context - use chunks if available, otherwise fall back to abstract/raw text
    let context: string;
    let contextSource: string;

    if (searchResults.length > 0) {
      context = sources
        .map((s, i) => `[${i + 1}] ${s.sectionTitle ? `(${s.sectionTitle}) ` : ''}${s.content}`)
        .join('\n\n');
      contextSource = 'relevant sections';
    } else {
      // Fallback: use abstract and beginning of raw text
      const fallbackText = [
        paper.abstract ? `Abstract: ${paper.abstract}` : '',
        paper.rawText ? `Content excerpt: ${paper.rawText.slice(0, 2000)}` : '',
      ].filter(Boolean).join('\n\n');
      
      context = fallbackText || 'No content available for this paper.';
      contextSource = 'paper abstract and summary';
    }

    const userPrompt = `Paper: "${paper.title || 'Unknown'}"
Authors: ${paper.authors?.join(', ') || 'Unknown'}

Context from ${contextSource}:
${context}

Question: ${question}

Please provide a comprehensive answer based on the context above.`;

    // Build personalized system prompt
    const systemPrompt = buildSystemPrompt(userProfile, question);

    // Determine provider and token limit from user profile
    const provider = userProfile?.preferredModel || env.DEFAULT_LLM_PROVIDER;
    const maxTokens = userProfile?.tokenLimit || env.DEFAULT_TOKEN_LIMIT;

    // Build messages for accurate token counting
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // Check token limit if userId is provided (using accurate token counting)
    const estimatedTokens = this.estimateMessagesTokens(messages, maxTokens);
    if (userId) {
      await this.checkTokenLimit(userId, estimatedTokens);
    }

    // Generate response using the user's preferred model
    const answer = await llmService.chat(provider, {
      messages,
      temperature: 0.3,
      maxTokens,
    });

    // Record actual token usage if userId is provided
    if (userId && answer) {
      const inputTokens = this.countMessagesTokens(messages);
      const outputTokens = this.countTokens(answer);
      await tokenService.recordUsage(userId, inputTokens + outputTokens);
    }

    return { answer: answer || 'Unable to generate response.', sources };
  }

  async queryStream(
    paperId: string,
    question: string,
    callbacks: StreamCallbacks,
    userProfile?: IUserProfile,
    userId?: string
  ): Promise<void> {
    try {
      // Get paper metadata first
      const paper = await Paper.findById(paperId)
        .select('title authors abstract rawText')
        .lean();

      if (!paper) {
        callbacks.onComplete({
          answer: "I couldn't find the paper. It may have been deleted.",
          sources: [],
        });
        return;
      }

      // Generate embedding for the question
      const queryEmbedding = await embeddingService.generateEmbedding(question);
      
      // Search for relevant chunks
      const searchResults = await vectorService.searchByPaperId(
        queryEmbedding,
        paperId,
        5
      );

      const sources = searchResults.map(r => ({
        chunkId: r.id,
        content: r.payload.content as string,
        score: r.score,
        sectionTitle: r.payload.sectionTitle as string | undefined,
      }));

      // Build context - use chunks if available, otherwise fall back to abstract/raw text
      let context: string;
      let contextSource: string;

      if (searchResults.length > 0) {
        context = sources
          .map((s, i) => `[${i + 1}] ${s.sectionTitle ? `(${s.sectionTitle}) ` : ''}${s.content}`)
          .join('\n\n');
        contextSource = 'relevant sections';
      } else {
        // Fallback: use abstract and beginning of raw text
        const fallbackText = [
          paper.abstract ? `Abstract: ${paper.abstract}` : '',
          paper.rawText ? `Content excerpt: ${paper.rawText.slice(0, 2000)}` : '',
        ].filter(Boolean).join('\n\n');
        
        context = fallbackText || 'No content available for this paper.';
        contextSource = 'paper abstract and summary';
      }

      const userPrompt = `Paper: "${paper.title || 'Unknown'}"
Authors: ${paper.authors?.join(', ') || 'Unknown'}

Context from ${contextSource}:
${context}

Question: ${question}

Please provide a comprehensive answer based on the context above.`;

      // Build personalized system prompt
      const systemPrompt = buildSystemPrompt(userProfile, question);

      // Determine provider and token limit from user profile
      const provider = userProfile?.preferredModel || env.DEFAULT_LLM_PROVIDER;
      const maxTokens = userProfile?.tokenLimit || env.DEFAULT_TOKEN_LIMIT;

      // Build messages for accurate token counting
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ];

      // Check token limit if userId is provided (using accurate token counting)
      const estimatedTokens = this.estimateMessagesTokens(messages, maxTokens);
      if (userId) {
        await this.checkTokenLimit(userId, estimatedTokens);
      }

      // Store input tokens for later usage calculation
      const inputTokens = this.countMessagesTokens(messages);

      // Stream response using the user's preferred model
      await llmService.chatStream(
        provider,
        {
          messages,
          temperature: 0.3,
          maxTokens,
        },
        {
          onToken: callbacks.onToken,
          onComplete: async (fullAnswer) => {
            // Record actual token usage if userId is provided
            if (userId) {
              const outputTokens = this.countTokens(fullAnswer);
              await tokenService.recordUsage(userId, inputTokens + outputTokens);
            }
            callbacks.onComplete({ answer: fullAnswer, sources });
          },
          onError: callbacks.onError,
        }
      );
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async getAnalysis(paperId: string, userProfile?: IUserProfile, forceRegenerate = false, userId?: string): Promise<AnalysisResult> {
    // First, check if we have cached analysis
    const paper = await Paper.findById(paperId)
      .select('title authors abstract sections rawText analysis')
      .lean();

    if (!paper) {
      throw new Error('Paper not found');
    }

    // Return cached analysis if available and not forcing regeneration
    if (paper.analysis?.summary && !forceRegenerate) {
      console.log(`📦 Returning cached analysis for paper ${paperId}`);
      return {
        summary: paper.analysis.summary,
        keyInsights: paper.analysis.keyInsights,
        methodology: paper.analysis.methodology,
        limitations: paper.analysis.limitations,
        cached: true,
      };
    }

    console.log(`🔄 Generating new analysis for paper ${paperId}`);

    // Get relevant chunks for analysis
    const chunks = await Chunk.find({ paperId })
      .sort({ position: 1 })
      .limit(20)
      .lean();

    // Use chunks if available, otherwise use raw text
    const content = chunks.length > 0 
      ? chunks.map(c => c.content).join('\n\n')
      : paper.rawText?.slice(0, 8000) || '';

    // Build language instruction if user has a preferred language
    const languageInstruction = userProfile?.preferredLanguage && userProfile.preferredLanguage.toLowerCase() !== 'english'
      ? `\n\nIMPORTANT: Write ALL your response (summary, insights, methodology, limitations) in ${userProfile.preferredLanguage}. Do not use English.`
      : '';

    const prompt = `Analyze the following research paper content and extract:

Paper Title: ${paper.title}
Authors: ${paper.authors?.join(', ')}
Abstract: ${paper.abstract}

Content:
${content}

Please provide:
1. A concise summary (2-3 paragraphs)
2. Key insights (3-5 bullet points)
3. Methodology overview (if identifiable)
4. Limitations mentioned (if any)

Format your response as JSON with keys: summary, keyInsights (array), methodology, limitations${languageInstruction}`;

    // Determine provider and token limit from user profile
    const provider = userProfile?.preferredModel || env.DEFAULT_LLM_PROVIDER;
    const maxTokens = userProfile?.tokenLimit || env.DEFAULT_TOKEN_LIMIT;

    // Build messages for accurate token counting
    const messages = [{ role: 'user' as const, content: prompt }];

    // Check token limit if userId is provided (using accurate token counting)
    const estimatedTokens = this.estimateMessagesTokens(messages, maxTokens);
    if (userId) {
      await this.checkTokenLimit(userId, estimatedTokens);
    }

    const response = await llmService.chat(provider, {
      messages,
      temperature: 0.3,
      maxTokens,
    });
    
    if (!response) {
      throw new Error('Failed to generate analysis');
    }

    // Record actual token usage if userId is provided
    if (userId) {
      const inputTokens = this.countMessagesTokens(messages);
      const outputTokens = this.countTokens(response);
      await tokenService.recordUsage(userId, inputTokens + outputTokens);
    }

    let analysis: {
      summary: string;
      keyInsights: string[];
      methodology?: string;
      limitations?: string;
    };

    try {
      analysis = JSON.parse(extractJsonFromResponse(response));
    } catch (parseError) {
      console.error('❌ Failed to parse analysis JSON response:', response.substring(0, 200));
      // Return a fallback analysis when JSON parsing fails
      analysis = {
        summary: 'Analysis could not be fully parsed. The AI response was not in the expected format. Please try regenerating the analysis.',
        keyInsights: ['Unable to extract key insights due to parsing error'],
        methodology: 'Unable to determine',
        limitations: 'Unable to determine',
      };
    }

    // Save the analysis to the paper document
    await Paper.findByIdAndUpdate(paperId, {
      analysis: {
        summary: analysis.summary,
        keyInsights: analysis.keyInsights,
        methodology: analysis.methodology,
        limitations: analysis.limitations,
        generatedAt: new Date(),
      },
    });

    console.log(`✅ Analysis saved for paper ${paperId}`);

    return {
      ...analysis,
      cached: false,
    };
  }

  // Method to regenerate analysis (useful if user wants fresh insights)
  async regenerateAnalysis(paperId: string, userProfile?: IUserProfile, userId?: string): Promise<AnalysisResult> {
    return this.getAnalysis(paperId, userProfile, true, userId);
  }

  /**
   * Generate visual diagrams for a paper using Mermaid
   */
  async getVisuals(paperId: string, userProfile?: IUserProfile, forceRegenerate = false, userId?: string): Promise<VisualsResult> {
    // First, check if we have cached visuals
    const paper = await Paper.findById(paperId)
      .select('title authors abstract sections rawText visuals')
      .lean();

    if (!paper) {
      throw new Error('Paper not found');
    }

    // Return cached visuals if available and not forcing regeneration
    if (paper.visuals?.diagrams && paper.visuals.diagrams.length > 0 && !forceRegenerate) {
      console.log(`📦 Returning cached visuals for paper ${paperId}`);
      return {
        diagrams: paper.visuals.diagrams,
        cached: true,
      };
    }

    console.log(`🎨 Generating new visuals for paper ${paperId}`);

    // Get relevant chunks for visual generation
    const chunks = await Chunk.find({ paperId })
      .sort({ position: 1 })
      .limit(15)
      .lean();

    // Use chunks if available, otherwise use raw text
    const content = chunks.length > 0 
      ? chunks.map(c => c.content).join('\n\n')
      : paper.rawText?.slice(0, 6000) || '';

    // Build sections summary for context
    const sectionsContext = paper.sections?.length 
      ? paper.sections.map(s => `${s.title}: ${s.content.slice(0, 200)}...`).join('\n')
      : '';

    // Build language instruction for diagram text
    const preferredLang = userProfile?.preferredLanguage?.trim();
    const useNonEnglish = preferredLang && preferredLang.toLowerCase() !== 'english' && preferredLang.toLowerCase() !== 'en';
    const languageInstruction = useNonEnglish
      ? `\n\nIMPORTANT LANGUAGE REQUIREMENT: 
- Write the "title" and "description" fields in ${preferredLang}
- ALL text labels in the Mermaid diagram code (node labels, edge labels, etc.) MUST be in ${preferredLang}
- Only use English for node IDs (e.g., "dataCollection", "step1") to ensure valid Mermaid syntax
- Example for French: flowchart TD\n    dataCollection["Collecte de données"] --> preprocessing["Prétraitement"]\n    preprocessing --> modelTraining["Entraînement du modèle"]
- Make sure all user-facing text in the diagram is in ${preferredLang}, not English`
      : '';

    const prompt = `Analyze the following research paper and create 2-3 Mermaid diagrams that best visualize its key concepts.

Paper Title: ${paper.title}
Authors: ${paper.authors?.join(', ')}
Abstract: ${paper.abstract}

${sectionsContext ? `Sections:\n${sectionsContext}\n` : ''}

Content:
${content}

Based on the paper content, determine the most appropriate diagram types and create them.

RULES FOR DIAGRAM SELECTION:
- If the paper describes a methodology or process: Create a FLOWCHART showing the steps
- If the paper has multiple key concepts or topics: Create a MINDMAP showing relationships
- If there's a timeline or sequence of events: Create a SEQUENCE DIAGRAM
- If describing a system architecture or data model: Create a CLASS DIAGRAM or ER DIAGRAM

CRITICAL MERMAID SYNTAX RULES (YOU MUST FOLLOW):
1. Do NOT use spaces in node IDs - use camelCase or underscores (e.g., dataCollection, data_collection)
2. Do NOT use HTML tags like <br/> - they will break the diagram
3. Wrap labels with special characters in double quotes: A["Step 1: Initialize"]
4. For edge labels with parentheses, use quotes: A -->|"O(n) complexity"| B
5. Escape brackets in labels: A["Array[0]"] not A[Array[0]]
6. Avoid reserved keywords as node IDs: end, subgraph, graph
7. For mindmap, each level must have proper indentation with spaces (2 or 4 spaces per level)
8. Keep node labels concise (max 40 chars) for readability

Example valid syntax:
flowchart TD
    A[Data Collection] --> B[Preprocessing]
    B --> C["Model Training (Phase 1)"]
    
mindmap
    root((Main Topic))
        Concept1
            SubConceptA
            SubConceptB
        Concept2
            Finding1

Return a JSON object with this exact structure:
{
  "diagrams": [
    {
      "type": "flowchart" | "mindmap" | "sequenceDiagram" | "classDiagram" | "erDiagram",
      "title": "Descriptive title for this diagram",
      "description": "Brief explanation of what this diagram shows",
      "code": "Valid Mermaid syntax code"
    }
  ]
}

Generate 2-3 diagrams that provide different perspectives on the paper's content.${languageInstruction}`;

    // Determine provider and token limit from user profile
    const provider = userProfile?.preferredModel || env.DEFAULT_LLM_PROVIDER;
    const maxTokens = Math.max(userProfile?.tokenLimit || env.DEFAULT_TOKEN_LIMIT, 3000); // Need more tokens for diagrams

    // Build messages for accurate token counting
    const visualMessages = [{ role: 'user' as const, content: prompt }];

    // Check token limit if userId is provided (using accurate token counting)
    const estimatedTokens = this.estimateMessagesTokens(visualMessages, maxTokens);
    if (userId) {
      await this.checkTokenLimit(userId, estimatedTokens);
    }

    const response = await llmService.chat(provider, {
      messages: visualMessages,
      temperature: 0.4,
      maxTokens,
    });
    
    if (!response) {
      throw new Error('Failed to generate visuals');
    }

    // Record actual token usage if userId is provided
    if (userId) {
      const inputTokens = this.countMessagesTokens(visualMessages);
      const outputTokens = this.countTokens(response);
      await tokenService.recordUsage(userId, inputTokens + outputTokens);
    }

    let parsed: {
      diagrams: Array<{
        type: string;
        title: string;
        description: string;
        code: string;
      }>;
    };

    try {
      parsed = JSON.parse(extractJsonFromResponse(response));
    } catch (parseError) {
      console.error('❌ Failed to parse visuals JSON response:', response.substring(0, 200));
      // Return a fallback when JSON parsing fails
      const fallbackDiagrams: IMermaidDiagram[] = [{
        type: 'flowchart' as MermaidDiagramType,
        title: 'Visuals Unavailable',
        description: 'The AI response could not be parsed. Please try regenerating the visuals.',
        code: 'flowchart TD\n  A[Error] --> B[Please regenerate]',
      }];
      
      return {
        diagrams: fallbackDiagrams,
        cached: false,
      };
    }

    // Validate and clean diagrams
    const diagrams: IMermaidDiagram[] = parsed.diagrams.map(d => ({
      type: this.validateDiagramType(d.type),
      title: d.title,
      description: d.description,
      code: this.cleanMermaidCode(d.code),
    }));

    // Save the visuals to the paper document
    await Paper.findByIdAndUpdate(paperId, {
      visuals: {
        diagrams,
        generatedAt: new Date(),
      },
    });

    console.log(`✅ Visuals saved for paper ${paperId} (${diagrams.length} diagrams)`);

    return {
      diagrams,
      cached: false,
    };
  }

  /**
   * Validate diagram type
   */
  private validateDiagramType(type: string): MermaidDiagramType {
    const validTypes: MermaidDiagramType[] = ['flowchart', 'mindmap', 'sequenceDiagram', 'classDiagram', 'erDiagram'];
    const normalizedType = type.toLowerCase().replace(/[^a-z]/g, '');
    
    if (normalizedType.includes('flow')) return 'flowchart';
    if (normalizedType.includes('mind')) return 'mindmap';
    if (normalizedType.includes('sequence')) return 'sequenceDiagram';
    if (normalizedType.includes('class')) return 'classDiagram';
    if (normalizedType.includes('er') || normalizedType.includes('entity')) return 'erDiagram';
    
    return validTypes.includes(type as MermaidDiagramType) ? (type as MermaidDiagramType) : 'flowchart';
  }

  /**
   * Clean Mermaid code to fix common issues
   */
  private cleanMermaidCode(code: string): string {
    // Remove markdown code fences if present
    let cleaned = code
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Fix common issues
    cleaned = cleaned
      // Remove HTML tags
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      // Fix escaped quotes
      .replace(/\\"/g, '"')
      // Remove consecutive newlines
      .replace(/\n{3,}/g, '\n\n');

    return cleaned;
  }

  /**
   * Regenerate visuals (useful if user wants fresh diagrams)
   */
  async regenerateVisuals(paperId: string, userProfile?: IUserProfile, userId?: string): Promise<VisualsResult> {
    return this.getVisuals(paperId, userProfile, true, userId);
  }

  /**
   * Generate personalized implementation ideas based on paper content and user profile
   */
  async getIdeas(
    paperId: string, 
    userProfile?: IUserProfile, 
    forceRegenerate = false,
    userId?: string
  ): Promise<IdeasResult> {
    // First, check if we have cached ideas that match the current user context
    const paper = await Paper.findById(paperId)
      .select('title authors abstract sections rawText ideas')
      .lean();

    if (!paper) {
      throw new Error('Paper not found');
    }

    // Extract current user context
    const currentUserContext = {
      researchField: userProfile?.researchField,
      interests: userProfile?.interests,
      currentProjects: userProfile?.currentProjects,
    };

    // Check if cached ideas are valid (same user context)
    if (paper.ideas?.ideas && paper.ideas.ideas.length > 0 && !forceRegenerate) {
      const cachedContext = paper.ideas.userContext;
      const contextMatches = 
        cachedContext?.researchField === currentUserContext.researchField &&
        JSON.stringify(cachedContext?.interests || []) === JSON.stringify(currentUserContext.interests || []) &&
        cachedContext?.currentProjects === currentUserContext.currentProjects;

      if (contextMatches) {
        console.log(`📦 Returning cached ideas for paper ${paperId}`);
        return {
          ideas: paper.ideas.ideas,
          userContext: currentUserContext,
          cached: true,
        };
      }
    }

    console.log(`💡 Generating new implementation ideas for paper ${paperId}`);

    // Get relevant chunks for idea generation
    const chunks = await Chunk.find({ paperId })
      .sort({ position: 1 })
      .limit(15)
      .lean();

    // Use chunks if available, otherwise use raw text
    const content = chunks.length > 0 
      ? chunks.map(c => c.content).join('\n\n')
      : paper.rawText?.slice(0, 6000) || '';

    // Build user context string
    const userContextStr = this.buildUserContextForIdeas(userProfile);

    const prompt = `You are an expert research consultant helping users find practical ways to implement research paper concepts in their own work.

PAPER INFORMATION:
Title: ${paper.title}
Authors: ${paper.authors?.join(', ')}
Abstract: ${paper.abstract}

PAPER CONTENT:
${content}

${userContextStr}

Based on the paper's content and the user's profile, generate 3-5 personalized implementation ideas. Each idea should:
1. Be directly applicable to the user's field/interests/projects
2. Leverage specific concepts, methods, or findings from the paper
3. Be actionable with clear steps
4. Include difficulty assessment

DIFFICULTY LEVELS:
- beginner: Can be done with basic knowledge, minimal resources
- intermediate: Requires some expertise, moderate effort
- advanced: Requires deep expertise, significant resources

Return a JSON object with this exact structure:
{
  "ideas": [
    {
      "title": "Short, catchy title for the idea",
      "description": "2-3 sentence description of what this idea involves and its potential impact",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "relevance": "1-2 sentences explaining why this is specifically relevant to the user's profile",
      "steps": ["Step 1 description", "Step 2 description", "..."],
      "tools": ["Tool/technology 1", "Tool/technology 2"],
      "relatedConcepts": ["Concept from paper 1", "Concept from paper 2"]
    }
  ]
}

${!userProfile || Object.keys(userProfile).length === 0 
  ? 'NOTE: No user profile provided. Generate general-purpose implementation ideas that would be valuable to most researchers.'
  : 'Make sure each idea is specifically tailored to the user\'s interests, field, and current projects.'}${
  userProfile?.preferredLanguage && userProfile.preferredLanguage.toLowerCase() !== 'english'
    ? `\n\nIMPORTANT LANGUAGE REQUIREMENT: Write ALL content (title, description, relevance, steps, tools) in ${userProfile.preferredLanguage}. Do not use English.`
    : ''
}`;

    // Determine provider and token limit from user profile
    const provider = userProfile?.preferredModel || env.DEFAULT_LLM_PROVIDER;
    const maxTokens = Math.max(userProfile?.tokenLimit || env.DEFAULT_TOKEN_LIMIT, 3000); // Need more tokens for ideas

    // Build messages for accurate token counting
    const ideasMessages = [{ role: 'user' as const, content: prompt }];

    // Check token limit if userId is provided (using accurate token counting)
    const estimatedTokens = this.estimateMessagesTokens(ideasMessages, maxTokens);
    if (userId) {
      await this.checkTokenLimit(userId, estimatedTokens);
    }

    const response = await llmService.chat(provider, {
      messages: ideasMessages,
      temperature: 0.5,
      maxTokens,
    });
    
    if (!response) {
      throw new Error('Failed to generate ideas');
    }

    // Record actual token usage if userId is provided
    if (userId) {
      const inputTokens = this.countMessagesTokens(ideasMessages);
      const outputTokens = this.countTokens(response);
      await tokenService.recordUsage(userId, inputTokens + outputTokens);
    }

    let parsed: {
      ideas: Array<{
        title: string;
        description: string;
        difficulty: string;
        relevance: string;
        steps: string[];
        tools?: string[];
        relatedConcepts?: string[];
      }>;
    };

    try {
      parsed = JSON.parse(extractJsonFromResponse(response));
    } catch (parseError) {
      console.error('❌ Failed to parse ideas JSON response:', response.substring(0, 200));
      // Return a fallback response when JSON parsing fails
      const fallbackIdeas: IImplementationIdea[] = [{
        title: 'Implementation Ideas Unavailable',
        description: 'The AI response could not be parsed. Please try regenerating the ideas.',
        difficulty: 'beginner',
        relevance: 'Unable to determine relevance due to parsing error.',
        steps: ['Click the regenerate button to try again'],
        tools: [],
        relatedConcepts: [],
      }];
      
      return {
        ideas: fallbackIdeas,
        userContext: currentUserContext,
        cached: false,
      };
    }

    // Validate and clean ideas
    const ideas: IImplementationIdea[] = parsed.ideas.map(idea => ({
      title: idea.title,
      description: idea.description,
      difficulty: this.validateDifficulty(idea.difficulty),
      relevance: idea.relevance,
      steps: idea.steps || [],
      tools: idea.tools || [],
      relatedConcepts: idea.relatedConcepts || [],
    }));

    // Save the ideas to the paper document with user context
    await Paper.findByIdAndUpdate(paperId, {
      ideas: {
        ideas,
        userContext: currentUserContext,
        generatedAt: new Date(),
      },
    });

    console.log(`✅ Ideas saved for paper ${paperId} (${ideas.length} ideas)`);

    return {
      ideas,
      userContext: currentUserContext,
      cached: false,
    };
  }

  /**
   * Build user context string for ideas generation
   */
  private buildUserContextForIdeas(profile?: IUserProfile): string {
    if (!profile || Object.keys(profile).length === 0) {
      return 'USER PROFILE: Not provided';
    }

    const parts: string[] = ['USER PROFILE:'];

    if (profile.researchField) {
      parts.push(`- Research Field: ${profile.researchField}`);
    }

    if (profile.expertiseLevel) {
      parts.push(`- Expertise Level: ${profile.expertiseLevel}`);
    }

    if (profile.interests && profile.interests.length > 0) {
      parts.push(`- Interests: ${profile.interests.join(', ')}`);
    }

    if (profile.currentProjects) {
      parts.push(`- Current Projects: ${profile.currentProjects}`);
    }

    if (profile.bio) {
      parts.push(`- Background: ${profile.bio}`);
    }

    return parts.join('\n');
  }

  /**
   * Validate difficulty level
   */
  private validateDifficulty(difficulty: string): 'beginner' | 'intermediate' | 'advanced' {
    const normalized = difficulty.toLowerCase();
    if (normalized.includes('begin') || normalized.includes('easy')) return 'beginner';
    if (normalized.includes('inter') || normalized.includes('medium')) return 'intermediate';
    if (normalized.includes('advanc') || normalized.includes('hard') || normalized.includes('expert')) return 'advanced';
    return 'intermediate';
  }

  /**
   * Regenerate ideas (useful if user wants fresh suggestions)
   */
  async regenerateIdeas(paperId: string, userProfile?: IUserProfile, userId?: string): Promise<IdeasResult> {
    return this.getIdeas(paperId, userProfile, true, userId);
  }

  /**
   * Translate abstract to user's preferred language
   */
  async translateAbstract(
    abstract: string,
    targetLanguage: string,
    userProfile?: IUserProfile,
    userId?: string
  ): Promise<string> {
    // Determine provider and token limit from user profile
    const provider = userProfile?.preferredModel === 'deepseek' ? 'deepseek' : 'openai';
    const maxTokens = userProfile?.tokenLimit || env.DEFAULT_TOKEN_LIMIT;

    const prompt = `Translate the following research paper abstract to ${targetLanguage}. 
Maintain the technical accuracy and preserve all scientific terminology. 
Do not add any explanations or additional text - only provide the translation.

Abstract to translate:
${abstract}

Translation in ${targetLanguage}:`;

    // Build messages for accurate token counting
    const messages = [{ role: 'user' as const, content: prompt }];

    // Check token limit if userId is provided (using accurate token counting)
    const estimatedTokens = this.estimateMessagesTokens(messages, maxTokens);
    if (userId) {
      await this.checkTokenLimit(userId, estimatedTokens);
    }

    const response = await llmService.chat(provider, {
      messages,
      temperature: 0.3,
      maxTokens,
    });

    if (!response) {
      throw new Error('Failed to translate abstract');
    }

    // Record actual token usage if userId is provided
    if (userId) {
      const inputTokens = this.countMessagesTokens(messages);
      const outputTokens = this.countTokens(response);
      await tokenService.recordUsage(userId, inputTokens + outputTokens);
    }

    // Extract translation from response
    const translatedText = response.trim();
    return translatedText;
  }
}

export const ragService = new RagService();
