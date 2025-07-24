import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeductTokensRequest {
  tokensToDeduct: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { tokensToDeduct }: DeductTokensRequest = await req.json()

    if (!tokensToDeduct || tokensToDeduct <= 0) {
      throw new Error('Invalid token amount')
    }

    console.log(`Deducting ${tokensToDeduct} tokens for user ${user.id}`)

    // Get current token balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    if (profile.tokens < tokensToDeduct) {
      throw new Error('Insufficient tokens')
    }

    // Deduct tokens using service role key (bypasses RLS)
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ tokens: profile.tokens - tokensToDeduct })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating tokens:', updateError)
      throw new Error('Failed to deduct tokens')
    }

    console.log(`Successfully deducted ${tokensToDeduct} tokens. New balance: ${profile.tokens - tokensToDeduct}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        newTokenBalance: profile.tokens - tokensToDeduct 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in deduct-tokens function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})