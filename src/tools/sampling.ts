/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';
import { CreateMessageResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { defineTool } from './tool.js';
import { defineToolSchema } from '../mcp/tool.js';

import type { Context } from '../context.js';
import type { Response } from '../response.js';

const samplingToolSchema = defineToolSchema({
  name: 'ai_generate_text',
  title: 'Generate text using AI',
  description: 'Generate text content using AI sampling through the MCP client',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt to send to the AI model'),
    maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
    temperature: z.number().optional().describe('Temperature for text generation (0.0 to 1.0)'),
  }),
  type: 'readOnly',
});

export const samplingTool = defineTool({
  capability: 'sampling',
  schema: samplingToolSchema,
  handle: async (context: Context, params: z.output<typeof samplingToolSchema.inputSchema>, response: Response) => {
    const server = context.getServer();
    if (!server) {
      response.addError('AI sampling not available - no server connection');
      return;
    }

    try {
      // Check if the client supports sampling
      const capabilities = server.getClientCapabilities();
      if (!capabilities?.sampling) {
        response.addError('AI sampling not supported by the client');
        return;
      }

      // Create the sampling request
      const samplingRequest = {
        method: 'sampling/createMessage' as const,
        params: {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: params.prompt,
              },
            },
          ],
          // Add optional parameters if provided
          ...(params.maxTokens && { maxTokens: params.maxTokens }),
          ...(params.temperature && { temperature: params.temperature }),
        },
      };

      // Send the sampling request
      const result = await server.request(samplingRequest, CreateMessageResultSchema);

      // Add the result to the response
      response.addResult(`AI Generated Text (Model: ${result.model}):\n\n${result.content.text}`);

      if (result.stopReason)
        response.addResult(`\nStop reason: ${result.stopReason}`);

    } catch (error) {
      response.addError(`AI sampling failed: ${String(error)}`);
    }
  },
});

// Example of a more advanced tool that uses sampling for analysis
const analyzeToolSchema = defineToolSchema({
  name: 'ai_analyze_content',
  title: 'Analyze content using AI',
  description: 'Analyze web page content or other text using AI sampling',
  inputSchema: z.object({
    content: z.string().describe('The content to analyze'),
    analysisType: z.enum(['summarize', 'sentiment', 'keywords', 'translation']).describe('Type of analysis to perform'),
    targetLanguage: z.string().optional().describe('Target language for translation (if analysisType is translation)'),
  }),
  type: 'readOnly',
});

export const analyzeTool = defineTool({
  capability: 'sampling',
  schema: analyzeToolSchema,
  handle: async (context: Context, params: z.output<typeof analyzeToolSchema.inputSchema>, response: Response) => {
    const server = context.getServer();
    if (!server) {
      response.addError('AI sampling not available - no server connection');
      return;
    }

    try {
      // Check if the client supports sampling
      const capabilities = server.getClientCapabilities();
      if (!capabilities?.sampling) {
        response.addError('AI sampling not supported by the client');
        return;
      }

      // Create different prompts based on analysis type
      let prompt: string;
      switch (params.analysisType) {
        case 'summarize':
          prompt = `Please provide a concise summary of the following content:\n\n${params.content}`;
          break;
        case 'sentiment':
          prompt = `Analyze the sentiment of the following content and provide a brief explanation:\n\n${params.content}`;
          break;
        case 'keywords':
          prompt = `Extract the key keywords and phrases from the following content:\n\n${params.content}`;
          break;
        case 'translation':
          const targetLang = params.targetLanguage || 'Spanish';
          prompt = `Translate the following content to ${targetLang}:\n\n${params.content}`;
          break;
        default:
          prompt = `Analyze the following content:\n\n${params.content}`;
      }

      // Create the sampling request
      const samplingRequest = {
        method: 'sampling/createMessage' as const,
        params: {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: prompt,
              },
            },
          ],
        },
      };

      // Send the sampling request
      const result = await server.request(samplingRequest, CreateMessageResultSchema);

      // Add the result to the response
      response.addResult(`AI Analysis (${params.analysisType}, Model: ${result.model}):\n\n${result.content.text}`);

      if (result.stopReason)
        response.addResult(`\nStop reason: ${result.stopReason}`);

    } catch (error) {
      response.addError(`AI analysis failed: ${String(error)}`);
    }
  },
});
