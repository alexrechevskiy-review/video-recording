import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { sessionUri } = await request.json();

        if (!sessionUri) {
            return NextResponse.json(
                { error: 'Missing session URI' },
                { status: 400 }
            );
        }

        // Check upload status by sending an empty PUT request
        const response = await fetch(sessionUri, {
            method: 'PUT',
            headers: {
                'Content-Range': 'bytes */*',
            },
        });

        if (response.status === 308) {
            // Resume incomplete - parse the range header
            const range = response.headers.get('Range');
            if (range) {
                // Range format: "bytes=0-262143" means bytes 0-262143 have been uploaded
                const match = range.match(/bytes=(\d+)-(\d+)/);
                if (match) {
                    const uploadedBytes = parseInt(match[2]) + 1; // +1 because range is inclusive
                    return NextResponse.json({ uploadedBytes });
                }
            }
            return NextResponse.json({ uploadedBytes: 0 });
        } else if (response.ok) {
            // Upload is complete
            const result = await response.json();
            return NextResponse.json({
                uploadedBytes: -1, // Indicates complete
                fileId: result.id
            });
        } else if (response.status === 404 || response.status === 410) {
            // Session expired or not found - indicate session is invalid
            return NextResponse.json({
                uploadedBytes: 0,
                sessionExpired: true
            });
        } else {
            // Some other status - assume no progress but session might still be valid
            return NextResponse.json({ uploadedBytes: 0 });
        }

    } catch (error) {
        console.error('Check status error:', error);
        // Return session expired to trigger new session creation
        return NextResponse.json({
            uploadedBytes: 0,
            sessionExpired: true
        });
    }
} 