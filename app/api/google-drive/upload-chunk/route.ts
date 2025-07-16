import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function PUT(request: NextRequest) {
    try {
        // Log which service account is being used
        const clientEmail = process.env.NEXT_GOOGLE_CLIENT_EMAIL;
        console.log('Google Service Account (upload-chunk):', clientEmail);
        const searchParams = request.nextUrl.searchParams;
        const sessionUri = searchParams.get('sessionUri');
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const total = searchParams.get('total');
        const mimeType = searchParams.get('mimeType') || 'video/webm';

        if (!sessionUri || !start || !end || !total) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const chunk = await request.blob();

        // Log the session URI being used
        console.log('Chunk upload session URI:', sessionUri);

        // Forward the chunk to Google Drive
        const response = await fetch(sessionUri, {
            method: 'PUT',
            headers: {
                'Content-Range': `bytes ${start}-${end}/${total}`,
                'Content-Type': mimeType,
            },
            body: chunk,
        });
        console.log(response);
        if (response.ok) {
            // Upload complete
            const result = await response.json();
            return NextResponse.json({
                success: true,
                complete: true,
                fileId: result.id
            });
        } else if (response.status === 308) {
            // Resume incomplete - get the range
            const range = response.headers.get('Range');
            return NextResponse.json({
                success: true,
                complete: false,
                range
            });
        } else if (response.status === 429) {
            // Rate limited
            const retryAfter = response.headers.get('Retry-After');
            return NextResponse.json({
                success: false,
                error: 'Rate limited',
                retryAfter: retryAfter ? parseInt(retryAfter) * 1000 : undefined
            });
        } else if (response.status >= 500) {
            // Server error - retry
            return NextResponse.json({
                success: false,
                error: `Server error: ${response.status}`
            });
        } else {
            // Client error - don't retry
            // Get the actual error response from Google
            const errorBody = await response.text();
            console.error('Google Drive chunk upload error response:', errorBody);
            return NextResponse.json(
                { error: `Upload failed: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

    } catch (error) {
        console.error('Chunk upload error:', error);
        return NextResponse.json(
            { error: 'Chunk upload failed' },
            { status: 500 }
        );
    }
} 