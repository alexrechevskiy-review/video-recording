import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
    try {
        const { fileName, mimeType, fileSize, userEmail, isInCsmList, csmName } = await request.json();
        console.log(fileName, mimeType, fileSize, userEmail, isInCsmList, csmName);
        if (!fileName || !mimeType || !fileSize || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required parameters (fileName, mimeType, fileSize, userEmail)' },
                { status: 400 }
            );
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.NEXT_GOOGLE_CLIENT_EMAIL,
                private_key: process.env.NEXT_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();
        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

        const drive = google.drive({ version: 'v3', auth });
        const parentFolderId = process.env.NEXT_GOOGLE_FOLDER_ID;
        const cmsFolderId = process.env.NEXT_GOOGLE_FOLDER_CSM_ID;
        const unclassifiedFolderId = process.env.NEXT_GOOGLE_FOLDER_UNCLASSIFIED_ID;

        if (!parentFolderId) {
            return NextResponse.json(
                { error: 'Google Drive folder ID not configured' },
                { status: 500 }
            );
        }

        // Check if user folder exists, create if it doesn't
        let userFolderId: string;

        try {
            // Search for existing folder with the user's email
            const folderSearchResponse = await drive.files.list({
                q: `name='${userEmail}' and parents in '${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
            });

            const files = folderSearchResponse.data.files;
            if (files && files.length > 0) {
                // Folder exists, use it
                userFolderId = files[0].id!;
                console.log(`Using existing folder for ${userEmail}: ${userFolderId}`);
            } else {
                // Create new folder for the user
                const folderMetadata = {
                    name: userEmail,
                    parents: [parentFolderId],
                    mimeType: 'application/vnd.google-apps.folder',
                };

                const folderResponse = await drive.files.create({
                    requestBody: folderMetadata,
                    fields: 'id',
                });

                userFolderId = folderResponse.data.id!;
                console.log(`Created new folder for ${userEmail}: ${userFolderId}`);

                // 2. Share folder with a specific email (only if not already shared)
                const permissions = await drive.permissions.list({ fileId: userFolderId });
                const alreadyShared = permissions.data.permissions?.some(
                    p => p.emailAddress === userEmail
                );
                if (!alreadyShared) {
                    await drive.permissions.create({
                        fileId: userFolderId,
                        requestBody: {
                            type: "user",
                            role: "writer",
                            emailAddress: userEmail,
                        },
                    });
                }
            }
        } catch (folderError) {
            console.error('Error managing user folder:', folderError);
            throw new Error('Failed to create or access user folder');
        }

        // Create metadata for the file in the user's folder
        const metadata = {
            name: fileName,
            parents: [userFolderId],
            mimeType: mimeType,
            description: csmName !== '' ? `Submitted by: ${csmName}` : undefined,
        };

        // Initiate resumable upload session using direct fetch
        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': mimeType,
                    'X-Upload-Content-Length': fileSize.toString(),
                },
                body: JSON.stringify(metadata),
            }
        );
        console.log(response);
        if (!response.ok) {
            throw new Error(`Failed to initiate upload: ${response.status} ${response.statusText}`);
        }

        // Get the resumable session URI from the Location header
        const sessionUri = response.headers.get('Location');

        if (!sessionUri) {
            throw new Error('No session URI received from Google Drive');
        }

        // --- Add shortcut logic after upload initiation ---
        let shortcutParentFolderId: string | undefined;
        let shortcutId: string | undefined;
        let shortcutUserFolderId: string | undefined;
        // Use user's name if provided, otherwise fallback to userEmail
        const userFolderName = isInCsmList ? csmName : userEmail;
        if (isInCsmList ? cmsFolderId : unclassifiedFolderId) {
            shortcutParentFolderId = isInCsmList ? cmsFolderId : unclassifiedFolderId;
            // 1. Check if folder with user's name exists in shortcutParentFolderId
            const shortcutUserFolderSearch = await drive.files.list({
                q: `name='${userFolderName}' and parents in '${shortcutParentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
            });
            if (shortcutUserFolderSearch.data.files && shortcutUserFolderSearch.data.files.length > 0) {
                shortcutUserFolderId = shortcutUserFolderSearch.data.files[0].id!;
            } else {
                // Create the folder
                const shortcutUserFolderMetadata = {
                    name: userFolderName,
                    parents: [shortcutParentFolderId!],
                    mimeType: 'application/vnd.google-apps.folder',
                };
                const shortcutUserFolderResponse = await drive.files.create({
                    requestBody: shortcutUserFolderMetadata,
                    fields: 'id',
                });
                const shortcutUserFolderResult = await shortcutUserFolderResponse;
                shortcutUserFolderId = shortcutUserFolderResult.data.id!;
            }
            // 2. Check for existing shortcut to the user's uploaded folder inside this folder
            // List all shortcut files in the shortcutUserFolderId folder
            const existingShortcutsResponse = await drive.files.list({
                q: `mimeType='application/vnd.google-apps.shortcut' and parents in '${shortcutUserFolderId}' and trashed=false`,
                fields: 'files(id, name, shortcutDetails)',
            });
            let foundShortcut = null;
            if (existingShortcutsResponse.data.files && existingShortcutsResponse.data.files.length > 0) {
                for (const shortcut of existingShortcutsResponse.data.files) {
                    // shortcut.shortcutDetails?.targetId may be undefined if not populated, so check
                    if (shortcut.shortcutDetails && shortcut.shortcutDetails.targetId === userFolderId) {
                        foundShortcut = shortcut;
                        break;
                    }
                }
            }
            if (foundShortcut) {
                shortcutId = foundShortcut.id || undefined;
            } else {
                // Create shortcut to the user's uploaded folder inside this folder
                const shortcutMetadata = {
                    name: `${userFolderName} video submission`,
                    mimeType: 'application/vnd.google-apps.shortcut',
                    parents: [shortcutUserFolderId!],
                    shortcutDetails: {
                        targetId: userFolderId,
                    },
                };
                const shortcutResponse = await drive.files.create({
                    requestBody: shortcutMetadata,
                    fields: 'id',
                });
                const shortcutResult = await shortcutResponse;
                shortcutId = shortcutResult.data.id!;
            }
        }

        return NextResponse.json({
            sessionUri,
            uploadId: `upload_${Date.now()}`,
            userFolderId,
            shortcutParentFolderId,
            shortcutUserFolderId,
            shortcutId
        });

    } catch (error) {
        console.error('Google Drive initiate error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to initiate Google Drive upload' },
            { status: 500 }
        );
    }
} 