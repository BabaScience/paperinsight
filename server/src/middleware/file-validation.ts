import fileType from 'file-type';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { deflate as deflateCallback } from 'zlib';

const deflate = promisify(deflateCallback);

export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  checkCompressionRatio?: boolean;
  maxCompressionRatio?: number;
}

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
  fileHash?: string;
}

/**
 * Patterns that indicate potentially dangerous content in PDFs
 * These can be used for embedded scripts, auto-execution, etc.
 * 
 * Note: We focus on actual scripting threats, not general PDF features.
 * /OpenAction alone is safe (just sets initial view), only dangerous with JS.
 */
const DANGEROUS_PDF_PATTERNS = [
  /\/JavaScript/i,         // JavaScript action - definitely dangerous
  /\/JS\s/i,               // JS action shorthand
  /\/Launch/i,             // Launch external application
  /\/RichMedia/i,          // Rich media (Flash, etc.)
  /\/XFA/i,                // XFA forms (can contain scripts)
];

/**
 * Patterns that are suspicious but may be in legitimate PDFs
 * We log these but don't block
 */
const SUSPICIOUS_PDF_PATTERNS = [
  /\/AA\s/i,               // Additional Actions
  /\/EmbeddedFile/i,       // Embedded files
];

/**
 * PDF validation service for secure file upload handling
 */
class FileValidator {
  /**
   * Comprehensive PDF validation including:
   * - File size check
   * - Magic number validation (MIME type verification)
   * - PDF header verification
   * - Dangerous content pattern scanning
   * - Compression ratio check (PDF bomb detection)
   */
  async validatePDF(
    buffer: Buffer,
    options: FileValidationOptions
  ): Promise<FileValidationResult> {
    // 1. Check file size
    if (buffer.length > options.maxSize) {
      return { 
        valid: false, 
        reason: `File size (${Math.round(buffer.length / 1024 / 1024)}MB) exceeds maximum allowed (${Math.round(options.maxSize / 1024 / 1024)}MB)` 
      };
    }

    if (buffer.length === 0) {
      return { valid: false, reason: 'File is empty' };
    }

    // 2. Magic number validation (prevents MIME type spoofing)
    const type = await fileType.fromBuffer(buffer);
    if (!type || type.mime !== 'application/pdf') {
      return { 
        valid: false, 
        reason: `Invalid file type. Expected PDF but detected: ${type?.mime || 'unknown'}` 
      };
    }

    // 3. Check for PDF header (%PDF-)
    const pdfHeader = buffer.subarray(0, 8).toString('ascii');
    if (!pdfHeader.startsWith('%PDF-')) {
      return { valid: false, reason: 'Invalid PDF: Missing PDF header signature' };
    }

    // 4. Extract PDF version and validate it's reasonable
    const versionMatch = pdfHeader.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      const version = parseFloat(versionMatch[1]);
      if (version < 1.0 || version > 2.0) {
        return { valid: false, reason: `Unsupported PDF version: ${version}` };
      }
    }

    // 5. Scan for dangerous embedded content
    // Convert to string for pattern matching (handle binary safely)
    const pdfContent = buffer.toString('latin1');
    
    // Check for definitely dangerous patterns
    for (const pattern of DANGEROUS_PDF_PATTERNS) {
      if (pattern.test(pdfContent)) {
        console.warn(`🚨 PDF contains dangerous pattern: ${pattern.source}`);
        return { 
          valid: false, 
          reason: 'PDF contains potentially dangerous embedded content (JavaScript or external launches). Please upload a clean PDF.' 
        };
      }
    }

    // Log suspicious patterns but don't block (may be in legitimate PDFs)
    for (const pattern of SUSPICIOUS_PDF_PATTERNS) {
      if (pattern.test(pdfContent)) {
        console.warn(`⚠️ PDF contains suspicious pattern (allowed): ${pattern.source}`);
      }
    }

    // 6. Check for PDF bomb (decompression attack)
    if (options.checkCompressionRatio !== false) {
      const compressionRatio = await this.checkCompressionRatio(buffer);
      const maxRatio = options.maxCompressionRatio || 100;
      
      if (compressionRatio > maxRatio) {
        console.warn(`🚨 Suspicious compression ratio detected: ${compressionRatio.toFixed(2)}`);
        return { 
          valid: false, 
          reason: 'File has suspicious compression characteristics (potential PDF bomb)' 
        };
      }
    }

    // 7. Check for PDF trailer (%%EOF)
    const lastChunk = buffer.subarray(-1024).toString('ascii');
    if (!lastChunk.includes('%%EOF')) {
      // Some valid PDFs might not have this at the very end, so just warn
      console.warn('⚠️ PDF missing standard EOF marker');
    }

    // 8. Generate file hash for deduplication and tracking
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    return { 
      valid: true, 
      fileHash 
    };
  }

  /**
   * Check the compression ratio of a buffer
   * High ratios can indicate a decompression bomb
   */
  private async checkCompressionRatio(buffer: Buffer): Promise<number> {
    try {
      const compressed = await deflate(buffer);
      // Ratio of original to compressed
      // A very high ratio means the content expands a lot when decompressed
      return buffer.length / compressed.length;
    } catch {
      // If compression fails, return a safe ratio
      return 1;
    }
  }

  /**
   * Quick validation that only checks essential properties
   * Use for initial filtering before full validation
   */
  quickValidate(buffer: Buffer, maxSize: number): { valid: boolean; reason?: string } {
    if (buffer.length === 0) {
      return { valid: false, reason: 'File is empty' };
    }

    if (buffer.length > maxSize) {
      return { valid: false, reason: 'File too large' };
    }

    // Quick PDF header check
    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return { valid: false, reason: 'Not a PDF file' };
    }

    return { valid: true };
  }
}

export const fileValidator = new FileValidator();

