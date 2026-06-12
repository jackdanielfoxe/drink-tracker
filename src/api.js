import { supabase } from './supabaseClient'

// --- Fetch all users from the database ---
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

// --- Check for existing submission ---
export async function getExistingSession(userId, date) {
  if (!userId || !date) return null

  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('session_date', date)
    .maybeSingle()

  if (error) throw error
  return data // null if none exists
}

// --- Create session + drink rows ---
export async function submitSession(userId, date, drinkQuantities) {
  if (!userId) throw new Error('Please select who you are.')
  if (!date) throw new Error('Please select a date.')

  const rows = Object.entries(drinkQuantities ?? {})
    .filter(([, qty]) => Number(qty) > 0)
    .map(([drinkTypeId, qty]) => ({
      drink_type_id: Number(drinkTypeId),
      quantity: Number(qty),
    }))

  if (rows.length === 0) {
    throw new Error('Add at least one drink before submitting.')
  }

  // App-level duplicate check (fast feedback)
  const existing = await getExistingSession(userId, date)
  if (existing) {
    throw new Error('A session already exists for this user and date.')
  }

  // Create session row
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ user_id: userId, session_date: date })
    .select('id')
    .single()

  if (sessionError) {
    // Postgres unique violation -> duplicate session (handles race conditions)
    if (sessionError.code === '23505') {
      throw new Error('A session already exists for this user and date.')
    }
    throw sessionError
  }

  if (!session?.id) {
    throw new Error('Could not create session. Please try again.')
  }

  // Insert drink rows for this session
  const { error: rowsError } = await supabase
    .from('session_drinks')
    .insert(rows.map((r) => ({ ...r, session_id: session.id })))

  if (rowsError) {
    // Roll back the session if drink rows fail, so we don't leave an
    // empty session that blocks future submissions for this date.
    await supabase.from('sessions').delete().eq('id', session.id)
    throw rowsError
  }

  return session.id
}

// --- Fetch a single user's sessions, with their drinks ---
export async function getUserSessions(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      session_date,
      session_drinks ( id, drink_type_id, quantity, drink_types ( name ) )
    `)
    .eq('user_id', userId)
    .order('session_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

// --- Update an existing session's drinks (replace all rows) ---
export async function updateSessionDrinks(sessionId, drinkQuantities) {
  if (!sessionId) throw new Error('Missing session id.')

  const rows = Object.entries(drinkQuantities ?? {})
    .filter(([, qty]) => Number(qty) > 0)
    .map(([drinkTypeId, qty]) => ({
      session_id: sessionId,
      drink_type_id: Number(drinkTypeId),
      quantity: Number(qty),
    }))

  if (rows.length === 0) {
    throw new Error('Add at least one drink before saving.')
  }

  // Remove existing drink rows for this session, then insert the new set.
  const { error: deleteError } = await supabase
    .from('session_drinks')
    .delete()
    .eq('session_id', sessionId)

  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from('session_drinks')
    .insert(rows)

  if (insertError) throw insertError
}

// --- Delete a session entirely (cascades to its drink rows) ---
export async function deleteSession(sessionId) {
  if (!sessionId) throw new Error('Missing session id.')

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

// --- Leaderboard: fetch + aggregate ---
export async function getLeaderboard() {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      user_id,
      users ( name ),
      session_drinks ( drink_type_id, quantity, drink_types ( name ) )
    `)

  if (error) throw error

  const stats = {}

  for (const session of sessions ?? []) {
    const uid = session?.user_id
    if (!uid) continue

    if (!stats[uid]) {
      stats[uid] = {
        userId: uid,
        name: session.users?.name ?? 'Unknown',
        totalSessions: 0,
        totalDrinks: 0,
        drinkCounts: {},
      }
    }

    stats[uid].totalSessions += 1

    for (const sd of session.session_drinks ?? []) {
      const qty = Number(sd?.quantity) || 0
      stats[uid].totalDrinks += qty
      const drinkName = sd?.drink_types?.name ?? 'Unknown'
      stats[uid].drinkCounts[drinkName] =
        (stats[uid].drinkCounts[drinkName] || 0) + qty
    }
  }

  const leaderboard = Object.values(stats).map((s) => {
    let topDrink = null
    let topCount = 0
    for (const [name, count] of Object.entries(s.drinkCounts)) {
      if (count > topCount) {
        topCount = count
        topDrink = name
      }
    }
    return {
      userId: s.userId,
      name: s.name,
      totalSessions: s.totalSessions,
      totalDrinks: s.totalDrinks,
      topDrink: topDrink || '—',
    }
  })

  leaderboard.sort((a, b) => b.totalDrinks - a.totalDrinks)

  return leaderboard.map((row, i) => ({ ...row, rank: i + 1 }))
}
