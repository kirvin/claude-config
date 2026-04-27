# Python Stack — Finding Patterns

Applies when `requirements.txt`, `pyproject.toml`, `setup.py`, or `Pipfile` is present.
Covers Flask, Django, FastAPI, and general Python services.

---

## CRED

**Patterns:**
- String literal assigned to `TOKEN`, `SECRET_KEY`, `API_KEY`, `PASSWORD`, `DB_URL`
- `os.getenv('KEY', 'hardcoded-default')` — the default IS the credential
- Credentials in `settings.py`, `config.py`, or `django/settings/local.py`
- Django `SECRET_KEY` set to a non-random value or the Django default

**Bad:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'PASSWORD': 'mypassword123',
    }
}
```
**Good:**
```python
import os
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'PASSWORD': os.environ['DB_PASSWORD'],
    }
}
```

---

## AUTH

**Patterns:**
- Flask routes missing `@login_required` or equivalent decorator
- Django views missing `@permission_required` or `LoginRequiredMixin`
- FastAPI endpoints without `Depends(get_current_user)`
- CSRF protection disabled (`csrf_exempt`, `CSRF_COOKIE_SECURE = False`)
- `pickle.loads()` on data from an unauthenticated source (leads to RCE, not just auth bypass)
- JWT decoded with `verify=False` or without algorithm verification

**Bad:**
```python
@app.route('/admin/users')
def admin_users():          # no auth check
    return jsonify(User.query.all())
```
**Good:**
```python
@app.route('/admin/users')
@login_required
@admin_required
def admin_users():
    return jsonify(User.query.all())
```

---

## INJECT

**Patterns:**
- SQLAlchemy raw queries with f-strings: `db.execute(f"SELECT * WHERE id = {user_id}")`
- `subprocess.run(cmd, shell=True)` where `cmd` includes user input
- `eval()` or `exec()` with non-literal input
- `yaml.load()` without `Loader=yaml.SafeLoader` (arbitrary object instantiation)
- Jinja2 `Template(user_input).render()` — server-side template injection
- `os.system()` or `os.popen()` with user-controlled arguments

**Bad:**
```python
results = db.execute(f"SELECT * FROM users WHERE name = '{name}'")
```
**Good:**
```python
results = db.execute("SELECT * FROM users WHERE name = :name", {"name": name})
```

---

## EXPOSE

**Patterns:**
- `print(request.json)` or `logger.debug(request.headers)` in production paths
- Django `DEBUG = True` in production settings (full stack traces in HTTP responses)
- `except Exception as e: return jsonify({"error": str(e)})` — exposes internal error detail
- Logging formatters that include `%(exc_info)s` sent to external log aggregators without filtering
- FastAPI response models with more fields than intended (`response_model` not set)

**Bad:**
```python
@app.errorhandler(500)
def server_error(e):
    return jsonify(error=traceback.format_exc()), 500
```
**Good:**
```python
@app.errorhandler(500)
def server_error(e):
    app.logger.error('Unhandled error', exc_info=e)
    return jsonify(error='Internal server error'), 500
```

---

## SUPPLY

**Patterns:**
- `requirements.txt` with unpinned versions: `requests` instead of `requests==2.31.0`
- `pip install <url>` or `pip install git+https://...` without a pinned commit
- `setup.py` `install_requires` with no upper bound on security-sensitive packages
- `--extra-index-url` pointing to an untrusted package index (dependency confusion attack vector)

**Check:**
```bash
pip-audit                    # if installed
safety check                 # if installed
grep -E '^[a-zA-Z]' requirements.txt | grep -v '=='  # unpinned packages
```

---

## SCOPE

**Patterns:**
- `open(user_input)` or `open(os.path.join(base, user_input))` without path validation
- `os.path.join` does not prevent traversal: `os.path.join('/safe', '../etc/passwd')` works
- Flask `send_from_directory` with user-controlled filename without sanitization
- SSRF: `requests.get(user_provided_url)` without allowlist
- Pickle or shelve operations loading from user-controlled file paths

**Bad:**
```python
@app.route('/download')
def download():
    filename = request.args.get('file')
    return send_file(os.path.join(UPLOAD_DIR, filename))
```
**Good:**
```python
@app.route('/download')
def download():
    filename = secure_filename(request.args.get('file', ''))
    path = os.path.realpath(os.path.join(UPLOAD_DIR, filename))
    if not path.startswith(os.path.realpath(UPLOAD_DIR)):
        abort(400)
    return send_file(path)
```

---

## CI

Same patterns as the universal CI category. Additionally watch for:
- `python -c "import os; print(os.environ)"` anywhere in CI steps
- Test fixtures that write real credentials to temp files without cleanup
- `tox` or `pytest` configurations that disable security-related test markers in CI
