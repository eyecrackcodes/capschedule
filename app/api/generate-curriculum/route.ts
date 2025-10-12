import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { trainingType, agents, day } = await request.json();
    
    // Check if API key is configured
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Claude API key not configured. Please add CLAUDE_API_KEY to your .env.local file.' },
        { status: 503 }
      );
    }

    // Create a detailed prompt based on training type
    const prompt = generatePrompt(trainingType, agents, day);
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate curriculum. Please check your API key and try again.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const curriculum = data.content[0].text;

    return NextResponse.json({ curriculum });
  } catch (error) {
    console.error('Error generating curriculum:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the curriculum.' },
      { status: 500 }
    );
  }
}

function generatePrompt(trainingType: string, agents: any[], day: string) {
  const agentNames = agents.map(a => a.name).join(', ');
  const avgMetrics = calculateAverageMetrics(agents);
  
  const basePrompt = `You are an expert life insurance sales trainer creating a customized training curriculum.

Training Focus: ${trainingType}
Day: ${day}
Agents in Session: ${agentNames}
Session Duration: 1 hour
Industry: Life Insurance Sales

Agent Performance Metrics:
${JSON.stringify(avgMetrics, null, 2)}

Please create a comprehensive 1-hour training curriculum that includes:

1. **Session Overview** (5 minutes)
   - Welcome and objectives
   - Key performance gaps to address
   - Success metrics for the session

2. **Core Training Content** (40 minutes)
   - Break down into 3-4 modules
   - Include specific techniques and strategies
   - Provide real-world examples and scripts
   - Include role-playing exercises

3. **Practice Activities** (10 minutes)
   - Interactive exercises
   - Peer learning opportunities
   - Specific scenarios based on ${trainingType}

4. **Action Items & Wrap-up** (5 minutes)
   - Key takeaways
   - Individual action items
   - Follow-up expectations

`;

  const specificPrompts = {
    'Close Rate Training': `Focus on:
- Overcoming objections
- Building trust quickly
- Effective closing techniques
- Reading buying signals
- Creating urgency without pressure
- Handling price objections`,
    
    'Annual Premium Training': `Focus on:
- Upselling techniques
- Value demonstration
- Needs analysis skills
- Premium justification strategies
- Building long-term value propositions
- Cross-selling complementary products`,
    
    'Place Rate Training': `Focus on:
- Quote follow-up strategies
- Addressing concerns post-quote
- Building conviction in recommendations
- Simplifying complex products
- Creating implementation urgency
- Handling comparison shopping`,
    
    'Zero CAP Remediation - All Metrics': `Focus on:
- Fundamental sales skills reset
- Confidence building
- Basic product knowledge
- Call flow optimization
- Active listening techniques
- Setting realistic goals`
  };

  return basePrompt + (specificPrompts[trainingType] || '') + `

Format the response in a clear, actionable way that trainers can immediately implement. Include specific talking points, exercises, and timing for each section.`;
}

function calculateAverageMetrics(agents: any[]) {
  const metrics = {
    avgCAP: 0,
    avgCloseRate: 0,
    avgAnnualPremium: 0,
    avgPlaceRate: 0,
    count: agents.length
  };

  agents.forEach(agent => {
    metrics.avgCAP += agent.capScore || 0;
    metrics.avgCloseRate += agent.closeRate || 0;
    metrics.avgAnnualPremium += agent.annualPremium || 0;
    metrics.avgPlaceRate += agent.placeRate || 0;
  });

  // Calculate averages
  if (metrics.count > 0) {
    metrics.avgCAP = Math.round(metrics.avgCAP / metrics.count);
    metrics.avgCloseRate = Math.round((metrics.avgCloseRate / metrics.count) * 10) / 10;
    metrics.avgAnnualPremium = Math.round(metrics.avgAnnualPremium / metrics.count);
    metrics.avgPlaceRate = Math.round((metrics.avgPlaceRate / metrics.count) * 10) / 10;
  }

  return metrics;
}
