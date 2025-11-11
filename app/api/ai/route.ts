import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function POST(request: NextRequest) {
  if (!openai) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'agent-insights': {
        const { agent } = data;
        const prompt = `
          As a life insurance training coach, analyze this agent's performance:
          - Name: ${agent.name}
          - Adjusted CAP Score: ${agent.adjustedCAPScore}
          - Original CAP Score: ${agent.capScore}
          - Lead Attainment: ${agent.leadAttainment}%
          - Close Rate: ${agent.closeRate}%
          - Annual Premium: $${agent.annualPremium}
          - Place Rate: ${agent.placeRate}%
          - Leads Per Day: ${agent.leadsPerDay}
          - Location: ${agent.location}
          - Tier: ${agent.tier}

          Provide:
          1. 2-3 key strengths
          2. 2-3 areas for improvement
          3. 3 personalized actionable tips
          4. One priority focus area

          Format as JSON with keys: strengths, areasForImprovement, personalizedTips, priorityFocus
        `;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 500,
        });

        const content = response.choices[0].message.content;
        if (!content) {
          return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
        }

        const parsed = JSON.parse(content);
        return NextResponse.json({
          agentName: agent.name,
          ...parsed
        });
      }

      case 'schedule-optimization': {
        const { schedule, stats } = data;
        const sessionCount = schedule.reduce((acc: number, day: any) => acc + day.sessions.length, 0);
        const agentCount = schedule.reduce((acc: number, day: any) => 
          acc + day.sessions.reduce((sessAcc: number, session: any) => sessAcc + session.agents.length, 0), 0
        );

        const prompt = `
          Analyze this training schedule and suggest optimizations:
          - Total sessions: ${sessionCount}
          - Total agents scheduled: ${agentCount}
          - Days: ${schedule.map((d: any) => d.day).join(', ')}
          - Average adjusted CAP score: ${stats.avgAdjustedCAPScore}
          - Agents needing training: ${stats.needsTraining}% of eligible

          Sessions distribution:
          ${schedule.map((day: any) => 
            `${day.day}: ${day.sessions.length} sessions, ${
              day.sessions.reduce((acc: number, s: any) => acc + s.agents.length, 0)
            } agents`
          ).join('\n')}

          Provide 3-5 optimization suggestions focusing on:
          - Session timing efficiency
          - Agent grouping strategies
          - Resource utilization
          - Training effectiveness

          Format as JSON with key "suggestions" containing array of objects with: suggestion, reason, impact (high/medium/low)
        `;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 600,
        });

        const content = response.choices[0].message.content;
        if (!content) {
          return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
        }

        const parsed = JSON.parse(content);
        return NextResponse.json(parsed.suggestions || []);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid request type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
