const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();

// JWT Secret Key (Keep this safe in production)
const JWT_SECRET = process.env.JWT_SECRET;

// Retrieve secrets from environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// In-memory storage for user profiles
const userProfiles = {};

app.get('/auth/google/callback', async (req, res) => {
    const authCode = req.query.code;
    const state = req.query.state;

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

        const { access_token, refresh_token } = tokenResponse.data;

        // Fetch user profile
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const userProfile = userResponse.data;

        // Generate JWT Token (for auto-login)
        const jwtToken = jwt.sign(
            { user: userProfile, refreshToken: refresh_token },
            JWT_SECRET,
            { expiresIn: '30d' } // Token valid for 30 days
        );

        // Store the user profile in memory (temporary)
        userProfiles[state] = { userProfile, jwtToken };

        // Redirect to success page that tells Unity to fetch the profile
        res.send(`
            <html>
                <body>
                    <h2>Google Auth Successful!</h2>
                    <p>You can now return to the app.</p>
                    <script>
                        setTimeout(() => {
                            window.location.href = "unity://success?state=${state}";
                        }, 1000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed.');
    }
});

// Endpoint to retrieve the user profile in Unity
app.get('/getProfile', (req, res) => {
    const state = req.query.state;

    if (state && userProfiles[state]) {
        const profileData = userProfiles[state];
        delete userProfiles[state]; // Remove from storage after retrieval
        res.json(profileData);
    } else {
        res.status(404).send('Profile not found.');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
