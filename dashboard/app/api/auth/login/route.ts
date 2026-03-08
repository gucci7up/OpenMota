import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // Valid passwords: Either the specific DASHBOARD_PASSWORD or just the API_KEY as fallback
        const validPassword = process.env.OPENMOTA_DASHBOARD_PASSWORD || process.env.OPENMOTA_API_KEY;

        if (password === validPassword) {
            // Set a session cookie
            // In a real production app, use a JWT or similar. For this "Pro" dashboard, 
            // we'll use a simple "logged-in" cookie for now.
            (await cookies()).set('om_session', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Clave de acceso incorrecta.' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Fallo en la autenticación.' }, { status: 500 });
    }
}
