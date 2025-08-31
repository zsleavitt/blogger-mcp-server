# Files Updated for v1.1.1 Release

This document tracks the files updated for the v1.1.1 release, which includes bug fixes and improvements discovered during initial deployment.

## Updated Files

### Source Code
- `src/index.ts` - Fixed API request format, updated version to 1.1.1
- `src/oauth.ts` - Fixed ES module __dirname issue, improved token file path handling

### Documentation  
- `README.md` - Enhanced troubleshooting section, added debug commands and common error messages
- `CHANGELOG.md` - Added detailed changelog for v1.1.1 and v1.1.0
- `OAUTH_SETUP.md` - Existing OAuth setup instructions (unchanged)

### Configuration
- `package.json` - Updated version to 1.1.1
- `claude_desktop_config.example.json` - Added OAuth environment variables
- `.gitignore` - Added .git/ directory exclusion

### New Files
- `TROUBLESHOOTING.md` - Comprehensive troubleshooting guide based on real deployment issues
- `QUICK_SETUP.md` - Quick reference for developers

## Key Fixes Applied

1. **ES Module Compatibility** - Fixed __dirname usage in OAuth handler
2. **Token File Path** - Proper path resolution for token storage
3. **API Request Format** - Cleaned up blog post creation request structure  
4. **OAuth Configuration** - Enhanced scope handling and error reporting
5. **Documentation** - Added real-world troubleshooting scenarios

## Build Requirements

After making these changes, developers should:

```bash
npm run build          # Compile TypeScript changes
chmod +x dist/index.js # Ensure executable permissions
```

## Ready for Commit

All files are now updated and ready for version control commit. The server has been tested and confirmed working with:
- Blog information retrieval
- Post listing and searching  
- Draft post creation
- OAuth authentication flow
- Token persistence

The v1.1.1 release represents a stable, production-ready version of the Blogger MCP server.
