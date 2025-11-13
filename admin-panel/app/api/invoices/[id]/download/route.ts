import { NextRequest, NextResponse } from 'next/server'

/**
 * Invoice PDF Download Proxy Endpoint
 * GET /api/invoices/[id]/download?token=SHARE_TOKEN
 * 
 * Backend'den PDF'i çekip frontend'e stream olarak döndürür
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const shareToken = searchParams.get('token')
    
    // API yapılandırması
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api'
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
    const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
    
    // URL oluşturma
    let backendUrl: string
    
    if (shareToken) {
      // Share URL kullan - token direkt share endpoint'ine gider
      backendUrl = `${API_BASE_URL}/invoices/share/${shareToken}/download`
    } else {
      // Admin endpoint kullan
      backendUrl = `${API_BASE_URL}/admin/invoices/${id}/download`
    }
    
    console.log('Fetching PDF from:', backendUrl)
    
    // Backend'den PDF'i çek
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf, application/octet-stream, */*',
        // Share URL için auth gerekmez, admin endpoint için gerekebilir
        ...(shareToken ? {} : {
          'X-API-Key': API_KEY,
          'X-Admin-Key': ADMIN_KEY,
        })
      }
    })
    
    // Response kontrolü
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      
      // JSON hata mesajı
      if (contentType.includes('application/json')) {
        const errorData = await response.json()
        const errorMsg = errorData.message || `HTTP ${response.status}: ${response.statusText}`
        
        console.error('Backend PDF fetch error:', {
          url: backendUrl,
          status: response.status,
          error: errorData
        })
        
        return NextResponse.json(
          { 
            success: false, 
            message: errorMsg,
            error: 'PDF_FETCH_FAILED'
          },
          { status: response.status }
        )
      }
      
      // Text hata mesajı
      const errorText = await response.text().catch(() => '')
      
      return NextResponse.json(
        { 
          success: false, 
          message: errorText || `HTTP ${response.status}: ${response.statusText}`,
          error: 'PDF_FETCH_FAILED'
        },
        { status: response.status }
      )
    }
    
    // Content-Type kontrolü
    const contentType = response.headers.get('content-type') || ''
    
    // PDF değilse hata döndür
    if (contentType.includes('application/json')) {
      const errorData = await response.json()
      return NextResponse.json(
        { 
          success: false, 
          message: errorData.message || 'Beklenmeyen yanıt formatı',
          error: 'INVALID_RESPONSE'
        },
        { status: 500 }
      )
    }
    
    // PDF stream'i oluştur
    const pdfBuffer = await response.arrayBuffer()
    
    // PDF response döndür
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/pdf',
        'Content-Disposition': `inline; filename="fatura-${id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
    
  } catch (error: any) {
    console.error('PDF proxy error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'PDF görüntülenirken bir hata oluştu',
        error: 'PROXY_ERROR'
      },
      { status: 500 }
    )
  }
}

