import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tutxgwdghxteglspyavx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wG7jIV-mrds6gY7VFPoT0Q_eaRc2JOC'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
