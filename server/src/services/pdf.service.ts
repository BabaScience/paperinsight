// @ts-expect-error - pdf-parse has no type definitions
import pdfParse from 'pdf-parse';

interface Section {
  title: string;
  content: string;
  position: number;
}

interface ParsedPdf {
  text: string;
  metadata: {
    title?: string;
    authors: string[];
    abstract?: string;
    pageCount: number;
  };
  sections: Section[];
}

// Common section headers in academic papers - more comprehensive patterns
const SECTION_PATTERNS = [
  /^(?:\d+\.?\s*)?(abstract)\s*$/i,
  /^(?:\d+\.?\s*)?(introduction)\s*$/i,
  /^(?:\d+\.?\s*)?(background|related\s+work|literature\s+review|prior\s+work)\s*$/i,
  /^(?:\d+\.?\s*)?(methodology|methods?|approach|proposed\s+method|our\s+approach|framework|model|system)\s*$/i,
  /^(?:\d+\.?\s*)?(experiments?|experimental\s+setup|experimental\s+results?|evaluation)\s*$/i,
  /^(?:\d+\.?\s*)?(results?|findings|analysis)\s*$/i,
  /^(?:\d+\.?\s*)?(discussion)\s*$/i,
  /^(?:\d+\.?\s*)?(conclusions?|summary|concluding\s+remarks)\s*$/i,
  /^(?:\d+\.?\s*)?(references|bibliography)\s*$/i,
  /^(?:\d+\.?\s*)?(appendix|appendices|supplementary)\s*$/i,
  /^(?:\d+\.?\s*)?(acknowledgements?)\s*$/i,
  // Numbered sections like "1. Introduction" or "2 Methods"
  /^\d+\.?\s+[A-Z][a-z]+/,
];

class PdfService {
  /**
   * Parse PDF from a buffer
   * @param buffer - PDF file buffer
   * @returns Parsed PDF data
   */
  async parsePdf(buffer: Buffer): Promise<ParsedPdf> {
    const pdfData = await pdfParse(buffer);
    
    // Keep raw text with line breaks for section extraction
    const rawText = pdfData.text;
    const sections = this.extractSections(rawText);
    const metadata = this.extractMetadata(rawText, pdfData);
    
    // Clean text for storage (single line format for embeddings)
    const cleanedText = this.cleanText(rawText);
    
    return {
      text: cleanedText,
      metadata: {
        ...metadata,
        pageCount: pdfData.numpages,
      },
      sections,
    };
  }

  private cleanText(text: string): string {
    return text
      // Normalize different types of whitespace to single spaces
      .replace(/[ \t]+/g, ' ')
      // Normalize multiple newlines to single newline
      .replace(/\n{3,}/g, '\n\n')
      // Remove page numbers (standalone numbers on their own line)
      .replace(/\n\s*\d{1,3}\s*\n/g, '\n')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .trim();
  }

  private extractSections(text: string): Section[] {
    const sections: Section[] = [];
    const lines = text.split(/\n+/);
    
    let currentSection: Section | null = null;
    let currentContent: string[] = [];
    let position = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this line is a section header
      const isHeader = this.isLikelySectionHeader(trimmedLine);
      
      if (isHeader) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join(' ').trim();
          // Only save sections with meaningful content
          if (currentSection.content.length > 30) {
            sections.push(currentSection);
          }
        }
        
        // Start new section
        currentSection = {
          title: this.normalizeTitle(trimmedLine),
          content: '',
          position: position++,
        };
        currentContent = [];
      } else if (currentSection) {
        // Add line to current section content
        currentContent.push(trimmedLine);
      } else {
        // Content before first section - could be title/abstract area
        // Create an implicit "Introduction" or "Preamble" section
        if (!currentSection && trimmedLine.length > 50) {
          currentSection = {
            title: 'Preamble',
            content: '',
            position: position++,
          };
          currentContent = [trimmedLine];
        }
      }
    }

    // Don't forget the last section
    if (currentSection) {
      currentSection.content = currentContent.join(' ').trim();
      if (currentSection.content.length > 30) {
        sections.push(currentSection);
      }
    }

    // If no sections were found, create a single section with all content
    if (sections.length === 0 && text.length > 100) {
      sections.push({
        title: 'Full Text',
        content: this.cleanText(text).slice(0, 5000), // Limit content size
        position: 0,
      });
    }

    return sections;
  }

  private isLikelySectionHeader(line: string): boolean {
    // Too long to be a header
    if (line.length > 80) return false;
    
    // Check against known patterns
    const matchesPattern = SECTION_PATTERNS.some(pattern => pattern.test(line));
    if (matchesPattern) return true;
    
    // Check for all caps headers (common in papers)
    if (line === line.toUpperCase() && line.length > 3 && line.length < 50 && /^[A-Z\s\d.]+$/.test(line)) {
      return true;
    }
    
    // Check for numbered headers like "1. ", "2.1 ", etc.
    if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(line) && line.length < 60) {
      return true;
    }
    
    return false;
  }

  private normalizeTitle(title: string): string {
    // Remove leading numbers and dots
    let normalized = title.replace(/^\d+(\.\d+)*\.?\s*/, '');
    
    // Capitalize first letter of each word if all caps
    if (normalized === normalized.toUpperCase()) {
      normalized = normalized
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return normalized.trim();
  }

  private extractMetadata(
    text: string,
    pdfData: { info?: { Title?: string; Author?: string } }
  ): { title?: string; authors: string[]; abstract?: string } {
    // Try to get title from PDF metadata first
    let title = pdfData.info?.Title;
    
    // If no metadata title, try to extract from text
    if (!title) {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      // Title is usually in the first few lines
      const potentialTitle = lines.slice(0, 5).find(line => {
        const trimmed = line.trim();
        return trimmed.length > 10 && 
               trimmed.length < 250 && 
               !trimmed.toLowerCase().includes('abstract') &&
               !trimmed.toLowerCase().includes('arxiv') &&
               !/^\d+$/.test(trimmed); // Not just a number
      });
      title = potentialTitle?.trim();
    }

    // Extract authors (usually after title, before abstract)
    const authors: string[] = [];
    if (pdfData.info?.Author) {
      authors.push(...pdfData.info.Author.split(/[,;]/).map(a => a.trim()).filter(Boolean));
    }

    // Extract abstract - try multiple patterns
    let abstract: string | undefined;
    
    // Pattern 1: "Abstract" followed by content until Introduction/Keywords
    const abstractMatch1 = text.match(/abstract[:\s]*\n?([\s\S]{100,3000}?)(?=\n\s*(?:introduction|keywords|1\.?\s|background|index\s+terms))/i);
    if (abstractMatch1) {
      abstract = abstractMatch1[1]?.trim().replace(/\s+/g, ' ');
    }
    
    // Pattern 2: Abstract section marker
    if (!abstract) {
      const abstractMatch2 = text.match(/(?:^|\n)abstract(?:\s*[-:])?\s*\n([\s\S]{100,3000}?)(?=\n\s*\n)/i);
      if (abstractMatch2) {
        abstract = abstractMatch2[1]?.trim().replace(/\s+/g, ' ');
      }
    }

    // Pattern 3: Text between "Abstract" and a double newline
    if (!abstract) {
      const abstractMatch3 = text.match(/abstract[:\s]*([\s\S]{50,2000}?)\n\s*\n/i);
      if (abstractMatch3) {
        abstract = abstractMatch3[1]?.trim().replace(/\s+/g, ' ');
      }
    }

    return { title, authors, abstract };
  }
}

export const pdfService = new PdfService();
