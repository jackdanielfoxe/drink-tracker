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

// --- Resolve the roster row for the signed-in Google user ---
// Matches on auth_id first, then falls back to a case-insensitive email
// match. If matched by email but not yet linked, attaches their auth_id so
// future logins resolve instantly. Returns the users row or null.
export async function findRosterUser(authId, email) {
  // 1. Already linked by auth_id?
  if (authId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('auth_id', authId)
      .maybeSingle()
    if (error) throw error
    if (data) return data
  }

  // 2. Pre-set email match? Emails are stored lowercased, so compare lowercased.
  if (email) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, auth_id')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    if (error) throw error
    if (data) {
      if (!data.auth_id && authId) {
        await supabase
          .from('users')
          .update({ auth_id: authId })
          .eq('id', data.id)
          .is('auth_id', null)
      }
      return { id: data.id, name: data.name }
    }
  }

  return null
}

// --- Names still available to claim (no auth_id yet) ---
export async function getUnclaimedUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .is('auth_id', null)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

// --- Claim a roster row as the signed-in user ---
export async function claimRosterUser(userId, authId, email) {
  if (!userId || !authId) throw new Error('Missing claim details.')

  const { data, error } = await supabase
    .from('users')
    .update({ auth_id: authId, email: email ? email.toLowerCase() : null })
    .eq('id', userId)
    .is('auth_id', null) // guard: never overwrite an already-claimed row
    .select('id, name')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw new Error('That name was just taken. Pick another.')
    }
    throw error
  }
  if (!data) throw new Error('That name was just claimed by someone else.')
  return data
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

  // Create session row
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ user_id: userId, session_date: date })
    .select('id')
    .single()

  if (sessionError) {
    if (sessionError.code === '23505') {
      throw new Error("You've already logged a session for this date.")
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

// --- Drink breakdown for a single user ---
export async function getUserDrinkBreakdown(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      session_drinks ( drink_type_id, quantity, drink_types ( name, units ) )
    `)
    .eq('user_id', userId)

  if (error) throw error

  const totals = {}
  for (const session of data ?? []) {
    for (const sd of session.session_drinks ?? []) {
      const id = sd?.drink_type_id
      if (id == null) continue
      const qty = Number(sd.quantity) || 0
      const units = Number(sd.drink_types?.units) || 0
      if (!totals[id]) {
        totals[id] = { drinkTypeId: id, name: sd.drink_types?.name ?? 'Unknown', totalQuantity: 0, totalUnits: 0 }
      }
      totals[id].totalQuantity += qty
      totals[id].totalUnits += qty * units
    }
  }

  return Object.values(totals)
    .map((d) => ({ ...d, totalUnits: Math.round(d.totalUnits * 10) / 10 }))
    .sort((a, b) => b.totalUnits - a.totalUnits)
}

// --- Leaderboard: fetch + aggregate ---
export async function getLeaderboard() {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      user_id,
      users ( name ),
      session_drinks ( drink_type_id, quantity, drink_types ( name, units ) )
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
        totalUnits: 0,
        drinkCounts: {},
      }
    }

    stats[uid].totalSessions += 1

    for (const sd of session.session_drinks ?? []) {
      const qty = Number(sd?.quantity) || 0
      const units = Number(sd?.drink_types?.units) || 0
      stats[uid].totalDrinks += qty
      stats[uid].totalUnits += qty * units
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
      totalUnits: Math.round(s.totalUnits * 10) / 10,
      topDrink: topDrink || '—',
    }
  })

  leaderboard.sort((a, b) => b.totalUnits - a.totalUnits)

  return leaderboard.map((row, i) => ({ ...row, rank: i + 1 }))
}
