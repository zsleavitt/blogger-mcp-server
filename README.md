# Blogger MCP Server

A working Model Context Protocol (MCP) server for Google's Blogger API that enables AI assistants like Claude to interact with Blogger blogs.

## Features

- Get blog information by URL or ID
- List blog posts with pagination
- Retrieve specific posts by ID
- Search posts within a blog
- Proper MCP protocol implementation
- TypeScript support with full type safety

## Prerequisites

- Node.js 18+ and npm
- Google Cloud API key with Blogger API v3 enabled
- A Blogger blog (blogs must be created manually via blogger.com)

## Installation

### Option 1: From Source (Recommended)

```bash
git clone https://github.com/your-username/blogger-mcp-server.git
cd blogger-mcp-server
npm install
npm run build
```

### Option 2: Global Installation

```bash
npm install -g blogger-mcp-server-fixed
```

## Setup

### 1. Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Blogger API v3
4. Create an API key in the Credentials section
5. Note the API key for configuration

### 2. Configure MCP Client

For **Claude Desktop**, add to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "blogger": {
      "command": "node",
      "args": [
        "/path/to/blogger-mcp-server/dist/index.js"
      ],
      "env": {
        "BLOGGER_API_KEY": "your_google_api_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Completely close and restart Claude Desktop to load the new configuration.

## Usage

Once configured, you can interact with your Blogger blog through natural language:

- "Get information about my blog at myblog.blogspot.com"
- "List the recent posts on my blog"
- "Search for posts about photography in my blog"
- "Show me the details of post ID 123456789"

## Available Tools

### get_blog_info
Get comprehensive information about a blog.

**Parameters:**
- `blogUrl` (string): Blog URL (e.g., `myblog.blogspot.com`) or Blog ID

### list_posts
List posts from a specific blog.

**Parameters:**
- `blogId` (string): The blog's ID
- `maxResults` (number, optional): Maximum posts to return (default: 10)

### get_post
Retrieve a specific blog post.

**Parameters:**
- `blogId` (string): The blog's ID
- `postId` (string): The post's ID

### search_posts
Search for posts within a blog.

**Parameters:**
- `blogId` (string): The blog's ID
- `query` (string): Search terms

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Testing

```bash
# Set your API key
export BLOGGER_API_KEY="your_api_key"

# Test the server
node dist/index.js
```

The server should start and wait for MCP protocol messages via stdin/stdout.

## API Limitations

Note these Blogger API limitations:

- **Blog Creation**: Cannot create new blogs via API - must be done manually through blogger.com
- **Search**: No direct search endpoint - implemented by fetching and filtering posts
- **Authentication**: API key provides access to public blogs only. OAuth required for private blogs

## Troubleshooting

### Server Not Connecting
1. Verify your API key is correct and has Blogger API access
2. Check that the path in your MCP configuration is correct
3. Ensure Claude Desktop was fully restarted after configuration changes

### API Errors
- Verify the blog URL/ID is correct
- Check that your API key has proper permissions
- Ensure the blog is public or you have access rights

### Windows Path Issues
Use double backslashes in Windows paths:
```json
"args": ["C:\\path\\to\\blogger-mcp-server\\dist\\index.js"]
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built for the Model Context Protocol ecosystem
- Uses Google's Blogger API v3
- Fixes issues present in other Blogger MCP implementations