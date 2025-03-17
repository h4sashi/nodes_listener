const express = require('express');
const axios = require('axios');
const app = express();

// In-memory storage for user tokens (temporary)
const userTokens = {};
const userProfiles = {};

// Retrieve secrets from environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Handle Google OAuth Callback
app.get('/auth/google/callback', async (req, res) => {
    const authCode = req.query.code;
    const state = req.query.state;

    if (!authCode || !state) {
        return res.status(400).send('Missing authorization code or state.');
    }

    try {
        // Exchange authorization code for access token
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: {
                code: authCode,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            },
        });

        const { access_token, refresh_token } = tokenResponse.data;

        // Fetch user profile information
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const userProfile = userResponse.data;

        // Store tokens and user profile in memory
        userTokens[state] = { access_token, refresh_token };
        userProfiles[state] = userProfile;

        // Inform Unity to return to the app
        res.send('<html><body>Google Auth Successful! You can now return to the app.</body></html>');
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed.');
    }
});

// Endpoint to retrieve profile data with token
app.get('/getProfile', async (req, res) => {
    const state = req.query.state;

    if (!userTokens[state]) {
        return res.status(404).send('User not found or token expired.');
    }

    const { access_token } = userTokens[state];

    try {
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        res.json(userResponse.data);
    } catch (error) {
        res.status(401).send('Token expired or invalid.');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
