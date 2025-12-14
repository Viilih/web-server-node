# Custom HTTP Server

A minimal HTTP/1.1 server implementation built from scratch in TypeScript, without using frameworks like Express or Fastify.

## Motivation

This project was created to deeply understand how HTTP servers work internally by implementing core functionality from the ground up:

- TCP socket handling and connection management
- HTTP request parsing (request line, headers, body)
- Multiple content-type support (JSON, form-urlencoded, text)
- Routing with path parameters and query strings
- Request buffering across TCP chunks

## Features

- ✅ **HTTP/1.1 Protocol** - Full request/response parsing
- ✅ **Multiple Content-Types** - JSON, form-urlencoded, text/plain, text/html
- ✅ **Routing System** - Path parameters (`:id`) and query strings
- ✅ **Body Parsing** - Automatic parsing based on Content-Type
- ✅ **Error Handling** - Structured error responses with appropriate status codes
- ✅ **Structured Logging** - Pino logger with development-friendly output
- ✅ **Tests** - 157 unit tests 

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript
- **Testing**: Bun test
- **Logging**: Pino

## Quick Start

### Install Dependencies
```bash
bun install
```

### Run Server
```bash
bun start
# or for hot-reload development
bun dev
```

Server will start at `http://localhost:3000`

## Testing

### Run All Tests
```bash
bun test
```

### Run Specific Test File
```bash
bun test src/http/parsers/__tests__/body.test.ts
```

## Manual Testing

### Using curl

**GET Request**
```bash
curl http://localhost:3000/
```

**GET with Path Parameters**
```bash
curl http://localhost:3000/api/users/42
```

**GET with Query Parameters**
```bash
curl "http://localhost:3000/api/users?limit=10&page=2"
```

**POST with JSON**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'
```

**POST with Form Data**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=Jane+Smith&email=jane@example.com"
```

### Using the Test Client

Start the server in one terminal:
```bash
bun start
```

Run the client in another terminal:
```bash
bun run src/client.ts
```

## Available Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Server info and available endpoints |
| GET | `/api/health` | Health check |
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create new user |

## Project Structure

```
src/
├── core/
│   └── types.ts              # Shared TypeScript types
├── http/
│   ├── buffer/
│   │   └── request-buffer.ts # TCP chunk buffering
│   ├── parsers/
│   │   ├── body.ts           # Body parser (JSON, form-urlencoded)
│   │   ├── header.ts         # Header parser
│   │   ├── http.ts           # Main HTTP parser orchestrator
│   │   └── request-line.ts   # Request line parser
│   ├── response-builder.ts   # HTTP response builder
│   ├── tcp-server.ts         # TCP server and connection handler
│   └── validator.ts          # HTTP validation utilities
├── router/
│   └── index.ts              # Routing system
├── utils/
│   ├── consts.ts             # Constants
│   └── logger.ts             # Structured logging
└── entrypoint.ts             # Application entry point
```

## Architecture

### Request
1. **TCP Connection** - Client connects to server
2. **Buffer Accumulation** - Chunks accumulated until complete message
3. **HTTP Detection** - Identifies HTTP vs plain text messages
4. **Parsing** - Request line → Headers → Body
5. **Routing** - Matches route and extracts parameters
6. **Handler Execution** - Runs route handler with context
7. **Response** - Builds and sends HTTP response

### Parser Design
- **Modular**: Separate parsers for each HTTP component
- **Result Pattern**: `ParseResult<T>` for consistent error handling
- **Type Safe**: Strong typing throughout the parsing pipeline

### Body Parsing
Automatically detects and parses based on `Content-Type`:
- `application/json` → Parsed JavaScript object
- `application/x-www-form-urlencoded` → Key-value pairs
- `text/plain`, `text/html` → Raw string
- Unknown types → Raw string


**Tests**: 157 tests

## Limitations

This is an educational project. For production use, consider:

- No request size limits (DoS vulnerability)
- No chunked transfer encoding
- No HTTP/2 support
- No multipart/form-data (file uploads)
- No compression (gzip/brotli)
- No HTTPS/TLS
- No keep-alive connections
- No rate limiting
- No input validation


## License

MIT
