const express = require('express');
const axios = require('axios');
const app = express();

// In-memory storage for user profiles (temporary)
const userProfiles = {};

// Retrieve secrets from environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.get('/auth/google/callback', async (req, res) => {
    const authCode = req.query.code;
    const state = req.query.state; // Capture the state parameter from Unity

    if (!authCode || !state) {
        return res.status(400).send('Missing authorization code or state parameter.');
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

        const { access_token } = tokenResponse.data;

        // Fetch user profile information
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const userProfile = userResponse.data;

        // Store the profile data using the state as the key
        userProfiles[state] = userProfile;

        // Inform the user to return to Unity
        res.send('<html><body>Google Auth Successful! You can now return to the app.</body></html>');
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed.');
    }
});

// Endpoint for Unity to retrieve the profile data
app.get('/getProfile', (req, res) => {
    const state = req.query.state;

    if (state && userProfiles[state]) {
        const profile = userProfiles[state];
        delete userProfiles[state]; // Remove from storage after retrieval
        res.json(profile);
    } else {
        res.status(404).send('Profile not found.');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
