# OAuth Setup Instructions

To enable post creation, updating, and deletion, you need to set up OAuth 2.0 authentication with Google.

## Step 1: Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Choose **Desktop Application** as the application type
6. Name it "Blogger MCP Server"
7. Click **Create**
8. Download the JSON file or note the Client ID and Client Secret

## Step 2: Configure Environment Variables

Add these to your environment (or Claude config):

```bash
# Required for write operations (create/update/delete posts)
GOOGLE_CLIENT_ID=your_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_oauth_client_secret_here

# Still needed for read operations if OAuth fails
BLOGGER_API_KEY=your_api_key_here
```

## Step 3: Update Claude Configuration

```json
{
  "mcpServers": {
    "blogger": {
      "command": "node",
      "args": [
        "C:\\path\\to\\blogger-mcp-server\\dist\\index.js"
      ],
      "env": {
        "BLOGGER_API_KEY": "your_api_key",
        "GOOGLE_CLIENT_ID": "your_oauth_client_id",
        "GOOGLE_CLIENT_SECRET": "your_oauth_client_secret"
      }
    }
  }
}
```

## Step 4: Authentication Flow

When you first try to create a post:

1. The server will automatically open your browser
2. Sign in to Google and grant permissions
3. The server will save OAuth tokens locally (`tokens.json`)
4. Future requests will use the saved tokens automatically

## Security Notes

- The `tokens.json` file contains sensitive auth tokens
- It's already added to `.gitignore` to prevent accidental commits
- Keep your OAuth credentials secure
- The server runs a temporary local server (port 3000) only during authentication

## Troubleshooting

### "OAuth credentials missing" warning
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables
- Read operations will still work with just `BLOGGER_API_KEY`

### Authentication fails
- Check that OAuth credentials are correct
- Ensure Blogger API is enabled in Google Cloud Console
- Try deleting `tokens.json` to force re-authentication

### Port 3000 in use
- The OAuth flow temporarily uses port 3000
- Make sure it's available during authentication
- After authentication completes, the port is freed