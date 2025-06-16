import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ehqhusqrxdukaynosenb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocWh1c3FyeGR1a2F5bm9zZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTE3NTQsImV4cCI6MjA2NTE2Nzc1NH0.PdzBnhj_jo_6tPihdIlu-lfWGU11TZP0gZD8S7f4nyY'

export const supabase = createClient(supabaseUrl, supabaseKey)
