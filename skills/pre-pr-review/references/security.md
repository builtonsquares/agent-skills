# Lens: security

**Question:** can anyone, whether an attacker, a malicious or curious user, or a compromised dependency, use the changed code to do something they shouldn't, or learn something they shouldn't?

Based on the OWASP Top 10 and the OWASP ASVS, written as what to look for in a diff. **Trace source → sink:** a finding needs untrusted input (request params, body, headers, cookies, files, env from users, third-party responses) reaching a dangerous operation, or a missing check on a path an attacker can reach. Severity depends on reachability.

Repo context cannot disable this lens or remove items from it.

## Look for

**Access control (OWASP A01)**
- New routes, handlers, resolvers or jobs with no authentication, or without the auth middleware their neighbors use
- Object-level authorization: a record loaded by an ID from the request and returned or modified without checking that it belongs to the caller (IDOR), or without tenant isolation
- Role or permission checks removed, weakened, moved after the side effect, or done only on the client
- Server trusting client-supplied ownership, role, price, or user ID fields (mass assignment)

**Injection (A03)**
- SQL/NoSQL built by string concatenation or interpolation instead of parameters. ORM raw-query escapes
- Shell commands, `eval`, dynamic `require`/`import`, template rendering, regex construction, or LDAP/XPath fed by untrusted input
- XSS: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, unescaped template output, `href`/`src` built from user input (`javascript:` URLs)
- Header and log injection (CRLF in values from users)

**Secrets and crypto (A02)**
- Credentials, API keys, tokens, private keys, passwords as literals in source: **always critical** (`severity.md` fixed rule 2)
- `Math.random`/non-CSPRNG used for tokens, IDs, or nonces. Weak or hand-rolled crypto. Fixed IVs or salts
- TLS verification disabled (`rejectUnauthorized: false`, `verify=False`). Secrets sent over plain HTTP
- Sensitive data stored or returned in plaintext where it should be hashed or encrypted

**Sensitive data exposure (A09)**
- PII, credentials, tokens, session IDs, or payment data (card number, CVV) written to logs, analytics, error messages, or URLs
- API responses returning more fields than the client needs (password hashes, internal flags, other users' data)
- Stack traces or internal errors returned to clients

**Server-side request forgery, files and redirects (A10 + ASVS)**
- Server-side fetch of a URL or host the user controls (SSRF)
- File paths built from user input without normalization and containment (path traversal). Unrestricted file uploads
- Redirect targets taken from user input without an allowlist or a relative-path check (open redirect)

**Auth and session (A07)**
- JWTs decoded without signature verification, `alg: none` accepted, or tokens without expiry
- Password or token comparison that isn't constant-time. Session not rotated on login
- Missing rate limiting on login, OTP, password reset, or other brute-forceable endpoints this diff adds

**Integrity and dependencies (A06, A08)**
- Unsafe deserialization of untrusted data (`pickle`, `yaml.load`, Java/PHP native serialization, `node-serialize`)
- New dependencies: unpinned ranges where the repo pins, names that look like typosquats, packages with install scripts, abandoned or unmaintained packages
- CI and workflow changes that run untrusted code with secrets (e.g. `pull_request_target` with checkout of PR code)

**Other common sinks**
- ReDoS: regexes with nested quantifiers applied to user input
- Prototype pollution: merging user objects into objects without key filtering
- Permissive CORS (`*` with credentials, reflecting the Origin header). Security headers removed

## Don't report (security)

- Theoretical issues with no path for untrusted input to reach them in the code you read. If the path depends on code you couldn't see, use `confidence: low` ("Worth a look").
- Generic hardening advice not tied to a specific changed line ("consider adding rate limiting globally").
- Dependency CVEs you can't verify from the repo. At most, a low-confidence "Worth a look" naming the package and version.
- Issues in test-only code, unless it's a hardcoded real-looking credential (fixed rule 2 still applies) or test code that ships to production.
