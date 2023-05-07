
const fs = require("fs");
const {v4: uuidv4} = require("uuid");

class InitiationHandler {
    constructor(props) {

        let configExists = true;

        if(!this.doesCortexFolderExist()) {
            configExists = false;
            this.createCortexFolder();
        }

        if(!this.doesConfigFileExist()) {
            configExists = false;
            this.createConfigFile();
        }

        if(configExists){
            this.config = this.readConfigFile();
            this.updateConfigFile({...this.config, initiation: {...this.config.initiation, last: new Date().toISOString()}});
        }
        else {
            this.config = {
                "user": {
                    "name": "Public User",
                    "email": "public@localhost",
                    "uuid": uuidv4()
                },
                "project": [
                    {
                        "name": "Project 1",
                        "description": "Project 1 description",
                        "baseUrl" : "http://localhost:8080",
                        "visitedUrls": [],
                        "created": new Date().toISOString(),
                    }
                ],
                "initiation": {
                    "date": new Date().toISOString(),
                    "last": new Date().toISOString(),
                }
            }

            this.updateConfigFile(this.config);
        }

    }

    doesCortexFolderExist() {
        return fs.existsSync("~/cortex");
    }
    doesConfigFileExist() {
        return fs.existsSync("~/cortex/config.json");
    }

    createCortexFolder() {
        fs.mkdirSync("~/cortex", {recursive: true});
    }

    createConfigFile() {
        fs.writeFileSync("~/cortex/config.json", JSON.stringify({
            "user": {
                "name": "user",
                "email": "user@localhost"
            },
            "project": {
                "name": "project",
                "description": "project description"
            },
            "initiation": {
                "date": new Date().toISOString()
            }
        }));
    }

    readConfigFile() {
        let content = fs.readFileSync("~/cortex/config.json");
        if(typeof content !== "string") {
            content = content.toString();
        }
        return JSON.parse(content);
    }

    updateConfigFile(config) {
        this.config = config;
        fs.writeFileSync("~/cortex/config.json", JSON.stringify(config));
    }

    getConfig() {
        return this.config;
    }

    getProject() {
        return this.config.project;
    }

}

module.exports = InitiationHandler;