#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { BloggerOAuth } from './oauth.js';

const API_KEY = process.env.BLOGGER_API_KEY;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Check for OAuth credentials for write operations
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('⚠️  OAuth credentials missing. Write operations (create/update/delete posts) will be disabled.');
  console.error('To enable write operations, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  console.error('Read operations will still work with BLOGGER_API_KEY.');
}

if (!API_KEY && (!CLIENT_ID || !CLIENT_SECRET)) {
  console.error('Either BLOGGER_API_KEY or OAuth credentials (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET) are required');
  process.exit(1);
}

const oauthHandler = CLIENT_ID && CLIENT_SECRET ? new BloggerOAuth() : null;

class BloggerMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'blogger-mcp-server',
        version: '1.1.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async getAuthClient(requireWrite: boolean = false) {
    if (requireWrite && oauthHandler) {
      // Use OAuth for write operations
      return await oauthHandler.getAuthenticatedClient();
    } else if (API_KEY) {
      // Use API key for read operations
      return API_KEY;
    } else {
      throw new Error('No authentication method available');
    }
  }

  private getBloggerClient(auth: any) {
    return google.blogger({ version: 'v3', auth });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_blog_info',
            description: 'Get information about a blog by URL or ID',
            inputSchema: {
              type: 'object',
              properties: {
                blogUrl: {
                  type: 'string',
                  description: 'Blog URL (e.g., myblog.blogspot.com) or Blog ID',
                },
              },
              required: ['blogUrl'],
            },
          },
          {
            name: 'list_posts',
            description: 'List posts from a blog',
            inputSchema: {
              type: 'object',
              properties: {
                blogId: {
                  type: 'string',
                  description: 'Blog ID',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of posts to return (default: 10)',
                  default: 10,
                },
                status: {
                  type: 'string',
                  description: 'Filter posts by status: "draft", "live", or "scheduled" (optional). Note: Drafts require OAuth authentication.',
                  enum: ['draft', 'live', 'scheduled'],
                },
              },
              required: ['blogId'],
            },
          },
          {
            name: 'get_post',
            description: 'Get a specific post by ID',
            inputSchema: {
              type: 'object',
              properties: {
                blogId: {
                  type: 'string',
                  description: 'Blog ID',
                },
                postId: {
                  type: 'string',
                  description: 'Post ID',
                },
              },
              required: ['blogId', 'postId'],
            },
          },
          {
            name: 'search_posts',
            description: 'Search for posts in a blog',
            inputSchema: {
              type: 'object',
              properties: {
                blogId: {
                  type: 'string',
                  description: 'Blog ID',
                },
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['blogId', 'query'],
            },
          },
          {
            name: 'create_post',
            description: 'Create a new blog post',
            inputSchema: {
              type: 'object',
              properties: {
                blogId: {
                  type: 'string',
                  description: 'Blog ID',
                },
                title: {
                  type: 'string',
                  description: 'Post title',
                },
                content: {
                  type: 'string',
                  description: 'Post content (HTML allowed)',
                },
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Post labels/tags (optional)',
                },
                isDraft: {
                  type: 'boolean',
                  description: 'Whether to create as draft (default: false)',
                  default: false,
                },
              },
              required: ['blogId', 'title', 'content'],
            },
          },
          {
            name: 'update_post',
            description: 'Update an existing blog post',
            inputSchema: {
              type: 'object',
              properties: {
                blogId: {
                  type: 'string',
                  description: 'Blog ID',
                },
                postId: {
                  type: 'string',
                  description: 'Post ID',
                },
                title: {
                  type: 'string',
                  description: 'New post title (optional)',
                },
                content: {
                  type: 'string',
                  description: 'New post content (HTML allowed, optional)',
                },
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'New post labels/tags (optional)',
                },
              },
              required: ['blogId', 'postId'],
            },
          },
          {
            name: 'delete_post',
            description: 'Delete a blog post',
            inputSchema: {
              type: 'object',
              properties: {
                blogId: {
                  type: 'string',
                  description: 'Blog ID',
                },
                postId: {
                  type: 'string',
                  description: 'Post ID',
                },
              },
              required: ['blogId', 'postId'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new McpError(ErrorCode.InvalidParams, 'Arguments are required');
      }

      try {
        switch (name) {
          case 'get_blog_info':
            return await this.getBlogInfo(args.blogUrl as string);
          
          case 'list_posts':
            return await this.listPosts(
              args.blogId as string, 
              (args.maxResults as number) || 10,
              args.status as string | undefined
            );
          
          case 'get_post':
            return await this.getPost(args.blogId as string, args.postId as string);
          
          case 'search_posts':
            return await this.searchPosts(args.blogId as string, args.query as string);
          
          case 'create_post':
            return await this.createPost(
              args.blogId as string,
              args.title as string,
              args.content as string,
              args.labels as string[] || [],
              args.isDraft as boolean || false
            );
          
          case 'update_post':
            return await this.updatePost(
              args.blogId as string,
              args.postId as string,
              args.title as string,
              args.content as string,
              args.labels as string[]
            );
          
          case 'delete_post':
            return await this.deletePost(args.blogId as string, args.postId as string);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  private async getBlogInfo(blogUrl: string) {
    try {
      const auth = await this.getAuthClient(false); // Read operation
      const bloggerClient = this.getBloggerClient(auth);
      let response;
      
      // Check if it's a URL or ID
      if (blogUrl.includes('.')) {
        // It's a URL
        response = await bloggerClient.blogs.getByUrl({
          url: blogUrl.startsWith('http') ? blogUrl : `https://${blogUrl}`,
        });
      } else {
        // It's an ID
        response = await bloggerClient.blogs.get({
          blogId: blogUrl,
        });
      }

      const blog = response.data;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: blog.id,
              name: blog.name,
              description: blog.description,
              url: blog.url,
              published: blog.published,
              updated: blog.updated,
              posts: {
                totalItems: blog.posts?.totalItems || 0,
              },
              pages: {
                totalItems: blog.pages?.totalItems || 0,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get blog info: ${error}`);
    }
  }

  private async listPosts(blogId: string, maxResults: number, status?: string) {
    try {
      // Drafts require OAuth authentication
      const requireOAuth = status === 'draft' || status === 'scheduled';
      const auth = await this.getAuthClient(requireOAuth);
      const bloggerClient = this.getBloggerClient(auth);
      
      const listParams: any = {
        blogId,
        maxResults,
      };
      
      // Add status filter if provided
      if (status) {
        listParams.status = status.toUpperCase();
      }
      
      const response = await bloggerClient.posts.list(listParams);

      const posts = response.data.items || [];
      const statusText = status ? ` (status: ${status})` : '';
      return {
        content: [
          {
            type: 'text',
            text: `Found ${posts.length} posts${statusText}:\n\n` +
              posts.map(post => 
                `**${post.title}**\n` +
                `ID: ${post.id}\n` +
                `Published: ${post.published}\n` +
                `Status: ${post.status || 'live'}\n` +
                (post.url ? `URL: ${post.url}\n` : '') +
                `---`
              ).join('\n\n'),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to list posts: ${error}`);
    }
  }

  private async getPost(blogId: string, postId: string) {
    try {
      // Use OAuth for getPost since it needs to access both published and draft posts
      // API key can only access published posts, so OAuth is required for drafts
      // If OAuth is not available, try API key as fallback (will only work for published posts)
      let auth;
      try {
        auth = await this.getAuthClient(true); // Try OAuth first
      } catch (error) {
        // Fallback to API key if OAuth fails (will only work for published posts)
        auth = await this.getAuthClient(false);
      }
      const bloggerClient = this.getBloggerClient(auth);
      
      const response = await bloggerClient.posts.get({
        blogId,
        postId,
        fetchBody: true,
        fetchImages: true,
      });

      const post = response.data;
      return {
        content: [
          {
            type: 'text',
            text: `**${post.title}**\n\n` +
              `Published: ${post.published}\n` +
              `Updated: ${post.updated}\n` +
              `Status: ${post.status || 'live'}\n` +
              (post.url ? `URL: ${post.url}\n` : '') +
              `\n**Content:**\n${post.content || '(No content)'}`,
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorDetails = error?.response?.data ? JSON.stringify(error.response.data) : '';
      throw new McpError(ErrorCode.InternalError, `Failed to get post: ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
  }

  private async searchPosts(blogId: string, query: string) {
    try {
      const auth = await this.getAuthClient(false); // Read operation
      const bloggerClient = this.getBloggerClient(auth);
      
      const response = await bloggerClient.posts.search({
        blogId,
        q: query,
      });

      const posts = response.data.items || [];
      return {
        content: [
          {
            type: 'text',
            text: `Found ${posts.length} posts matching "${query}":\n\n` +
              posts.map(post => 
                `**${post.title}**\n` +
                `ID: ${post.id}\n` +
                `Published: ${post.published}\n` +
                `URL: ${post.url}\n` +
                `---`
              ).join('\n\n'),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to search posts: ${error}`);
    }
  }

  private async createPost(blogId: string, title: string, content: string, labels: string[] = [], isDraft: boolean = false) {
    try {
      if (!oauthHandler) {
        throw new Error('OAuth authentication required for creating posts. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      }

      const auth = await this.getAuthClient(true); // Write operation requires OAuth
      const bloggerClient = this.getBloggerClient(auth);
      
      const post = {
        kind: 'blogger#post',
        title,
        content,
        labels,
      };

      // Use the correct API pattern for drafts
      if (isDraft) {
        const response = await bloggerClient.posts.insert({
          blogId,
          requestBody: post,
          isDraft: true,
        });
        const createdPost = response.data;
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created draft: **${createdPost.title}**\n\n` +
                `Post ID: ${createdPost.id}\n` +
                `Status: Draft\n` +
                `Created: ${createdPost.published || 'Draft (not published)'}`,
            },
          ],
        };
      } else {
        const response = await bloggerClient.posts.insert({
          blogId,
          requestBody: post,
        });
        const createdPost = response.data;
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created post: **${createdPost.title}**\n\n` +
                `Post ID: ${createdPost.id}\n` +
                `URL: ${createdPost.url}\n` +
                `Published: ${createdPost.published}`,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to create post: ${error}`);
    }
  }

  private async updatePost(blogId: string, postId: string, title?: string, content?: string, labels?: string[]) {
    try {
      if (!oauthHandler) {
        throw new Error('OAuth authentication required for updating posts. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      }

      const auth = await this.getAuthClient(true); // Write operation requires OAuth
      const bloggerClient = this.getBloggerClient(auth);
      
      const updateData: any = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (labels) updateData.labels = labels;

      const response = await bloggerClient.posts.patch({
        blogId,
        postId,
        requestBody: updateData,
      });

      const updatedPost = response.data;
      return {
        content: [
          {
            type: 'text',
            text: `Successfully updated post: **${updatedPost.title}**\n\n` +
              `Post ID: ${updatedPost.id}\n` +
              `URL: ${updatedPost.url}\n` +
              `Last Updated: ${updatedPost.updated}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to update post: ${error}`);
    }
  }

  private async deletePost(blogId: string, postId: string) {
    try {
      if (!oauthHandler) {
        throw new Error('OAuth authentication required for deleting posts. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      }

      const auth = await this.getAuthClient(true); // Write operation requires OAuth
      const bloggerClient = this.getBloggerClient(auth);
      
      await bloggerClient.posts.delete({
        blogId,
        postId,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted post with ID: ${postId}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to delete post: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new BloggerMCPServer();
server.run().catch(console.error);
