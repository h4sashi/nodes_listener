

const express = require('express');
const axios = require('axios');
const app = express();

// Retrieve secrets from environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.get('/auth/google/callback', async (req, res) => {
    const authCode = req.query.code;
    if (!authCode) {
        return res.status(400).send('Authorization code not found.');
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
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const userProfile = userResponse.data;

        // Send user profile information back to Unity
        res.json(userProfile);
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed.');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});