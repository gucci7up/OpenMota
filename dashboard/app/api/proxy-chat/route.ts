import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { message } = await request.json();

        // Call the OpenMota Pro API at port 3001
        // We use the internal or external IP/localhost
        const apiRes = await fetch('http://localhost:3001/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.OPENMOTA_API_KEY || 'default_key_if_not_set'
            },
            body: JSON.stringify({ message })
        });

        const data = await apiRes.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Fallo al conectar con el motor OpenMota.' }, { status: 500 });
    }
}
