import { NextRequest, NextResponse } from "next/server";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    message: "Generate curriculum API is available",
    method: "POST",
    requiredFields: ["trainingType", "agents", "day"],
    apiKeyConfigured: !!process.env.CLAUDE_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  console.log("API Route called: /api/generate-curriculum");

  // Test if the route is being hit at all
  if (!request.body) {
    return NextResponse.json(
      { error: "No request body received" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    const { trainingType, agents, day } = body;
    
    // Quick test response
    if (!trainingType || !agents || !day) {
      return NextResponse.json(
        { 
          error: "Missing required fields",
          received: { trainingType, agentsCount: agents?.length, day }
        },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Claude API key not configured. To enable AI curriculum generation:\n\n" +
            "1. Create a file named '.env.local' in your project root\n" +
            "2. Add: CLAUDE_API_KEY=your-api-key-here\n" +
            "3. Get your API key from: https://console.anthropic.com\n" +
            "4. Restart your development server\n\n" +
            "See CLAUDE_API_SETUP.md for detailed instructions.",
        },
        { status: 503 }
      );
    }

    // Create a detailed prompt based on training type
    const prompt = generatePrompt(trainingType, agents, day);

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-3-sonnet-20240229",
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return NextResponse.json(
        {
          error:
            "Failed to generate curriculum. Please check your API key and try again.",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Ensure we have a valid response
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error("Invalid Claude API response:", data);
      throw new Error("Invalid response from Claude API");
    }
    
    const curriculum = data.content[0].text;

    return NextResponse.json({ curriculum }, { status: 200 });
  } catch (error) {
    console.error("Error in generate-curriculum API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "An error occurred while generating the curriculum.",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generatePrompt(trainingType: string, agents: any[], day: string) {
  const agentNames = agents.map((a) => a.name).join(", ");
  const avgMetrics = calculateAverageMetrics(agents);

  const basePrompt = `You are an expert life insurance sales trainer creating a customized training curriculum for call center agents.

CRITICAL CONTEXT - Life Insurance Call Center Operations:
- Agents handle inbound leads with immediate purchase intent
- Success measured by: Close Rate (conversion), Average Annual Premium (AAP), and Place Rate (first payment capture)
- Compliance is MANDATORY - all payment attempts require identity verification, disclosures, and checklist completion
- Common objections: price sensitivity, fixed income constraints, desire to "shop around"
- Key value propositions: immediate day-one coverage, no waiting periods, budget flexibility

Training Focus: ${trainingType}
Day: ${day}
Agents in Session: ${agentNames}
Session Duration: 1 hour
Industry: Life Insurance Sales Call Center

Agent Performance Metrics:
${JSON.stringify(avgMetrics, null, 2)}

CURRICULUM REQUIREMENTS:
Create a practical, immediately actionable 1-hour training session incorporating these proven techniques:

1. **Session Overview & Warm-up** (5 minutes)
   - Quick win shares from previous week
   - Today's specific metric focus and why it matters
   - Individual baseline metrics review
   - Compliance checkpoint reminder

2. **Core Training Modules** (40 minutes total - divide into 3-4 focused segments)
   
   Module Structure Requirements:
   - Each module must include EXACT scripts (15-30 seconds each)
   - Real call examples with timestamps where applicable
   - Common failure points and recovery strategies
   - Measurable micro-behaviors to track

   Essential Elements to Include:
   - Early budget calibration techniques (first 90 seconds of call)
   - Value anchoring and daily/weekly cost reframing
   - Objection handling with specific rebuttals
   - Compliance-to-payment flow (verbal yes → payment capture)
   - Talk-time ratio optimization

3. **Live Practice & Role-Play** (10 minutes)
   - Paired practice with specific scenarios
   - Focus on most common objections for this metric
   - Recorded practice for self-review
   - Peer feedback using checklist

4. **Action Planning & Accountability** (5 minutes)
   - Individual commitment to 1-2 specific techniques
   - Schedule follow-up coaching touchpoint
   - Metric tracking assignment
   - Compliance certification if needed

CRITICAL SAFETY RULES:
- Never teach payment capture without compliance training
- All scripts must include required disclosures
- Emphasize: no shortcuts on identity verification
- For agents with compliance rating 0: mandatory remediation before any sales training

Include specific examples like:
- "If we can get this to $X/month, would you be comfortable starting today?"
- "That's about $2.80/week for day-one $10,000 coverage"
- "What specifically would you be comparing if you shop around?"

`;

  const specificPrompts: Record<string, string> = {
    "Close Rate Training": `CLOSE RATE FOCUS - Converting Interest to Commitment:

Key Failure Points from Real Calls:
- Waiting too long to ask budget questions (causes sticker shock)
- Long monologues about product features instead of trial closes
- Not handling "I need to shop around" effectively
- Missing the transition from interest to commitment

Required Modules:
1. RAPID QUALIFICATION (First 90 seconds)
   - Script: "On a monthly basis, what's the absolute max you can comfortably pay for coverage?"
   - Practice: Role-play using trigger phrase "With all my other bills, it's tough right now"
   - Measure: % of calls with budget question in first 90 seconds

2. TRIAL CLOSE TECHNIQUES
   - Script: "If we can get this to $[X]/month, would you be comfortable starting today?"
   - Practice: 5 different trial close variations
   - Measure: Number of trial closes per call

3. SHOP-AROUND OBJECTION HANDLING
   - Script: "What specifically would you be comparing? Price, coverage, or waiting period?"
   - Follow-up: "If I can show you exactly what to compare, would that help you decide today?"
   - Measure: % of shop-around objections converted to next steps

4. MICRO-COMMITMENTS
   - Build agreement ladder: coverage need → budget → timeline → payment method
   - Practice: Getting 4-5 small "yes" responses before asking for the sale
   - Measure: Commitment-to-close ratio`,

    "Annual Premium Training": `AVERAGE ANNUAL PREMIUM (AAP) FOCUS - Maximizing Policy Value:

Key Opportunity Areas:
- Agents often present mid-tier options first (missing anchor effect)
- Not using daily/weekly cost reframing
- Failing to connect higher premiums to specific life events/needs

Required Modules:
1. VALUE ANCHORING TECHNIQUE
   - Always show $30k-50k option first (even if unlikely to close)
   - Script: "Let me show you our most popular comprehensive coverage at $50k, then we can adjust"
   - Reframe: "The difference between $10k and $25k coverage is just $1.20 per day"
   - Measure: % of calls using anchor technique

2. NEEDS AMPLIFICATION
   - Probe for specific expenses: "What would your family need to cover? Mortgage? Kids' education?"
   - Calculate real costs: "You mentioned a $1,500 mortgage - that's 18 months of payments with $25k"
   - Measure: Average policy size when needs questions asked vs not asked

3. PREMIUM JUSTIFICATION SCRIPTS
   - "For less than your daily coffee, you're protecting your family's entire future"
   - "The extra $15/month means your family keeps the house if something happens"
   - Practice: Converting premium differences to tangible benefits
   - Measure: Upsell success rate

4. DOWNSELL PREVENTION
   - When client objects to price, don't immediately drop to lowest option
   - Script: "Before we look at less coverage, what specifically concerns you about $X/month?"
   - Find middle ground: "What if we could do $20k for just $12 more than the basic?"`,

    "Place Rate Training": `PLACE RATE FOCUS - First Payment Capture Excellence:

Critical Gap: Many agents get verbal agreement but fail to collect payment

Required Modules:
1. COMPLIANCE-TO-PAYMENT FLOW (MANDATORY)
   - Checklist: ID verification → Disclosure reading → Payment authorization → Confirmation
   - Script: "Great! To get your coverage started today, I need to verify a few things..."
   - NEVER skip steps - compliance rating 0 = immediate remediation
   - Measure: Compliance checklist completion rate

2. SEAMLESS TRANSITION SCRIPTS
   - From agreement: "Excellent choice! Let me get this set up right now..."
   - Payment ask: "Would you prefer to use a debit or credit card for the monthly payment?"
   - Don't pause between agreement and payment - maintain momentum
   - Measure: Time from verbal yes to payment attempt

3. PAYMENT OBJECTION HANDLING
   - "I need to check with spouse": "Of course! Can we set it up pending their approval?"
   - "I don't have my card": "No problem! Can you grab it? I'll hold while you get it"
   - "Can I call back?": "We can, but you'd lose today's approval. Takes 2 minutes now"
   - Measure: Payment deferral recovery rate

4. CONFIRMATION & LOCK-IN
   - Read back: amount, coverage, start date
   - Get verbal confirmation after each point
   - Email/text policy details immediately
   - Script: "You're all set! Coverage starts today at 12:01 AM"`,

    "Zero CAP Remediation - All Metrics": `ZERO CAP INTENSIVE - Complete Skills Rebuild:

Critical Focus: These agents need fundamental skills before advanced techniques

Required Modules:
1. BASIC CALL CONTROL
   - Proper greeting and rapport building (30 seconds max)
   - Active listening markers: "I hear you saying..." "So if I understand correctly..."
   - Talk time goal: Agent 40%, Client 60%
   - Practice: Record and review talk-time ratios

2. PRODUCT KNOWLEDGE ESSENTIALS
   - 3 key benefits memorized perfectly
   - Price points for 5k, 10k, 25k policies
   - Waiting period explanation in 15 seconds
   - No jargon - 6th grade language level

3. SIMPLE OBJECTION RESPONSES
   - Price: "What monthly amount would work for your budget?"
   - Spouse: "Should we include them on this call?"
   - Think about it: "What questions can I answer to help you decide?"
   - One rebuttal maximum - don't argue

4. BASIC CLOSE ATTEMPT
   - One simple close per call minimum
   - Script: "This fits your budget at $X. Shall we get it started?"
   - If no: "What would need to change for this to work?"
   - Set specific follow-up: day, time, and reason

MANDATORY: Complete compliance certification before any live calls`,
  };

  return (
    basePrompt +
    (specificPrompts[trainingType] || "") +
    `

Format the response in a clear, actionable way that trainers can immediately implement. Include specific talking points, exercises, and timing for each section.`
  );
}

function calculateAverageMetrics(agents: any[]) {
  const metrics = {
    avgCAP: 0,
    avgCloseRate: 0,
    avgAnnualPremium: 0,
    avgPlaceRate: 0,
    count: agents.length,
  };

  agents.forEach((agent) => {
    metrics.avgCAP += agent.capScore || 0;
    metrics.avgCloseRate += agent.closeRate || 0;
    metrics.avgAnnualPremium += agent.annualPremium || 0;
    metrics.avgPlaceRate += agent.placeRate || 0;
  });

  // Calculate averages
  if (metrics.count > 0) {
    metrics.avgCAP = Math.round(metrics.avgCAP / metrics.count);
    metrics.avgCloseRate =
      Math.round((metrics.avgCloseRate / metrics.count) * 10) / 10;
    metrics.avgAnnualPremium = Math.round(
      metrics.avgAnnualPremium / metrics.count
    );
    metrics.avgPlaceRate =
      Math.round((metrics.avgPlaceRate / metrics.count) * 10) / 10;
  }

  return metrics;
}
