# Quick Setup Reference

## Installation & Build
```bash
git clone https://github.com/your-username/blogger-mcp-server.git
cd blogger-mcp-server
npm install
npm run build
chmod +x dist/index.js
```

## Google Cloud Console Setup

### 1. Enable Blogger API
- Go to APIs & Services > Library
- Search "Blogger API v3" and enable it

### 2. Create API Key
- Go to APIs & Services > Credentials  
- Create Credentials > API Key
- Copy the key for read operations

### 3. Create OAuth Client
- Create Credentials > OAuth 2.0 Client ID
- Choose "Web application"
- Add redirect URI: `http://localhost:3000/oauth/callback`
- Note the Client ID and Client Secret

### 4. Configure OAuth Consent Screen
- Set up consent screen with app name
- Add scopes:
  - `https://www.googleapis.com/auth/blogger`
  - `https://www.googleapis.com/auth/blogger.readonly`
- Add your email as test user

## Claude Desktop Configuration

File: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "blogger": {
      "command": "node",
      "args": ["/full/path/to/blogger-mcp-server/dist/index.js"],
      "env": {
        "BLOGGER_API_KEY": "your_api_key",
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Usage Examples

```
Get information about my blog at myblog.blogspot.com
List recent posts from my blog
Create a draft post about my photography workflow
Search for posts about weddings in my blog
```

## File Structure
```
blogger-mcp-server/
├── src/
│   ├── index.ts          # Main MCP server
│   └── oauth.ts          # OAuth authentication
├── dist/                 # Compiled JavaScript
├── tokens.json          # OAuth tokens (auto-generated)
└── claude_desktop_config.example.json
```
