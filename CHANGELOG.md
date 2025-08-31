## [1.1.1] - 2025-08-30
### Fixed
- ES module compatibility issue with __dirname in OAuth handler
- Token file path resolution for proper token storage
- API request format for post creation (removed redundant blog ID in request body)
- OAuth scope configuration for write operations

### Improved
- Better error handling and debugging output
- Enhanced OAuth flow with proper token persistence
- Updated documentation with troubleshooting steps

## [1.1.0] - 2025-08-30
### Added
- OAuth 2.0 authentication support for write operations
- Create, update, and delete blog post functionality
- Draft post creation capabilities
- Post labeling/tagging support

## [1.0.0] - 2025-08-30
### Added
- Initial working implementation of Blogger MCP server
- Full TypeScript support with proper types
- Comprehensive error handling
- Complete documentation

### Fixed
- JSON-RPC protocol corruption from console output
- Missing executable configuration in package.json
- Broken dependency versions