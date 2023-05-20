const {v4: uuidV4} = require("uuid");

const config = {
    default : {
        "user": {
            "name": "Public User",
            "email": "public@localhost",
            "uuid": uuidV4()
        },

        "maxDepth": 1,
        "headless": true,
        "crawlInterval": 1200,

        "project": [
            {
                "name": "Project 1",
                "description": "Project 1 description",
                "baseUrl" : "https://newron.ai",
                "visitedUrls": [],
                "created": new Date().toISOString(),
            }
        ],

        "initiation": {
            "date": new Date().toISOString(),
            "last": new Date().toISOString(),
        }
    }
}

module.exports = config;