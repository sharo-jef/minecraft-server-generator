import { writeFile } from 'fs/promises';

import axios from 'axios';
import logSymbols from 'log-symbols';
import ora from 'ora';
import prompts from 'prompts';

const { info, success, error } = logSymbols;

void async function main(_args) {
    console.log(info, 'Minecraft Server Generator\n');
    const spinner = ora({ text: 'Downloading Minecraft versions.', hideCursor: true }).start();
    const { versions } = await (await axios.get(process.env.VERSION_MANIFEST)).data;
    spinner.stop();
    const result = await prompts([
        {
            type: 'select',
            name: 'type',
            message: 'Select Minecraft version type',
            choices: ['Release', 'Release and Snapshot'],
        },
        {
            type: 'select',
            name: 'version',
            message: 'Select Minecraft version',
            choices: prev => versions.filter(version => prev === 0 ? version.type === 'release' : true).map(version => version['id']),
        },
        {
            type: 'text',
            name: 'name',
            message: 'Server name',
            initial: 'A Minecraft Server',
        },
        {
            type: 'number',
            name: 'port',
            message: 'Server port',
            initial: 25565,
        },
        {
            type: 'select',
            name: 'gamemode',
            message: 'Gamemode',
            choices: ['survival', 'creative', 'spectator', 'adventure'],
        },
        {
            type: 'select',
            name: 'difficulty',
            message: 'Difficulty',
            choices: ['hard', 'normal', 'easy', 'peaceful'],
        },
        {
            type: 'number',
            name: 'spawnProtection',
            message: 'Spawn protection',
            initial: 0,
        },
        {
            type: 'number',
            name: 'maxPlayers',
            message: 'Max players',
            initial: 20,
        },
        {
            type: 'select',
            name: 'pvp',
            message: 'PVP',
            choices: ['true', 'false'],
        },
    ]);
    const version = versions.filter(version => result.type === 0 ? version.type === 'release' : true)[result.version];
    spinner.text = 'Downloading jar file of Minecraft server.';
    spinner.start();
    const serverUrl = await (await axios.get(version.url))?.data?.downloads?.server?.url;
    if (!serverUrl) {
        spinner.stop();
        throw new Error(error, 'Unable to download Minecraft server.');
    }
    const server = await (await axios.get(serverUrl, { responseType: 'arraybuffer' })).data;
    await writeFile('./server.jar', server);
    spinner.text = 'Configuring';
    await writeFile('./eula.txt', 'eula=true\n');
    await writeFile('./server.properties', `
motd=${escapeUnicode(result.name)}
server-port=${result.port}
spawn-protection=${result.spawnProtection}
max-players=${result.maxPlayers}
pvp=${!result.pvp}
`);
    spinner.stop();
    console.log(success, 'Successfully generated.');
}(process.argv).catch(message => console.error(`\n${error}`, message));

function escapeUnicode(target) {
    return target.replace(/./g, (c) => `\\u${c.charCodeAt().toString(16).padStart(4, '0')}`);
}
