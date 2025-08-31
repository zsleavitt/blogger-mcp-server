# Troubleshooting Guide - Blogger MCP Server

This guide documents common issues encountered during setup and operation of the Blogger MCP Server, based on real troubleshooting experiences.

## Setup Issues

### 1. NPX vs Node Command Error

**Symptom:**
```
npm ERR! ENOENT: no such file or directory, open '/absolute/path/to/blogger-mcp-server/dist/index.js/package.json'
```

**Cause:** Using `npx` instead of `node` in Claude Desktop configuration.

**Solution:** Change your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "blogger": {
      "command": "node",  // Not "npx"
      "args": ["/absolute/path/to/blogger-mcp-server/dist/index.js"]
    }
  }
}
```

### 2. Placeholder Path Error

**Symptom:**
```
Error: Cannot find module '/absolute/path/to/blogger-mcp-server/dist/index.js'
```

**Cause:** Using the placeholder path instead of the actual absolute path.

**Solution:** Replace with your actual path:
```json
"args": ["/Users/yourname/Documents/GitHub/blogger-mcp-server/dist/index.js"]
```

### 3. ES Module __dirname Error

**Symptom:**
```
ReferenceError: __dirname is not defined in ES module scope
```

**Cause:** ES modules don't have `__dirname` available by default.

**Solution:** The OAuth handler has been updated to use proper ES module directory resolution. Rebuild with `npm run build`.

## OAuth Authentication Issues

### 4. Access Denied During OAuth Flow

**Symptom:**
```
Error 403: access_denied
```

**Causes and Solutions:**

**Missing Redirect URI:**
- Add `http://localhost:3000/oauth/callback` to your OAuth client's authorized redirect URIs in Google Cloud Console

**Wrong Application Type:**
- Use "Web application" instead of "Desktop application" when creating OAuth client

**Missing Scopes:**
- Add both scopes to OAuth consent screen:
  - `https://www.googleapis.com/auth/blogger` (write access)
  - `https://www.googleapis.com/auth/blogger.readonly` (read access)

**App in Testing Mode:**
- Add your Google account as a test user in the OAuth consent screen

### 5. Token Storage Permission Error

**Symptom:**
```
EROFS: read-only file system, open '/tokens.json'
```

**Cause:** Token file trying to save in system root directory.

**Solution:** Updated OAuth handler to save tokens in project directory. Rebuild with `npm run build`.

## API Permission Issues

### 6. "You don't have permission to access this resource"

**Most Common Cause:** Using the wrong blog ID.

**Solution Steps:**
1. **Get the correct blog ID** by calling `get_blog_info` with your blog URL
2. **Verify blog ownership** - ensure you can manually post to the blog via blogger.com
3. **Check OAuth scopes** - ensure both read and write scopes are granted
4. **Fresh OAuth flow** - delete `tokens.json` and restart to get new permissions

**Example:**
```bash
# Wrong blog ID: trying to post to old/different blog
blogId: "1234567890123456789"  # Old blog from 2014

# Correct blog ID: your current active blog  
blogId: "9876543210987654321"  # New blog from 2025
```

## Debugging Process

### Step-by-Step Diagnosis

1. **Check server startup:**
   ```bash
   node dist/index.js
   # Should start without errors
   ```

2. **Verify OAuth token:**
   ```bash
   GOOGLE_CLIENT_ID="your_id" GOOGLE_CLIENT_SECRET="your_secret" node -e "import('./dist/oauth.js').then(async ({BloggerOAuth}) => { const oauth = new BloggerOAuth(); const client = await oauth.getAuthenticatedClient(); console.log('Token scopes:', client.credentials); });"
   ```

3. **Check Claude logs:**
   ```bash
   tail -30 ~/Library/Logs/Claude/mcp-server-blogger.log
   ```

4. **Test with correct blog:**
   - Use `get_blog_info` to verify you're targeting the right blog
   - Try `list_posts` to confirm read access works
   - Then attempt `create_post` for write access

### Environment Variable Checklist

Required for read operations:
- `BLOGGER_API_KEY`

Required for write operations:
- `GOOGLE_CLIENT_ID`  
- `GOOGLE_CLIENT_SECRET`

Example configuration:
```json
{
  "mcpServers": {
    "blogger": {
      "command": "node",
      "args": ["/full/path/to/blogger-mcp-server/dist/index.js"],
      "env": {
        "BLOGGER_API_KEY": "AIzaSy...",
        "GOOGLE_CLIENT_ID": "123456789-....apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "GOCSPX-..."
      }
    }
  }
}
```

## Success Indicators

When everything is working correctly, you should see:

1. **Server startup:** No errors in logs, tools list properly
2. **Read operations:** Can get blog info, list posts, search posts
3. **OAuth flow:** Browser opens for authentication, completes successfully
4. **Write operations:** Can create, update, delete posts
5. **Token persistence:** `tokens.json` file created in project directory

## Post-Setup Security

After successful setup, consider:
- Regenerating API keys and OAuth secrets that were shared during debugging
- Adding `tokens.json` to `.gitignore` (already included)
- Securing your Google Cloud Console project access
