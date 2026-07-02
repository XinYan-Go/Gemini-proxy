addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return handleCORS()
  }

  try {
    const url = new URL(request.url)
    const pathname = url.pathname

    // 路径前缀路由表
    const ROUTES = {
      '/gemini/':      'https://generativelanguage.googleapis.com',
      '/openai/':      'https://api.openai.com',
      '/anthropic/':   'https://api.anthropic.com',
      '/claude/':      'https://api.anthropic.com',
      '/deepseek/':    'https://api.deepseek.com',
      '/groq/':        'https://api.groq.com',
    }

    // 域名白名单
    const HOST_WHITELIST = [
      'generativelanguage.googleapis.com',
      'api.openai.com',
      'api.anthropic.com',
      'api.deepseek.com',
      'api.groq.com',
    ]

    // 1. 路径匹配
    let targetHost = null
    let matchedPrefix = null
    for (const [prefix, host] of Object.entries(ROUTES)) {
      if (pathname.startsWith(prefix)) {
        targetHost = host
        matchedPrefix = prefix
        break
      }
    }

    if (!targetHost) {
      return jsonResponse({ error: 'Unsupported path. Use /gemini/, /openai/, /anthropic/, /deepseek/, /groq/' }, 400)
    }

    // 2. 白名单校验
    const targetHostname = new URL(targetHost).hostname
    if (!HOST_WHITELIST.includes(targetHostname)) {
      return jsonResponse({ error: 'Target host not allowed' }, 403)
    }

    // 3. 构建目标 URL（去掉前缀，保留剩余路径）
    const newPath = '/' + pathname.slice(matchedPrefix.length)
    const targetURL = new URL(newPath + url.search, targetHost)

    // 4. 创建代理请求
    const proxyRequest = new Request(targetURL, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    })

    // 5. 发送请求
    const response = await fetch(proxyRequest)

    // 6. 添加 CORS 头
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS')
    newHeaders.set('Access-Control-Allow-Headers', '*')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })

  } catch (error) {
    return jsonResponse({ error: 'Internal error', message: error.message }, 500)
  }
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    }
  })
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
