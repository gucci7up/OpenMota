import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const backendUrl = process.env.OPENMOTA_BACKEND_URL || 'http://localhost:3001';
        const apiRes = await fetch(`${backendUrl}/stats`, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.OPENMOTA_API_KEY || ''
            },
            next: { revalidate: 30 } // Cache for 30 seconds
        });

        if (!apiRes.ok) throw new Error('API down');
        const data = await apiRes.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Fallo al conectar con el motor Stats.' }, { status: 500 });
    }
}
