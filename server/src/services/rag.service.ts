import OpenAI from 'openai';
import { env } from '../config/env.js';
import { embeddingService } from './embedding.service.js';
import { vectorService } from './vector.service.js';
import { Chunk } from '../models/chunk.model.js';
import { Paper } from '../models/paper.model.js';
import { IUserProfile } from '../models/user.model.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

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

  return prompt;
}

class RagService {
  async query(
    paperId: string,
    question: string,
    userProfile?: IUserProfile
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

    // Generate response using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = completion.choices[0]?.message?.content || 'Unable to generate response.';

    return { answer, sources };
  }

  async queryStream(
    paperId: string,
    question: string,
    callbacks: StreamCallbacks,
    userProfile?: IUserProfile
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

      // Stream response using GPT-4
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        stream: true,
      });

      let fullAnswer = '';

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullAnswer += token;
          callbacks.onToken(token);
        }
      }

      callbacks.onComplete({ answer: fullAnswer, sources });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async getAnalysis(paperId: string, forceRegenerate = false): Promise<AnalysisResult> {
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

Format your response as JSON with keys: summary, keyInsights (array), methodology, limitations`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('Failed to generate analysis');
    }

    const analysis = JSON.parse(response) as {
      summary: string;
      keyInsights: string[];
      methodology?: string;
      limitations?: string;
    };

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
  async regenerateAnalysis(paperId: string): Promise<AnalysisResult> {
    return this.getAnalysis(paperId, true);
  }
}

export const ragService = new RagService();
