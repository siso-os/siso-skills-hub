# X/Twitter Search — Definition of Done

## Success Criteria

1. Identify key discussions/threads
2. Note notable handles/accounts
3. Capture community sentiment
4. Include relevant URLs

## Output Format

```json
{
  "query": "search terms",
  "discussions": [
    {
      "handle": "@username",
      "content": "...",
      "engagement": "likes/retweets"
    }
  ],
  "sentiment": "positive/negative/mixed",
  "sources": ["url1", "url2"]
}
```
