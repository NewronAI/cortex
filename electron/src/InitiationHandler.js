
const fs = require("fs");

const {resolve} = require("path");
const config = require("../../config");
const os = require("os");

class InitiationHandler {
    constructor() {

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
            this.config = config.default;
            this.updateConfigFile(this.config);
        }

    }

    doesCortexFolderExist() {
        return fs.existsSync(resolve(os.homedir()+"/cortex/output"));
    }
    doesConfigFileExist() {
        return fs.existsSync(resolve(os.homedir()+"/cortex/config.json"));
    }
    createCortexFolder() {
        fs.mkdirSync(resolve(os.homedir()+"/cortex/output"), {recursive: true});
    }

    createConfigFile() {
        fs.writeFileSync(resolve(os.homedir()+"/cortex/config.json"), JSON.stringify(config.default, null, 4));
    }

    readConfigFile() {
        let content = fs.readFileSync(resolve(os.homedir()+"/cortex/config.json"));
        if(typeof content !== "string") {
            content = content.toString();
        }
        return JSON.parse(content);
    }

    updateConfigFile(config) {
        this.config = config;
        fs.writeFileSync(resolve(os.homedir()+"/cortex/config.json"), JSON.stringify(config, null, 4));
    }

    getConfig() {
        return this.config;
    }

    getProject() {
        return this.config.project;
    }

}

module.exports = InitiationHandler;