import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PROMPTS } from './prompts/clean-user-message';

@Injectable()
export class LlmService {
  private gemini: GoogleGenAI;

  constructor() {}

  public async prepareUserMessage() {}
}
