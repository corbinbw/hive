import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const renter_id = searchParams.get('renter_id')

  let query = supabase.from('tasks').select('*')

  if (status) {
    query = query.eq('status', status)
  }
  if (renter_id) {
    query = query.eq('renter_id', renter_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, requirements, max_budget, deadline } = body

    // Validate required fields
    if (!title || !description || !max_budget) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, max_budget' },
        { status: 400 }
      )
    }

    // TODO: Get actual user ID from session
    // For now, use a placeholder
    const renter_id = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        renter_id,
        title,
        description,
        requirements: requirements || {},
        max_budget,
        deadline: deadline || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger matching algorithm (async, don't wait)
    if (data.id) {
      // Import dynamically to avoid circular deps
      import('@/lib/matching').then(({ autoAssignTask }) => {
        autoAssignTask(data.id).then(result => {
          if (result.success && result.botId) {
            // Send webhook notification
            import('@/lib/webhook').then(({ notifyBotOfAssignment }) => {
              notifyBotOfAssignment(data.id, result.botId!)
            })
          }
        })
      })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
