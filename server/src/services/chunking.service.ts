import 'reflect-metadata';
import { injectable } from 'inversify';
import { get_encoding } from 'tiktoken';

interface ChunkResult {
  content: string;
  type: 'section' | 'paragraph' | 'sentence';
  sectionTitle?: string;
  tokenCount: number;
  metadata: {
    startIndex: number;
    endIndex: number;
  };
}

interface Section {
  title: string;
  content: string;
  position: number;
}

@injectable()
export class ChunkingService {
  private encoding = get_encoding('cl100k_base');
  private readonly maxChunkSize = 512; // tokens
  private readonly chunkOverlap = 50; // tokens

  countTokens(text: string): number {
    return this.encoding.encode(text).length;
  }

  async createHierarchicalChunks(
    fullText: string,
    sections: Section[]
  ): Promise<ChunkResult[]> {
    const chunks: ChunkResult[] = [];
    
    // If we have sections, chunk by section first
    if (sections.length > 0) {
      for (const section of sections) {
        const sectionChunks = this.chunkSection(section);
        chunks.push(...sectionChunks);
      }
    } else {
      // Fall back to paragraph-based chunking
      const paragraphChunks = this.chunkByParagraphs(fullText);
      chunks.push(...paragraphChunks);
    }
    
    return chunks;
  }

  private chunkSection(section: Section): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentTokens = 0;
    let startIndex = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);
      
      // If single paragraph exceeds max size, split it further
      if (paragraphTokens > this.maxChunkSize) {
        // Save current chunk if not empty
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            type: 'paragraph',
            sectionTitle: section.title,
            tokenCount: currentTokens,
            metadata: {
              startIndex,
              endIndex: startIndex + currentChunk.length,
            },
          });
        }
        
        // Split large paragraph into sentences
        const sentenceChunks = this.chunkBySentences(paragraph, section.title);
        chunks.push(...sentenceChunks);
        
        currentChunk = '';
        currentTokens = 0;
        startIndex += paragraph.length;
        continue;
      }
      
      // Check if adding this paragraph would exceed limit
      if (currentTokens + paragraphTokens > this.maxChunkSize) {
        // Save current chunk
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            type: 'paragraph',
            sectionTitle: section.title,
            tokenCount: currentTokens,
            metadata: {
              startIndex,
              endIndex: startIndex + currentChunk.length,
            },
          });
        }
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + paragraph + '\n\n';
        currentTokens = this.countTokens(currentChunk);
        startIndex += currentChunk.length - overlapText.length;
      } else {
        currentChunk += paragraph + '\n\n';
        currentTokens += paragraphTokens;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        type: 'paragraph',
        sectionTitle: section.title,
        tokenCount: currentTokens,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
        },
      });
    }
    
    return chunks;
  }

  private chunkBySentences(text: string, sectionTitle?: string): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    // Split by sentence-ending punctuation
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let currentTokens = 0;
    let startIndex = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      if (currentTokens + sentenceTokens > this.maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            type: 'sentence',
            sectionTitle,
            tokenCount: currentTokens,
            metadata: {
              startIndex,
              endIndex: startIndex + currentChunk.length,
            },
          });
        }
        
        currentChunk = sentence;
        currentTokens = sentenceTokens;
        startIndex += currentChunk.length;
      } else {
        currentChunk += sentence;
        currentTokens += sentenceTokens;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        type: 'sentence',
        sectionTitle,
        tokenCount: currentTokens,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
        },
      });
    }
    
    return chunks;
  }

  private chunkByParagraphs(text: string): ChunkResult[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks: ChunkResult[] = [];
    
    let currentChunk = '';
    let currentTokens = 0;
    let startIndex = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);
      
      if (currentTokens + paragraphTokens > this.maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            type: 'paragraph',
            tokenCount: currentTokens,
            metadata: {
              startIndex,
              endIndex: startIndex + currentChunk.length,
            },
          });
        }
        
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + paragraph + '\n\n';
        currentTokens = this.countTokens(currentChunk);
        startIndex += currentChunk.length - overlapText.length;
      } else {
        currentChunk += paragraph + '\n\n';
        currentTokens += paragraphTokens;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        type: 'paragraph',
        tokenCount: currentTokens,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
        },
      });
    }
    
    return chunks;
  }

  private getOverlapText(text: string): string {
    if (!text.trim()) return '';
    
    const tokens = this.encoding.encode(text);
    if (tokens.length <= this.chunkOverlap) return text;
    
    const overlapTokens = tokens.slice(-this.chunkOverlap);
    return new TextDecoder().decode(this.encoding.decode(overlapTokens));
  }
}

export const chunkingService = new ChunkingService();





