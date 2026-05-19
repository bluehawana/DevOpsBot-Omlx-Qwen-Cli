# DevOpsBot Code Review Tools

## ✅ Fixed & Deployed

### Context Window Fix
- Updated `/Users/harvad/.omlx/settings.json`
  - Changed `max_context_window`: 32768 → **65536**
  - Changed `max_tokens`: 32768 → **65536**
- oMLX server now running on port 8000 with extended context

### Code Fixes
1. **Fixed module imports**
   - Added `execSync` to cli.js imports
   - Moved `yaml` to ESM import in config.js
   - Added `mkdirSync` to fs imports

2. **Fixed function naming**
   - Changed `analyzeCode` → `analyzeCodebase` (cli.js line 307)
   - Added missing `getPRNumber` import from reviewer.js

3. **Created oMLX client** (`src/omlx-client.js`)
   - HTTP client for oMLX OpenAI-compatible API
   - Handles authentication with Bearer token
   - Configurable model and endpoint

4. **Updated reviewer.js**
   - Now uses oMLX instead of local Ollama
   - All review functions support oMLX model selection
   - Better error handling and fallbacks

---

## 📋 Available Commands

### `devopsbot review [files...]`
Review code files using Huihui Qwen3.6
```bash
# Review specific files
devopsbot review src/config.js src/cli.js

# Review current changes (default)
devopsbot review
```
Output: Code audit with bugs, suggestions, security issues, and score

### `devopsbot review:staged`
Review staged Git changes
```bash
devopsbot review:staged
```

### `devopsbot analyze [dir]`
Deep codebase analysis with stats and patterns
```bash
devopsbot analyze src/
```

### `devopsbot summary`
Generate PR summary from current changes
```bash
devopsbot summary
```

### `devopsbot review:github [PR#]`
Review a GitHub PR
```bash
devopsbot review:github 123
```

---

## 🔧 Configuration

### Defaults (`.devopsbot/config.yaml`)
```yaml
omlx:
  host: http://localhost:8000
  model: Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated-mlx-8bit
  apiKey: omlx-a4qtcnh7r8e9p8vt
```

### Start oMLX Server
```bash
/Applications/oMLX.app/Contents/MacOS/omlx-cli serve \
  --base-path /Users/harvad/.omlx \
  --port 8000
```

---

## 📊 Recent Analysis Example

```
Files: 9  Lines: 1112
Avg size: 124 lines  Largest: cli.js (358 lines)

Recommendations:
• Add test files for all modules with integration tests
• Consider adding error handling tests for SSH and GitHub
• Implement retry logic for external API calls
• Add logging configuration for better debugging
```

---

## ✨ Features

✅ Code review with detailed feedback  
✅ Security issue detection  
✅ Code style suggestions  
✅ Codebase statistics and analysis  
✅ PR summary generation  
✅ Staged changes review  
✅ GitHub PR integration  
✅ 65K context window support

---

## 🚀 Next Steps

- [ ] Add test coverage for code review modules
- [ ] Implement result caching
- [ ] Add custom rule configuration
- [ ] Create GitHub Actions integration
- [ ] Add performance metrics tracking
