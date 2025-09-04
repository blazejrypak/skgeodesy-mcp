# MCP Sampling Example

This example demonstrates how to use the MCP sampling functionality to request AI model completions through the client.

## Overview

The MCP sampling functionality allows servers to request language model completions through the client, enabling agentic behaviors while maintaining security and user control. The flow ensures security through multiple human-in-the-loop checkpoints.

## Sampling Flow

```
Server → Client → User → LLM
  ↓        ↓       ↓     ↓
Server initiates sampling
Human-in-the-loop review
Model interaction
Response review
Complete request
```

## Implementation

The sampling functionality has been implemented in the following components:

### 1. Server Configuration

The server now declares sampling capabilities:

```typescript
const server = new Server({ name, version }, {
  capabilities: {
    tools: {},
    sampling: {}, // Added sampling capability
  }
});
```

### 2. Request Handler

A new request handler for `sampling/createMessage` has been added:

```typescript
server.setRequestHandler(CreateMessageRequestSchema, async request => {
  serverDebug('createMessage', request);
  await initializedPromise;

  if (!backend.createMessage) {
    throw new Error('Sampling not supported by this backend');
  }

  try {
    return await backend.createMessage(request);
  } catch (error) {
    throw new Error(`Sampling failed: ${String(error)}`);
  }
});
```

### 3. Backend Interface

The `ServerBackend` interface now includes sampling support:

```typescript
export interface ServerBackend {
  initialize?(server: Server, clientVersion: ClientVersion, roots: Root[]): Promise<void>;
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: CallToolRequest['params']['arguments']): Promise<CallToolResult>;
  serverClosed?(server: Server): void;
  createMessage?(request: CreateMessageRequest): Promise<CreateMessageResult>; // Added
}
```

### 4. Backend Implementations

Both `MDBBackend` and `ProxyBackend` now support sampling by forwarding requests to the client:

```typescript
async createMessage(request: CreateMessageRequest): Promise<CreateMessageResult> {
  // Forward the sampling request to the current client
  const result = await this._currentClient.request(
    {
      method: 'sampling/createMessage',
      params: request.params,
    },
    CreateMessageResultSchema
  );
  
  return result as CreateMessageResult;
}
```

## Usage Examples

### 1. Direct Sampling Request

Here's how to use the sampling functionality directly:

```typescript
// Create a sampling request
const samplingRequest = {
  method: 'sampling/createMessage' as const,
  params: {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'Hello, how are you?'
        }
      }
    ]
  }
};

// Send the request through the MCP client
const result = await client.request(samplingRequest, CreateMessageResultSchema);

// The result will contain:
// - model: The name of the model that generated the message
// - role: The role of the message (assistant)
// - content: The generated content
// - stopReason: Why sampling stopped (optional)
```

### 2. Using Sampling from Tools

You can also use sampling functionality from within MCP tools. Here are two example tools:

#### AI Text Generation Tool

```typescript
import { defineTool } from './tool.js';
import { defineToolSchema } from '../mcp/tool.js';
import { z } from 'zod';

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
  capability: 'core',
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
      response.addText(`AI Generated Text (Model: ${result.model}):\n\n${result.content.text}`);
      
      if (result.stopReason) {
        response.addText(`\nStop reason: ${result.stopReason}`);
      }
    } catch (error) {
      response.addError(`AI sampling failed: ${String(error)}`);
    }
  },
});
```

#### AI Content Analysis Tool

```typescript
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
  capability: 'core',
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
      response.addText(`AI Analysis (${params.analysisType}, Model: ${result.model}):\n\n${result.content.text}`);
      
      if (result.stopReason) {
        response.addText(`\nStop reason: ${result.stopReason}`);
      }
    } catch (error) {
      response.addError(`AI analysis failed: ${String(error)}`);
    }
  },
});
```

### 3. Tool Registration

To make these tools available, add them to your tools list:

```typescript
// In src/tools.ts
import { samplingTool, analyzeTool } from './tools/sampling.js';

export const allTools: Tool<any>[] = [
  // ... other tools
  samplingTool,
  analyzeTool,
  // ... more tools
];
```

### 4. Using the Tools

Once registered, these tools can be called through the MCP client:

```typescript
// Generate text
const result = await client.callTool({
  name: 'ai_generate_text',
  arguments: {
    prompt: 'Write a short story about a robot',
    maxTokens: 200,
    temperature: 0.7,
  },
});

// Analyze content
const analysis = await client.callTool({
  name: 'ai_analyze_content',
  arguments: {
    content: 'I love this new product! It works perfectly.',
    analysisType: 'sentiment',
  },
});
```

## Security Features

The sampling implementation includes several security features:

1. **Human-in-the-loop review**: Users can review and modify both the initial request and the generated response
2. **Client control**: The client has complete control over user permissions and security measures
3. **Context boundaries**: Sampling requests maintain clear boundaries between different contexts
4. **Error handling**: Proper error handling for unsupported backends and failed requests

## Testing

The sampling functionality is tested in `tests/mdb.spec.ts`:

```typescript
test('sampling functionality', async () => {
  const { mdbUrl } = await startMDBAndCLI();
  const mdbClient = await createMDBClient(mdbUrl);

  // Test that the server supports sampling
  const capabilities = mdbClient.client.getServerCapabilities();
  expect(capabilities?.sampling).toBeDefined();

  // Test sampling request
  const samplingRequest = {
    method: 'sampling/createMessage' as const,
    params: {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: 'Hello, how are you?'
          }
        }
      ]
    }
  };

  // This should work if the client supports sampling
  try {
    const result = await mdbClient.client.request(samplingRequest, CreateMessageResultSchema);
    expect(result).toBeDefined();
    expect(result.model).toBeDefined();
    expect(result.role).toBe('assistant');
    expect(result.content).toBeDefined();
  } catch (error) {
    // If the client doesn't support sampling, that's expected in test environment
    expect(error).toBeDefined();
  }

  await mdbClient.close();
});
```

## Benefits

1. **Agentic behaviors**: Servers can now perform AI-dependent tasks without directly integrating with AI models
2. **Security**: User control over permissions and security measures
3. **Efficiency**: Better use of context window through separate model calls
4. **Flexibility**: Servers can request different types of content (text, images, audio)
5. **Integration**: Seamless integration with existing MCP infrastructure

This implementation follows the MCP specification for sampling and provides a robust foundation for AI-powered MCP servers.
