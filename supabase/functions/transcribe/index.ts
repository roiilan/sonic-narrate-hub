import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscribeRequest {
  audioData: string
  fileName: string
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

    const { audioData, fileName }: TranscribeRequest = await req.json()

    if (!audioData || !fileName) {
      throw new Error('Missing audio data or file name')
    }

    console.log(`Processing transcription for user ${user.id}, file: ${fileName}`)

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

    // Check if user has enough tokens (1 token per transcription)
    const tokensRequired = 1
    if (profile.tokens < tokensRequired) {
      return new Response(
        JSON.stringify({ 
          code: 2,
          description: "You don't have enough tokens.",
          tokens: profile.tokens
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Convert base64 to blob for processing
    const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
    
    // Create FormData for the transcription service
    const formData = new FormData()
    const audioBlob = new Blob([audioBytes], { type: 'audio/wav' })
    formData.append('audio', audioBlob, fileName)

    // Call transcription service (assuming localhost:5000)
    const transcribeResponse = await fetch('http://localhost:5000/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!transcribeResponse.ok) {
      throw new Error('Transcription service failed')
    }

    const transcriptionResult = await transcribeResponse.json()

    // Deduct tokens after successful transcription
    const newTokenBalance = profile.tokens - tokensRequired
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ tokens: newTokenBalance })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating tokens:', updateError)
      throw new Error('Failed to deduct tokens')
    }

    console.log(`Successfully processed transcription. New token balance: ${newTokenBalance}`)

    return new Response(
      JSON.stringify({ 
        code: 1,
        description: "Your audio is ready.",
        tokens: newTokenBalance,
        transcript: transcriptionResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in transcribe function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})