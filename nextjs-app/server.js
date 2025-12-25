require('dotenv').config({ path: '.env.local' })

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const httpProxy = require('http-proxy')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const SUPABASE_URL = process.env.SUPABASE_INTERNAL_URL || 'http://10.15.48.64:54321'

console.log('🎯 Supabase target URL:', SUPABASE_URL)

const proxy = httpProxy.createProxyServer({
  target: SUPABASE_URL,
  changeOrigin: true,
  ws: true,
  timeout: 30000,
  proxyTimeout: 30000
})

// IMPORTANT: Filter headers before proxying
proxy.on('proxyReq', (proxyReq, req, res) => {
  // Get only the essential Supabase auth cookie
  const cookies = req.headers.cookie || ''
  const supabaseCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('sb-10-auth-token='))
  
  // Replace with only the Supabase cookie
  if (supabaseCookie) {
    proxyReq.setHeader('cookie', supabaseCookie.trim())
  } else {
    proxyReq.removeHeader('cookie')
  }
  
  // Remove other large headers
  proxyReq.removeHeader('x-forwarded-for')
  proxyReq.removeHeader('x-forwarded-proto')
  proxyReq.removeHeader('x-forwarded-host')
  proxyReq.removeHeader('x-forwarded-port')
  
  console.log('📤 Filtered headers, cookie size:', proxyReq.getHeader('cookie')?.length || 0)
})

// IMPORTANT: Filter headers for WebSocket upgrades too
proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
  console.log('🔌 WebSocket proxy request to:', SUPABASE_URL + req.url)
  
  // Get only the essential Supabase auth cookie
  const cookies = req.headers.cookie || ''
  const supabaseCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('sb-10-auth-token='))
  
  // Replace with only the Supabase cookie
  if (supabaseCookie) {
    proxyReq.setHeader('cookie', supabaseCookie.trim())
  } else {
    proxyReq.removeHeader('cookie')
  }
  
  // Remove other large headers
  proxyReq.removeHeader('x-forwarded-for')
  proxyReq.removeHeader('x-forwarded-proto')
  proxyReq.removeHeader('x-forwarded-host')
  proxyReq.removeHeader('x-forwarded-port')
  
  console.log('   Cookie size:', proxyReq.getHeader('cookie')?.length || 0)
})

proxy.on('error', (err, req, res) => {
  console.error('❌ Proxy error:', err.message)
  console.error('   Code:', err.code)
  console.error('   Target:', SUPABASE_URL)
  console.error('   URL:', req.url)
  if (res && res.writeHead) {
    res.writeHead(502)
    res.end('Proxy error: ' + err.message)
  }
})

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log('📥 Response from Supabase:', proxyRes.statusCode)
})

proxy.on('open', (proxySocket) => {
  console.log('✅ WebSocket proxy connection opened')
})

proxy.on('close', (res, socket, head) => {
  console.log('🔚 WebSocket proxy connection closed')
})

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    
    if (parsedUrl.pathname.startsWith('/supabase/')) {
      console.log('📤 HTTP:', req.method, req.url)
      req.url = req.url.replace('/supabase', '')
      proxy.web(req, res)
    } else {
      handle(req, res, parsedUrl)
    }
  })

  server.on('upgrade', (req, socket, head) => {
    const parsedUrl = parse(req.url, true)
    
    if (parsedUrl.pathname.startsWith('/supabase/')) {
      console.log('🔌 WebSocket upgrade request:', req.url)
      req.url = req.url.replace('/supabase', '')
      console.log('🎯 Forwarding to:', SUPABASE_URL + req.url)
      
      socket.on('error', (err) => {
        console.error('❌ Client socket error:', err.message)
      })
      
      socket.on('close', () => {
        console.log('🔚 Client socket closed')
      })
      
      try {
        proxy.ws(req, socket, head)
      } catch (err) {
        console.error('❌ WebSocket proxy exception:', err.message)
        socket.destroy()
      }
    } else if (parsedUrl.pathname.startsWith('/_next/webpack-hmr')) {
      console.log('⚡ Next.js HMR WebSocket')
    } else {
      console.log('❌ Rejecting WebSocket to:', req.url)
      socket.destroy()
    }
  })

  server.listen(3000, '0.0.0.0', () => {
    console.log('✅ Ready on http://0.0.0.0:3000')
    console.log('🎯 Proxying /supabase/* to:', SUPABASE_URL)
  })
})