const axios = require('axios');

async function createShortLink(longUrl) {
    const apiEndpoint = 'https://app.linklyhq.com/api/v1/link';

    const payload = {
        api_key: "/tojbEBLPqAKp50P6+svGw==", // Your actual API key
        workspace_id: 344200,       // Your actual Workspace ID (Integer)
        email: "your@email.com",    // MANDATORY as per your docs
        url: longUrl,
        name: "Video Link"
    };

    try {
        const response = await axios.post(apiEndpoint, payload, {
            headers: { 
                'Content-Type': 'application/json',
                'cache-control': 'no-cache'
            }
        });

        console.log("Success!");
        return response.data.full_url;
    } catch (error) {
        // Log detailed error to see why it failed
        console.error('Request Failed:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Call with your specific IP URL
const myUrl = "http://183.82.96.182:9090/vp/displayGripVideo/ByNSLAbTVSgtPxWdDmKaBwhtEForcNOAGvubmAUajwnWVvZveVCNLzxmHmopEUowXHAuuFewjFgqRrxVABGUIEUKlUwTMyZACckY";

createShortLink(myUrl).then(short => console.log("Shortened URL:", short));
