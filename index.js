const core = require('@actions/core');
const exec = require('@actions/exec');


async function run () {
    try {
        const languages = core.getInput('languages', {required: true});
        await exec.exec(`ngx-translate-extract --input ./src --output ${languages.split(',').map(lang => `./src/assets/i18n/${lang}.json`)} --sort --format json`);
        await exec.exec(`node translate.js ${languages.split(',')}`);
    } catch (err) {
        core.setFailed(`Action failed with error ${err}`);
    }
}

run();
