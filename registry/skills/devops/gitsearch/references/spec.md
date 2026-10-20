# GitHub Search — Definition of Done

## Success Criteria

1. Return 5-10 relevant results
2. Each result includes: repo name, URL, star count, description
3. Relevance assessment to the original query
4. Any relevant code snippets or examples found

## Output Format

```json
{
  "query": "search terms",
  "results": [
    {
      "repo": "owner/repo",
      "url": "https://github.com/owner/repo",
      "stars": 1234,
      "description": "...",
      "relevance": "high/medium/low"
    }
  ]
}
```
