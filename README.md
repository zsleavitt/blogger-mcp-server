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
        "BLOGGER_API_KEY": "your_google_api_key_here",
        "BLOGGER_ID": "your_blog_id_here",
        "GOOGLE_CLIENT_ID": "your_oauth_client_id_here",
        "GOOGLE_CLIENT_SECRET": "your_oauth_client_secret_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Completely close and restart Claude Desktop to load the new configuration.

## Usage

Once configured, you can interact with your Blogger blog through natural language:

**Read Operations:**
- "Get information about my blog at myblog.blogspot.com"
- "List the recent posts on my blog"
- "Search for posts about photography in my blog"
- "Show me the details of post ID 123456789"

**Write Operations (requires OAuth):**
- "Create a draft blog post about my recent photo shoot"
- "Update the post with ID 123456789"
- "Delete the draft post with ID 987654321"

**Important**: Always use the correct blog URL or ID. The server will target the specific blog you reference in your requests.

### Finding Your Blog ID

To get your blog ID, use the `get_blog_info` tool with your blog URL:

```
"Get information about my blog at myblog.blogspot.com"
```

The response will include the blog ID that you can use for other operations. For example:
```json
{
  "id": "1234567890123456789",
  "name": "My Blog",
  "url": "https://myblog.blogspot.com/"
}
```

Use the `id` field for subsequent operations like creating posts.

### Environment Variables

**BLOGGER_API_KEY** (required for read operations)
- Your Google Cloud API key with Blogger API v3 enabled
- Used for read-only operations (listing published posts, getting blog info, etc.)

**BLOGGER_ID** (optional, recommended)
- Your blog's numeric ID (e.g., "1234567890123456789")
- **Purpose**: Provides a default blog ID when not explicitly specified in tool calls
- **Benefits**: 
  - Eliminates the need to specify the blog ID in every request when working with a single blog
  - Acts as a fallback when `blogId` or `blogUrl` parameters are missing or empty
  - Makes commands more concise: "List my draft posts" instead of "List draft posts for blog 1234567890123456789"
- **How to find**: Use the `get_blog_info` tool with your blog URL to retrieve the ID
- **Note**: You can still override this by explicitly providing a `blogId` in any tool call

**GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET** (required for write operations and drafts)
- OAuth 2.0 credentials from Google Cloud Console
- Required for creating, updating, or deleting posts
- Required for accessing draft posts (drafts require authenticated access)
- Required for listing scheduled posts
- See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed setup instructions

## Available Tools

### get_blog_info
Get comprehensive information about a blog.

**Parameters:**
- `blogUrl` (string): Blog URL (e.g., `myblog.blogspot.com`) or Blog ID

### list_posts
List posts from a specific blog. Can filter by status to show drafts, published posts, or scheduled posts.

**Parameters:**
- `blogId` (string, optional): The blog's ID. If not provided, uses BLOGGER_ID from environment variables
- `maxResults` (number, optional): Maximum posts to return (default: 10)
- `status` (string, optional): Filter by status - "draft", "live", or "scheduled". Note: Drafts and scheduled posts require OAuth authentication

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

### Common Issues and Solutions

#### Server Not Connecting
1. **Wrong command in configuration**: Ensure you're using `"command": "node"` not `"command": "npx"`
2. **Incorrect file path**: Use the absolute path to `dist/index.js`, not a placeholder path
3. **File permissions**: Run `chmod +x dist/index.js` to make the file executable
4. **Restart required**: Completely quit and restart Claude Desktop after configuration changes

#### OAuth Authentication Issues
1. **Missing redirect URI**: Add `http://localhost:3000/oauth/callback` to your OAuth client in Google Cloud Console
2. **Wrong application type**: Use "Web application" not "Desktop application" for OAuth client
3. **Missing scopes**: Ensure both `https://www.googleapis.com/auth/blogger` and `https://www.googleapis.com/auth/blogger.readonly` are added to OAuth consent screen
4. **Test user setup**: Add your Google account as a test user if the app is in testing mode

#### "Tool execution failed" Errors
1. **Wrong blog ID**: Ensure you're using the correct blog ID for your target blog
2. **ES module errors**: If you see `__dirname is not defined`, rebuild the project with `npm run build`
3. **Token file permissions**: Tokens should save to the project directory, not system root
4. **Stale tokens**: Delete `tokens.json` and restart to force fresh OAuth flow

#### Permission Errors
- **"You don't have permission to access this resource"**: Verify you're targeting the correct blog ID and have admin access
- **Blog ownership**: Confirm you can manually create posts on the target blog via blogger.com
- **OAuth scope issues**: Ensure the OAuth consent screen includes both read and write Blogger scopes

### Debug Commands

```bash
# Test server startup
node dist/index.js

# Check OAuth token loading (replace with your actual credentials)
GOOGLE_CLIENT_ID="your_id" GOOGLE_CLIENT_SECRET="your_secret" node -e "import('./dist/oauth.js').then(async ({BloggerOAuth}) => { const oauth = new BloggerOAuth(); const client = await oauth.getAuthenticatedClient(); console.log('Token scopes:', client.credentials); });"

# View recent logs
tail -30 ~/Library/Logs/Claude/mcp-server-blogger.log

# Make file executable
chmod +x dist/index.js

# Clean rebuild
npm run build
```

### Common Error Messages

- **"npm ERR! ENOENT: no such file or directory"**: Using `npx` instead of `node` in configuration
- **"__dirname is not defined in ES module scope"**: Need to rebuild project after ES module fixes
- **"EROFS: read-only file system"**: Token file trying to save in wrong location
- **"We're sorry, but you don't have permission to access this resource"**: Wrong blog ID or insufficient OAuth scopes
- **"Tool execution failed"**: Generic error - check logs for specific details

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