# OpenAI Client Usage in Tools

The OpenAI client is now available in the Context class and can be used in your tools. Here's how to access it:

## Accessing the OpenAI Client

In your tool implementations, you can access the OpenAI client through the context:

```typescript
export const myAITool: Tool = {
  name: 'my_ai_tool',
  description: 'A tool that uses OpenAI',
  capability: 'core',
  async run(context, args) {
    // OpenAI client is always available (API key is required)
    const completion = await context.openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ],
      max_tokens: 100
    });

    return completion.choices[0]?.message?.content || 'No response';
  }
};
```

## Configuration

The OpenAI API key is **required** and can be provided in several ways:

1. **Command line option**: `--openai-api-key <key>`
2. **Environment variable**: `MCP_OPENAI_API_KEY=<key>`
3. **Configuration file**: Add `"openaiApiKey": "<key>"` to your config file

**Note**: The application will fail to start if no OpenAI API key is provided.

## Example Usage

```bash
# Using command line option
npx playwright-mcp --openai-api-key sk-... your-command

# Using environment variable
export MCP_OPENAI_API_KEY=sk-...
npx playwright-mcp your-command
```

The OpenAI client will be automatically initialized when an API key is provided and will be available as `context.openaiClient` in all your tools.
