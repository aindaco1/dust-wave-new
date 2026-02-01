export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [env.ALLOWED_ORIGIN, 'http://localhost:8080', 'http://localhost:3000'];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : env.ALLOWED_ORIGIN;
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const { email } = await request.json();

      if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ error: 'Valid email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // First, get the audience ID by name if needed
      let audienceId = env.RESEND_AUDIENCE_ID;
      
      // If it's not a UUID, look it up by name
      if (!audienceId.includes('-')) {
        const audiencesRes = await fetch('https://api.resend.com/audiences', {
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
        });
        
        if (!audiencesRes.ok) {
          throw new Error('Failed to fetch audiences');
        }
        
        const { data: audiences } = await audiencesRes.json();
        const audience = audiences.find(a => a.name.toLowerCase() === audienceId.toLowerCase());
        
        if (!audience) {
          throw new Error(`Audience "${audienceId}" not found`);
        }
        
        audienceId = audience.id;
      }

      // Add contact to audience
      const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        // Handle already subscribed case gracefully
        if (res.status === 409 || errorData.message?.includes('already exists')) {
          return new Response(JSON.stringify({ success: true, message: "You're already subscribed!" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(errorData.message || 'Failed to subscribe');
      }

      return new Response(JSON.stringify({ success: true, message: 'Thanks for subscribing!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || 'Something went wrong' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
