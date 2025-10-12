# Claude API Setup Guide for Training Curriculum Generator

## Overview

The CAP Training Schedule Generator includes an optional AI-powered curriculum generator that uses Claude API to create customized training content based on the day's focus and the specific agents in each session.

## Setup Instructions

### 1. Get Your Claude API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in to your Anthropic account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-ant-api...`)

### 2. Configure Your Local Environment

1. Create a `.env.local` file in your project root:

   ```bash
   touch .env.local
   ```

2. Add your Claude API key to the file:

   ```
   CLAUDE_API_KEY=sk-ant-api-YOUR-KEY-HERE
   ```

3. (Optional) Specify a different Claude model:
   ```
   CLAUDE_MODEL=claude-3-opus-20240229
   ```
   Available models:
   - `claude-3-opus-20240229` (most capable, higher cost)
   - `claude-3-sonnet-20240229` (balanced, default)
   - `claude-3-haiku-20240307` (fastest, lower cost)

### 3. Restart Your Development Server

After adding the environment variables, restart your Next.js development server:

```bash
npm run dev
# or
yarn dev
```

## How to Use the Curriculum Generator

1. **Navigate to the Schedule**: Open your training schedule in the application

2. **Expand a Session**: Click on any training session scheduled for Tuesday, Wednesday, or Thursday

3. **Generate Curriculum**: Click the "Generate Curriculum" button that appears at the bottom of the expanded session

4. **Review Content**: The AI will generate a customized 1-hour curriculum including:

   - Session overview and objectives
   - Core training modules
   - Practice activities
   - Action items and follow-up

5. **Export Options**:
   - **Copy**: Copy the curriculum to clipboard
   - **Download**: Save as a text file
   - **Generate New**: Create a different version

## What the AI Considers

The curriculum generator takes into account:

- **Training Type**: Close Rate, Annual Premium, or Place Rate
- **Agent Metrics**: Average performance metrics of agents in the session
- **Day of Week**: Ensures content aligns with the weekly training focus
- **Session Duration**: Optimized for 1-hour training blocks

## Cost Considerations

- Each curriculum generation uses approximately 4,000-5,000 tokens
- With Claude 3 Sonnet: ~$0.015-0.020 per curriculum
- With Claude 3 Haiku: ~$0.001-0.002 per curriculum
- Monitor your usage at [console.anthropic.com](https://console.anthropic.com)

## Troubleshooting

### "Claude API key not configured"

- Ensure `.env.local` file exists in your project root
- Verify the API key is correctly formatted
- Restart your development server

### "Failed to generate curriculum"

- Check your API key is valid and has credits
- Verify your internet connection
- Check the browser console for detailed error messages

### Curriculum not appearing

- Ensure you're viewing a Tuesday, Wednesday, or Thursday session
- Expand the session details before clicking generate
- Check that the session has agents assigned

## Security Notes

- **Never commit `.env.local`** to version control
- The API key is only used server-side
- Each trainer can use their own API key if desired
- Consider implementing usage limits for production

## Feature Capabilities

The curriculum generator can create:

- **Close Rate Training** (Tuesday):

  - Objection handling techniques
  - Trust-building exercises
  - Closing scripts and role-plays

- **Annual Premium Training** (Wednesday):

  - Upselling strategies
  - Value demonstration techniques
  - Needs analysis frameworks

- **Place Rate Training** (Thursday):
  - Follow-up best practices
  - Quote-to-placement conversion tactics
  - Addressing post-quote concerns

## Future Enhancements

Potential improvements to consider:

- Save generated curricula to a database
- Track which curricula were most effective
- Allow trainers to provide feedback
- Generate progress tracking materials
- Create session-specific handouts

---

For questions or issues with the AI curriculum generator, please contact your system administrator or refer to the [Anthropic documentation](https://docs.anthropic.com).
