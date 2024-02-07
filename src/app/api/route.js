// pages/api/uploadImage.js

import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const pipelineAsync = promisify(pipeline);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end(); // Method Not Allowed
  }

  try {
    const file = req.body.file; // Assuming file is sent as form data

    // Save the file temporarily
    const tempPath = `./temp/${file.name}`;
    const writeStream = createWriteStream(tempPath);
    await pipelineAsync(file.data, writeStream);

    // Upload the file to GitHub repository
    const githubToken = process.env.GITHUB_TOKEN;
    const owner = 'sopdrive';
    const repo = 'images';
    const filePath = `images/${file.name}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const base64Data = Buffer.from(await readFileAsync(tempPath)).toString('base64');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Upload image',
        content: base64Data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const jsonResponse = await response.json();

    // Construct the URL of the uploaded file
    const uploadedFileUrl = jsonResponse.content.html_url;

    // Respond with the URL of the uploaded file
    res.status(200).json({ url: uploadedFileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
