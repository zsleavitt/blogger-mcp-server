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

const API_KEY = process.env.BLOGGER_API_KEY;

if (!API_KEY) {
  console.error('BLOGGER_API_KEY environment variable is required');
  process.exit(1);
}

const blogger = google.blogger({ version: 'v3', auth: API_KEY });

class BloggerMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'blogger-mcp-server',
        version: '1.0.0',
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
            return await this.listPosts(args.blogId as string, (args.maxResults as number) || 10);
          
          case 'get_post':
            return await this.getPost(args.blogId as string, args.postId as string);
          
          case 'search_posts':
            return await this.searchPosts(args.blogId as string, args.query as string);
          
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
      let response;
      
      // Check if it's a URL or ID
      if (blogUrl.includes('.')) {
        // It's a URL
        response = await blogger.blogs.getByUrl({
          url: blogUrl.startsWith('http') ? blogUrl : `https://${blogUrl}`,
        });
      } else {
        // It's an ID
        response = await blogger.blogs.get({
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

  private async listPosts(blogId: string, maxResults: number) {
    try {
      const response = await blogger.posts.list({
        blogId,
        maxResults,
      });

      const posts = response.data.items || [];
      return {
        content: [
          {
            type: 'text',
            text: `Found ${posts.length} posts:\n\n` +
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
      throw new McpError(ErrorCode.InternalError, `Failed to list posts: ${error}`);
    }
  }

  private async getPost(blogId: string, postId: string) {
    try {
      const response = await blogger.posts.get({
        blogId,
        postId,
      });

      const post = response.data;
      return {
        content: [
          {
            type: 'text',
            text: `**${post.title}**\n\n` +
              `Published: ${post.published}\n` +
              `Updated: ${post.updated}\n` +
              `URL: ${post.url}\n\n` +
              `**Content:**\n${post.content}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get post: ${error}`);
    }
  }

  private async searchPosts(blogId: string, query: string) {
    try {
      const response = await blogger.posts.search({
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new BloggerMCPServer();
server.run().catch(console.error);