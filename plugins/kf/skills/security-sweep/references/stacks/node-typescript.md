# Node.js / TypeScript Stack — Finding Patterns

Applies when `package.json` is present. Also covers Express, Fastify, NestJS,
Next.js, and similar server-side Node.js frameworks.

---

## CRED

**Patterns:**
- String literal assigned to a variable named `token`, `key`, `secret`, `password`,
  `apiKey`, `connectionString`, or similar
- `process.env.TOKEN || 'hardcoded-fallback'` — the fallback IS the credential
- Credentials in `jest.config.js`, `.storybook/`, or other config files that may be committed
- Private keys or certificates embedded as multiline strings

**Bad:**
```typescript
const client = new SomeClient({ apiKey: 'sk-abc123def456' });
```
**Good:**
```typescript
const apiKey = process.env.SOME_API_KEY;
if (!apiKey) throw new Error('SOME_API_KEY not set');
const client = new SomeClient({ apiKey });
```

---

## AUTH

**Patterns:**
- Express/Fastify routes without auth middleware before the handler
- JWT verification missing `algorithms` option (accepts any algorithm, enabling alg:none attack)
- `req.user` accessed without null check after optional auth middleware
- Role/permission checks based on `req.body.role` or `req.query.admin` (user-controlled)
- Session secret set to a weak or hardcoded value

**Bad:**
```typescript
app.get('/admin/data', async (req, res) => {  // no auth middleware
  const data = await db.getAll();
  res.json(data);
});
```
**Good:**
```typescript
app.get('/admin/data', requireAuth, requireRole('admin'), async (req, res) => {
  const data = await db.getAll();
  res.json(data);
});
```

---

## INJECT

**Patterns:**
- SQL built with template literals or string concatenation: `` `SELECT * WHERE id = ${req.body.id}` ``
- `child_process.exec()` with user-controlled arguments (prefer `execFile` with arg array)
- `eval()`, `new Function()`, or `vm.runInThisContext()` with non-literal input
- Server-side template engines (Handlebars, EJS, Pug) rendering user input without escaping
- Prototype pollution: `Object.assign({}, req.body)` merging into prototype-sensitive objects

**Bad:**
```typescript
const result = await db.query(`SELECT * FROM users WHERE name = '${req.body.name}'`);
```
**Good:**
```typescript
const result = await db.query('SELECT * FROM users WHERE name = $1', [req.body.name]);
```

---

## EXPOSE

**Patterns:**
- `console.log(req.body)` — may contain passwords or tokens
- Error handler returning `err.stack` or `err.message` directly in HTTP response
- `JSON.stringify(error)` in a response (serializes all properties including internal ones)
- Logging middleware capturing `Authorization` headers or `Set-Cookie` without redaction
- GraphQL introspection enabled in production

**Bad:**
```typescript
app.use((err: Error, req, res, next) => {
  res.status(500).json({ error: err.stack });
});
```
**Good:**
```typescript
app.use((err: Error, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## SUPPLY

**Patterns:**
- New dependency with no `repository` field in its `package.json` (`npm info <pkg> repository`)
- `"scripts": { "postinstall": "curl ... | bash" }` in a dependency (check `npm info <pkg> scripts`)
- `package.json` using `*` or an overly broad range (`>=1.0.0`)
- `npm install <url>` or `npm install <github-user>/<repo>` without a pinned ref

**Check:**
```bash
npm audit --audit-level=high
cat package.json | jq '.dependencies | to_entries[] | select(.value | startswith("*") or startswith(">="))'
```

---

## SCOPE

**Patterns:**
- `fs.readFile(req.params.filename)` — path traversal: `../../etc/passwd`
- `path.join(baseDir, req.body.path)` without `path.resolve` + prefix check
- CORS configured with `origin: '*'` on endpoints that use cookies or session auth
- `res.redirect(req.query.returnUrl)` — open redirect
- SSRF: `fetch(req.body.webhookUrl)` or `axios.get(req.query.url)` without allowlist

**Bad:**
```typescript
app.get('/files/:name', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads', req.params.name));
});
```
**Good:**
```typescript
app.get('/files/:name', (req, res) => {
  const resolved = path.resolve(__dirname, 'uploads', req.params.name);
  if (!resolved.startsWith(path.resolve(__dirname, 'uploads'))) {
    return res.status(400).send('Invalid path');
  }
  res.sendFile(resolved);
});
```

---

## CI

Same patterns as the universal CI category. Additionally watch for:
- `NODE_ENV` not set to `production` in CI steps that run the app
- `npm install` without `--ignore-scripts` in CI (runs postinstall hooks from dependencies)
- Test coverage steps that print environment variables in verbose mode
