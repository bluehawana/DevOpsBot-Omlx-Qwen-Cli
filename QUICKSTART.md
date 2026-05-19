# DevOpsBot CLI - Quick Start Guide

## 🚀 Setup (One-time)

### 1. Install Dependencies
```bash
cd /Users/harvad/Projects/DevOpsBot
npm install
```

### 2. Ensure oMLX is Running
```bash
# Check if oMLX is running on port 8000
lsof -i :8000

# If not running, start it
/Applications/oMLX.app/Contents/MacOS/omlx-cli serve \
  --base-path /Users/harvad/.omlx \
  --port 8000 &
```

### 3. Verify Setup
```bash
node src/cli.js status
node src/cli.js list-models
```

---

## 📖 Usage Examples

### Review Code Files
```bash
# Review specific files
node src/cli.js review src/config.js

# Review multiple files
node src/cli.js review src/cli.js src/reviewer.js

# Review current changes
node src/cli.js review
```

### Analyze Codebase
```bash
# Analyze entire src directory
node src/cli.js analyze src/

# Analyze current directory
node src/cli.js analyze
```

### Generate PR Summary
```bash
# Create a summary of current changes
node src/cli.js summary
```

### Review Staged Changes
```bash
# Review files staged for commit
node src/cli.js review:staged
```

### Review GitHub PR
```bash
# Review PR #123 (requires gh CLI)
node src/cli.js review:github 123
```

---

## 🎯 Real-world Workflow

### Scenario: Review before committing

```bash
# 1. Make changes to your code
# ... edit files ...

# 2. Review staged changes
node src/cli.js review:staged

# 3. If good, commit
git commit -m "Add feature X"

# 4. Generate PR summary
node src/cli.js summary
```

### Scenario: Audit entire project

```bash
# 1. Analyze the codebase
node src/cli.js analyze src/

# 2. Review critical files
node src/cli.js review src/cli.js

# 3. Fix issues and re-analyze
# ... make fixes ...
node src/cli.js analyze src/
```

---

## 🔧 Configuration

### Edit Config (`.devopsbot/config.yaml`)

```yaml
omlx:
  host: http://localhost:8000
  model: Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated-mlx-8bit
  apiKey: omlx-a4qtcnh7r8e9p8vt

github:
  repo: git@github.com:volvo-group/devopsbot-config.git
  skillsRepo: git@github.com:volvo-group/devopsbot-skills.git

macStudios:
  - name: Mac Studio 1
    host: ip1
    user: harvad
    port: 22
  - name: Mac Studio 2
    host: ip2
    user: harvad
    port: 22
```

---

## 📊 Example Output

### Code Review
```
═══ Code Review ═══

  Well-structured configuration loader with sensible defaults
  Config module with YAML serialization and deep merge support

  Score: 7/10

  Bugs:
    ⛔ mergeDeep treats arrays incorrectly
    ⛔ Missing null handling in merge logic

  Suggestions:
    💡 Add error handling for disk operations
    💡 Add JSDoc comments for IDE support
    
  Security:
    ⚠️  No validation of YAML input values
```

### Codebase Analysis
```
═══ Codebase Analysis ═══

  Files: 9  Lines: 1112
  Avg size: 124 lines  Largest: cli.js (358 lines)

  File types:
    .js: 9

  Issues: 7 found
  Recommendations: 7 suggestions
```

---

## 🐛 Troubleshooting

### "Unable to connect to API"
- Check oMLX is running: `lsof -i :8000`
- Start oMLX: `/Applications/oMLX.app/Contents/MacOS/omlx-cli serve --base-path /Users/harvad/.omlx --port 8000 &`

### "analyzeCode is not a function"
- This was fixed. Run `npm install` to ensure latest code.

### "Context window exceeded"
- oMLX is configured for 65K context window
- For very large codebases, analyze subdirectories instead

### "No files to review"
- Make sure you have uncommitted changes or pass file paths
- Check: `git status`

---

## 🎓 Features

✨ **Code Review**
- Detects bugs and security issues
- Style and naming suggestions
- Code complexity analysis
- Severity classification

✨ **Codebase Analysis**
- File statistics and metrics
- Pattern detection
- Architecture insights
- Actionable recommendations

✨ **Integration Ready**
- GitHub PR review support
- Staged changes review
- Git diff parsing
- Multiple file formats

---

## 📚 Next Steps

1. Set up GitHub Actions to auto-review PRs
2. Configure custom review rules
3. Add result caching for faster reviews
4. Integrate with CI/CD pipeline
5. Create team-specific analysis templates

---

**Happy reviewing!** 🚀
