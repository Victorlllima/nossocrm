import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    name: 'Max Lima CRM',
    short_name: 'Max CRM',
    description: 'CRM Max Lima — Gestão de vendas mobile',
    start_url: '/inbox',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#191815',
    theme_color: '#191815',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    categories: ['business', 'productivity'],
    lang: 'pt-BR',
  });
}
