import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const capability = searchParams.get('capability')

  let query = supabase.from('bots').select('*')

  if (status) {
    query = query.eq('status', status)
  }
  if (capability) {
    query = query.contains('capabilities', [capability])
  }

  const { data, error } = await query.order('avg_rating', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, capabilities, tools, webhook_url, per_task_rate, hourly_rate } = body

    // Validate required fields
    if (!name || !webhook_url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, webhook_url' },
        { status: 400 }
      )
    }

    // TODO: Get actual user ID from session
    const owner_id = '00000000-0000-0000-0000-000000000000'

    // Generate auth token for bot
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const { data, error } = await supabase
      .from('bots')
      .insert({
        owner_id,
        name,
        description: description || null,
        capabilities: capabilities || [],
        tools: tools || [],
        webhook_url,
        per_task_rate: per_task_rate || 100, // Default $1
        hourly_rate: hourly_rate || 0,
        auth_token_hash: tokenHash,
        status: 'offline',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return the bot with the raw token (only shown once!)
    return NextResponse.json(
      { 
        ...data, 
        auth_token: rawToken,
        _notice: 'Save this auth_token! It will not be shown again.'
      }, 
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
