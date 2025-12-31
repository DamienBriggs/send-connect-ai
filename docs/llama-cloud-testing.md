# Testing Llama Cloud Integration

## Setup Steps

### 1. Set up secrets (before starting sandbox)

```bash
# Set your Llama Cloud API key
npx ampx sandbox secret set LLAMA_CLOUD_API_KEY

# When prompted, paste your key (from .env or Llama Cloud dashboard)

# Set your organization ID
npx ampx sandbox secret set LLAMA_CLOUD_ORGANIZATION_ID

# When prompted, paste your organization ID (from Llama Cloud dashboard)
```

### 2. Start sandbox

```bash
npx ampx sandbox
```

Wait for deployment to complete.

### 3. Test the query function

From your frontend or using the Amplify console, call the `testQueryLlamaCloud` mutation:

```typescript
const result = await client.mutations.testQueryLlamaCloud({
  query: "What are the rules for extra time?",
  pipelineId: "YOUR_PIPELINE_ID_HERE"
});

console.log(JSON.parse(result.data));
```

## What to Look For in the Response

The test function will return a detailed JSON response showing:

1. **Response Structure** - What fields Llama Cloud returns
2. **Node Count** - How many relevant chunks were retrieved
3. **Sample Node** - The first result, showing:
   - `text`: The actual content
   - `score`: Relevance score
   - `metadata`: **CRITICAL** - Does this include page numbers from your JSON?
4. **Full Response** - Complete API response for analysis

## Key Questions to Answer

From the test results, we need to determine:

- ✅ Does `metadata` include `page` numbers?
- ✅ Does it include document structure (headings, sections)?
- ✅ Can we build accurate citations from the returned data?
- ✅ What's the format of the retrieved text?

## Example Test Queries

Try these to understand different scenarios:

1. **Specific rule**: "What are the rules for extra time?"
2. **General topic**: "Tell me about access arrangements"
3. **Edge case**: "Python programming" (should return nothing relevant)

## Next Steps

Once we see what the response contains:
1. Design the citation format
2. Decide if we need to re-upload with better metadata
3. Build the actual indexing Lambda
4. Implement the query function for end users
