import { Logger } from '@nestjs/common';

export interface JsonRepairResult {
  success: boolean;
  data: unknown;
  method: string;
  originalLength: number;
  repairedLength?: number;
}

/**
 * Comprehensive JSON repair utility for handling malformed LLM responses.
 * Implements multiple strategies to extract and repair JSON from raw text.
 */
export class JsonRepairUtil {
  private static readonly logger = new Logger('JsonRepairUtil');

  /**
   * Main repair function - tries all strategies in order
   */
  static repair(rawResponse: string): JsonRepairResult {
    if (!rawResponse || typeof rawResponse !== 'string') {
      return { success: false, data: null, method: 'invalid_input', originalLength: 0 };
    }

    const originalLength = rawResponse.length;
    const trimmed = rawResponse.trim();

    // Debug: Preview first 500 chars
    this.logger.debug(`Raw response preview (first 500 chars): ${trimmed.substring(0, 500)}`);

    const strategies: Array<{ name: string; fn: (text: string) => unknown }> = [
      { name: 'direct_parse', fn: this.tryDirectParse.bind(this) },
      { name: 'remove_markdown', fn: this.removeMarkdownWrapper.bind(this) },
      { name: 'extract_json_block', fn: this.extractJsonBlock.bind(this) },
      { name: 'fix_trailing_comma', fn: this.fixTrailingCommas.bind(this) },
      { name: 'fix_unclosed_brackets', fn: this.fixUnclosedBrackets.bind(this) },
      { name: 'fix_escape_chars', fn: this.fixEscapeCharacters.bind(this) },
      { name: 'aggressive_extract', fn: this.aggressiveJsonExtract.bind(this) },
      { name: 'combined_repair', fn: this.combinedRepair.bind(this) },
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy.fn(trimmed);
        if (result !== null && result !== undefined) {
          this.logger.log(`JSON repair successful using strategy: ${strategy.name}`);
          return {
            success: true,
            data: result,
            method: strategy.name,
            originalLength,
            repairedLength: JSON.stringify(result).length,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.debug(`Strategy ${strategy.name} failed: ${message}`);
        continue;
      }
    }

    // All strategies failed
    this.logger.error(`All JSON repair strategies failed. Raw response length: ${originalLength}`);
    this.logger.error(`Raw response (full): ${rawResponse}`);

    return { success: false, data: null, method: 'all_failed', originalLength };
  }

  /**
   * Strategy 1: Direct parse
   */
  private static tryDirectParse(text: string): unknown {
    return JSON.parse(text);
  }

  /**
   * Strategy 2: Remove markdown wrapper
   * Handles ```json ... ``` or ``` ... ``` format
   */
  private static removeMarkdownWrapper(text: string): unknown {
    let cleaned = text;

    // Try various markdown patterns
    const patterns = [
      /^```json\s*\n?([\s\S]*?)\n?```$/i,
      /^```\s*\n?([\s\S]*?)\n?```$/i,
      /^`([\s\S]*?)`$/,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        cleaned = match[1].trim();
        break;
      }
    }

    // Remove leading/trailing backticks
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    if (cleaned !== text) {
      return JSON.parse(cleaned);
    }

    return null;
  }

  /**
   * Strategy 3: Extract JSON block from text
   * Takes content between first { and last }
   */
  private static extractJsonBlock(text: string): unknown {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonStr);
  }

  /**
   * Strategy 4: Fix trailing commas
   * { "a": 1, } → { "a": 1 }
   */
  private static fixTrailingCommas(text: string): unknown {
    const fixed = text.replace(/,(\s*})/g, '$1').replace(/,(\s*\])/g, '$1');

    if (fixed !== text) {
      return JSON.parse(fixed);
    }

    return null;
  }

  /**
   * Strategy 5: Fix unclosed brackets
   * For truncated JSON responses
   */
  private static fixUnclosedBrackets(text: string): unknown {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (const char of text) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    if (openBraces === 0 && openBrackets === 0) {
      return null; // Already balanced, this strategy not needed
    }

    let fixed = text.trim();

    // Remove trailing comma if present
    fixed = fixed.replace(/,\s*$/, '');

    // Add missing closures
    while (openBrackets > 0) {
      fixed += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      fixed += '}';
      openBraces--;
    }

    return JSON.parse(fixed);
  }

  /**
   * Strategy 6: Fix escape characters
   */
  private static fixEscapeCharacters(text: string): unknown {
    // Clean control characters (not allowed in JSON)
    const fixed = text.replace(/[\x00-\x1F\x7F]/g, (match) => {
      // Keep allowed ones: newline, carriage return, tab
      if (match === '\n' || match === '\r' || match === '\t') {
        return match;
      }
      return ' ';
    });

    if (fixed !== text) {
      return JSON.parse(fixed);
    }

    return null;
  }

  /**
   * Strategy 7: Aggressive JSON extract
   * Considers nested structures
   */
  private static aggressiveJsonExtract(text: string): unknown {
    // Find first {
    const startIndex = text.indexOf('{');
    if (startIndex === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex > startIndex) {
      const jsonStr = text.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }

    return null;
  }

  /**
   * Strategy 8: Combined repair
   * Fixes multiple issues simultaneously
   */
  private static combinedRepair(text: string): unknown {
    let cleaned = text;

    // 1. Remove markdown
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    // 2. Extract JSON block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // 3. Fix trailing commas
    cleaned = cleaned.replace(/,(\s*})/g, '$1').replace(/,(\s*\])/g, '$1');

    // 4. Clean control characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (match) => {
      if (match === '\n' || match === '\r' || match === '\t') return match;
      return ' ';
    });

    // 5. Fix unclosed brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (const char of cleaned) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    cleaned = cleaned.replace(/,\s*$/, '');
    while (openBrackets > 0) {
      cleaned += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      cleaned += '}';
      openBraces--;
    }

    return JSON.parse(cleaned);
  }
}

