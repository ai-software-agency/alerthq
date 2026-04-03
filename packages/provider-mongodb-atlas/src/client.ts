import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { DigestChallenge } from './types.js';

/**
 * HTTP client implementing RFC 7616 Digest Authentication for MongoDB Atlas API.
 */
export class DigestAuthClient {
  private readonly username: string;
  private readonly password: string;
  private nonceCount = 0;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  /**
   * Perform a fetch with Digest authentication.
   * First request gets a 401 with WWW-Authenticate, second includes the digest header.
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Step 1: send unauthenticated request to get challenge
    const initialResp = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (initialResp.status !== 401) {
      return initialResp;
    }

    const wwwAuth = initialResp.headers.get('www-authenticate');
    if (!wwwAuth) {
      throw new Error('Atlas API returned 401 without WWW-Authenticate header');
    }

    const challenge = this.parseChallenge(wwwAuth);
    const method = (options.method ?? 'GET').toUpperCase();
    const uri = new URL(url).pathname + new URL(url).search;
    const authHeader = this.buildAuthorizationHeader(challenge, method, uri);

    // Step 2: send authenticated request
    const resp = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders(),
        ...(options.headers as Record<string, string> | undefined),
        Authorization: authHeader,
      },
    });

    return resp;
  }

  private defaultHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.atlas.2023-02-01+json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse the WWW-Authenticate header into a structured challenge object.
   */
  parseChallenge(header: string): DigestChallenge {
    const parts: Record<string, string> = {};

    // Match key="value" or key=value patterns
    const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(header)) !== null) {
      parts[match[1]] = match[2] ?? match[3];
    }

    if (!parts.realm || !parts.nonce) {
      throw new Error(`Invalid Digest challenge: missing realm or nonce in "${header}"`);
    }

    return {
      realm: parts.realm,
      nonce: parts.nonce,
      qop: parts.qop,
      opaque: parts.opaque,
      algorithm: parts.algorithm,
    };
  }

  /**
   * Build the Authorization header value for Digest authentication.
   */
  buildAuthorizationHeader(
    challenge: DigestChallenge,
    method: string,
    uri: string,
  ): string {
    const algorithm = challenge.algorithm ?? 'MD5';
    const hashFn = algorithm.toUpperCase() === 'SHA-256' ? 'sha256' : 'md5';

    const ha1 = this.hash(
      hashFn,
      `${this.username}:${challenge.realm}:${this.password}`,
    );
    const ha2 = this.hash(hashFn, `${method}:${uri}`);

    this.nonceCount++;
    const nc = this.nonceCount.toString(16).padStart(8, '0');
    const cnonce = randomUUID().replace(/-/g, '').slice(0, 16);

    let response: string;
    const parts: string[] = [
      `username="${this.username}"`,
      `realm="${challenge.realm}"`,
      `nonce="${challenge.nonce}"`,
      `uri="${uri}"`,
      `algorithm=${algorithm}`,
    ];

    if (challenge.qop) {
      response = this.hash(
        hashFn,
        `${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`,
      );
      parts.push(`qop=auth`, `nc=${nc}`, `cnonce="${cnonce}"`);
    } else {
      response = this.hash(hashFn, `${ha1}:${challenge.nonce}:${ha2}`);
    }

    parts.push(`response="${response}"`);

    if (challenge.opaque) {
      parts.push(`opaque="${challenge.opaque}"`);
    }

    return `Digest ${parts.join(', ')}`;
  }

  private hash(algorithm: string, data: string): string {
    return createHash(algorithm).update(data).digest('hex');
  }
}
