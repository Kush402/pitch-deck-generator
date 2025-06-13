import { logger } from '../../utils/logger.js';
import axios from 'axios';
import { createWriteStream, createReadStream, readFileSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { Readable, PassThrough } from 'stream';

const isTestMode = process.env.NODE_ENV === 'test';
if (isTestMode) {
  logger.warn('Storage service is running in TEST MODE. Files will not be saved to actual storage.');
}

// Initialize Google Drive client
const drive = google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
        keyFile: 'google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/drive']
    })
});

// Store folder IDs for sessions
const sessionFolders = new Map();

/**
 * Downloads a file from a URL to a temporary location
 * @param {string} url - URL of the file to download
 * @returns {Promise<string>} Path to the downloaded file
 */
const downloadFile = async (url) => {
  const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  const writer = createWriteStream(tempPath);
  
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => resolve(tempPath));
    writer.on('error', reject);
  });
};

/**
 * Creates a folder in Google Drive if it doesn't exist
 * @param {string} brand - Brand name
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Folder information
 */
async function createOrGetFolder(brand, sessionId) {
    try {
        // Check if we already have a folder for this session
        const sessionKey = `${brand}_${sessionId}`;
        if (sessionFolders.has(sessionKey)) {
            const folder = sessionFolders.get(sessionKey);
            logger.info('Using existing folder for session', { 
                brand,
                sessionId,
                folderId: folder.id,
                folderUrl: folder.url
            });
            return folder;
        }

        // Create a timestamped folder name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const folderName = `${brand}_${timestamp}`;
        
        // Check if folder already exists
        const response = await drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, webViewLink)'
        });

        let folder;
        if (response.data.files.length > 0) {
            folder = response.data.files[0];
        } else {
            // Create new folder
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            };

            const folderResponse = await drive.files.create({
                resource: folderMetadata,
                fields: 'id, webViewLink'
            });

            folder = {
                id: folderResponse.data.id,
                webViewLink: folderResponse.data.webViewLink,
                name: folderName
            };
        }

        // Make folder public
        await drive.permissions.create({
            fileId: folder.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Store folder info for this session
        const folderInfo = {
            id: folder.id,
            url: folder.webViewLink,
            name: folderName
        };
        sessionFolders.set(sessionKey, folderInfo);

        logger.info('Created/retrieved folder for session', { 
            brand,
            sessionId,
            folderId: folder.id,
            folderName,
            folderUrl: folder.webViewLink
        });

        return folderInfo;
    } catch (error) {
        logger.error('Failed to create/get folder', { 
            brand,
            sessionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Saves a file from a URL to Google Drive
 * @param {string} imageUrl - URL of the file to save
 * @param {string} fileName - Name for the saved file
 * @param {string} brand - Brand name
 * @param {string} sessionId - Session ID
 * @param {string} folderId - Optional folder ID to use
 * @returns {Promise<Object>} Saved file information
 */
async function saveImageToDrive(imageUrl, fileName, brand, sessionId, folderId = null) {
    try {
        logger.info('Saving file to Drive', { brand, fileName, sessionId });

        // Get folder ID if not provided
        if (!folderId) {
            const folder = await createOrGetFolder(brand, sessionId);
            folderId = folder.id;
        }

        // Get the file as a stream
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream'
        });

        // Create a PassThrough stream
        const bufferStream = new PassThrough();
        response.data.pipe(bufferStream);

        // Determine MIME type based on file extension
        const extension = path.extname(fileName).toLowerCase();
        const mimeType = extension === '.mp4' ? 'video/mp4' : 'image/jpeg';

        // Create file metadata
        const fileMetadata = {
            name: fileName,
            parents: [folderId],
            mimeType: mimeType
        };

        try {
            // Upload file using media upload
            const file = await drive.files.create({
                requestBody: fileMetadata,
                media: {
                    mimeType: mimeType,
                    body: bufferStream
                },
                fields: 'id, webViewLink'
            });

            // Make file public
            await drive.permissions.create({
                fileId: file.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            logger.info('File saved to Drive successfully', { 
                brand,
                sessionId,
                fileName,
                fileId: file.data.id,
                webViewLink: file.data.webViewLink
            });

            return {
                id: file.data.id,
                url: file.data.webViewLink,
                name: fileName,
                type: extension === '.mp4' ? 'animation' : 'image',
                folderId: folderId
            };
        } catch (uploadError) {
            logger.error('Failed to upload file to Drive', {
                brand,
                sessionId,
                error: uploadError.message,
                fileName
            });
            throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
    } catch (error) {
        logger.error('Failed to save file to Drive', { 
            brand,
            sessionId,
            error: error.message,
            fileName
        });
        throw error;
    }
}

/**
 * Saves multiple assets to Google Drive
 * @param {Object[]} assets - Array of assets to save
 * @param {string} brand - Brand name for folder organization
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object[]>} Array of saved assets with Drive URLs
 */
async function saveAssetsToDrive(assets, brand, sessionId) {
    try {
        logger.info('Saving assets to Drive', { 
            brand,
            sessionId,
            totalAssets: assets.length,
            assetTypes: [...new Set(assets.map(asset => asset.type))]
        });

        // First, create or get folder for this session
        const folder = await createOrGetFolder(brand, sessionId);
        logger.info('Using folder for assets', {
            brand,
            sessionId,
            folderId: folder.id,
            folderName: folder.name,
            folderUrl: folder.url
        });
        
        const savedAssets = [];
        for (const asset of assets) {
            try {
                // Get the file as a stream
                const response = await axios({
                    method: 'GET',
                    url: asset.url,
                    responseType: 'stream'
                });

                // Create a PassThrough stream
                const bufferStream = new PassThrough();
                response.data.pipe(bufferStream);

                // Determine MIME type based on file extension
                const extension = asset.type === 'animation' ? '.mp4' : '.jpg';
                const mimeType = extension === '.mp4' ? 'video/mp4' : 'image/jpeg';

                // Create file metadata with parent folder
                const fileMetadata = {
                    name: `${asset.type}-${Date.now()}-${Math.random().toString(36).substring(7)}${extension}`,
                    parents: [folder.id], // Set the parent folder
                    mimeType: mimeType
                };

                // Upload file using media upload
                const file = await drive.files.create({
                    requestBody: fileMetadata,
                    media: {
                        mimeType: mimeType,
                        body: bufferStream
                    },
                    fields: 'id, webViewLink'
                });

                // Make file public
                await drive.permissions.create({
                    fileId: file.data.id,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone'
                    }
                });

                logger.info('File saved to Drive successfully', { 
                    brand,
                    sessionId,
                    fileName: fileMetadata.name,
                    fileId: file.data.id,
                    webViewLink: file.data.webViewLink,
                    folderId: folder.id
                });

                savedAssets.push({
                    id: file.data.id,
                    url: file.data.webViewLink,
                    name: fileMetadata.name,
                    type: asset.type,
                    folderId: folder.id,
                    folderName: folder.name,
                    folderUrl: folder.url
                });
            } catch (error) {
                logger.error('Failed to save asset to Drive', {
                    brand,
                    sessionId,
                    type: asset.type,
                    error: error.message
                });
            }
        }

        logger.info('Assets saved to Drive successfully', {
            brand,
            sessionId,
            totalSaved: savedAssets.length,
            savedUrls: savedAssets.map(asset => asset.url),
            folders: [{
                id: folder.id,
                name: folder.name,
                url: folder.url
            }]
        });

        return savedAssets;
    } catch (error) {
        logger.error('Failed to save assets to Drive', {
            brand,
            sessionId,
            error: error.message
        });
        throw error;
    }
}

export { saveImageToDrive, saveAssetsToDrive }; 