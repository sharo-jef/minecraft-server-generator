#!/usr/bin/env node
import { writeFile } from 'fs/promises';

import axios from 'axios';
import { execSync } from 'child_process';
import { Config } from 'cli-conf';
import logSymbols from 'log-symbols';
import ora from 'ora';
import prompts from 'prompts';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Prompt } from './lib/prompt.js';

const { info, success, error } = logSymbols;
const config = new Config('minecraft-server-generator', {
    defaultRconPassword: 'defaultRconPassword',
    memory: '2560M',
});

const argv = yargs(hideBin(process.argv))
    .scriptName('generate-minecraft-server')
    .locale('en')
    .strictOptions()
    .strictCommands()
    .argv;

function escapeUnicode(target) {
    return target.replace(/./g, (c) => `\\u${c.charCodeAt().toString(16).padStart(4, '0')}`);
}

void async function main(_argv) {
    console.log(info, 'Minecraft Server Generator\n');
    const spinner = ora({ text: 'Downloading Minecraft versions.', hideCursor: true });
    spinner.start();
    const { versions } = (await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json')).data;
    spinner.stop();
    const promptArray = [
        new Prompt()
            .type('select')
            .name('type')
            .message('Select Minecraft version type')
            .choices(['Release', 'Release and Snapshot']),
        new Prompt()
            .type('select')
            .name('version')
            .message('Select Minecraft version')
            .choices(prev => versions.filter(version => prev === 0 ? version.type === 'release' : true).map(version => version['id'])),
        new Prompt()
            .type('select')
            .name('mod')
            .message('Server type')
            .choices(['Vanilla', 'Fabric']),
        new Prompt()
            .type('text')
            .name('name')
            .message('Server name')
            .initial('A Minecraft Server'),
        new Prompt('server-port')
            .type('number')
            .initial(25565),
        new Prompt('gamemode')
            .type('select')
            .choices(['survival', 'creative', 'spectator', 'adventure']),
        new Prompt('white-list')
            .type('select')
            .choices(['false', 'true']),
        new Prompt('difficulty')
            .type('select')
            .choices(['hard', 'normal', 'easy', 'peaceful']),
        new Prompt('spawn-protection')
            .type('number')
            .initial(0),
        new Prompt('max-players')
            .type('number')
            .initial(20),
        new Prompt('view-distance')
            .type('number')
            .initial(10),
        new Prompt('level-name')
            .type('text')
            .initial('world'),
        new Prompt('level-seed')
            .type('text')
            .initial(''),
        new Prompt('level-type')
            .type('select')
            .choices(['default', 'flat', 'largeBiomes', 'amplified', 'buffet']),
        new Prompt('pvp')
            .message('PVP')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('resource-pack')
            .type('text')
            .initial(''),
        new Prompt('resource-pack-sha1')
            .type('text')
            .initial(''),
        new Prompt('allow-flight')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('allow-nether')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('spawn-animals')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('spawn-monsters')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('spawn-npcs')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('broadcast-console-to-ops')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('broadcast-rcon-to-ops')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('enable-command-block')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('enable-rcon')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('rcon.port')
            .type('number')
            .initial(25575),
        new Prompt('rcon.password')
            .type('text')
            .initial(config.defaultRconPassword || ''),
        new Prompt('entity-broadcast-range-percentage')
            .type('number')
            .initial(100),
        new Prompt('force-gamemode')
            .type('select')
            .choices(['false', 'true']),
        new Prompt('generate-structures')
            .type('select')
            .choices(['true', 'false']),
        new Prompt('hardcore')
            .type('select')
            .choices(['false', 'true']),
        new Prompt('max-build-height')
            .type('number')
            .initial(256),
        new Prompt('player-idle-timeout')
            .type('number')
            .initial(0),
        new Prompt('query.port')
            .type('number')
            .initial(25565),
    ];
    const result = await prompts(promptArray.map(prompt => prompt.prompt));
    const version = versions.filter(version => result.type === 0 ? version.type === 'release' : true)[result.version];
    spinner.text = 'Downloading jar file of Minecraft server.';
    spinner.start();
    const serverUrl = (await axios.get(version.url))?.data?.downloads?.server?.url;
    if (!serverUrl) {
        spinner.stop();
        throw new Error(error, 'Unable to download Minecraft server.');
    }
    const server = (await axios.get(serverUrl, { responseType: 'arraybuffer' })).data;
    await writeFile('./server.jar', server);
    if (result.mod) {
        spinner.text = 'Downloading fabric installer.';
        const fabricVersions = (await axios.get('https://meta.fabricmc.net/v2/versions/installer')).data;
        const fabricVersion = fabricVersions[0];
        const fabricServer = (await axios.get(fabricVersion.url, { responseType: 'arraybuffer' })).data;
        await writeFile('./fabric-installer.jar', fabricServer);
        new Promise(resolve => {
            execSync('java -jar fabric-installer.jar server');
            resolve();
        });
        switch (process.platform) {
        case 'win32':
            writeFile('./boot.bat', `@echo off
java -jar -Xms${config.memory} -Xmx${config.memory} fabric-server-launch.jar`);
            break;
        case 'darwin':
        case 'linux':
            writeFile('./boot.sh', `#!/bin/bash
java -jar -Xms${config.memory} -Xmx${config.memory} fabric-server-launch.jar`, { mode: '744' });
            break;
        }
    } else {
        switch (process.platform) {
        case 'win32':
            writeFile('./boot.bat', `@echo off
java -jar -Xms${config.memory} -Xmx${config.memory} server.jar`);
            break;
        case 'darwin':
        case 'linux':
            writeFile('./boot.sh', `#!/bin/bash
java -jar -Xms${config.memory} -Xmx${config.memory} server.jar`, { mode: '744' });
            break;
        }
    }
    switch (process.platform) {
    case 'darwin':
    case 'linux':
        writeFile('./boot-screen.sh', `#!/bin/bash
screen -dmS minecraft ./boot.sh`, { mode: '744' });
        writeFile('./attach-screen.sh', `#!/bin/bash
screen -r minecraft`, { mode: '744' });
        writeFile('./shutdown-screen.sh', `#!/bin/bash
screen -S minecraft -X eval 'stuff "stop\\015"'`, { mode: '744' });
        break;
    }
    spinner.text = 'Configuring';
    await writeFile('./eula.txt', 'eula=true\n');
    await writeFile('./server.properties', `motd=${escapeUnicode(result.name)}
server-port=${result.serverPort}
gamemode=${result.gamemode}
white-list=${!!result.whiteList}
difficulty=${['hard', 'normal', 'easy', 'peaceful'][result.difficulty]}
spawn-protection=${result.spawnProtection}
max-players=${result.maxPlayers}
view-distance=${result.viewDistance}
level-name=${result.levelName}
level-seed=${result.levelSeed}
level-type=${result.levelType}
pvp=${!result.pvp}
resource-pack=${result.resourcePack}
resource-pack-sha1=${result.resourcePackSha1}
allow-flight=${!result.allowFlight}
allow-nether=${!result.allowNether}
spawn-animals=${!result.spawnAnimals}
spawn-monsters=${!result.spawnMonsters}
spawn-npcs=${!result.spawnNpcs}
broadcast-console-to-ops=${!result.broadcastConsoleToOps}
broadcast-rcon-to-ops=${!result.broadcastRconToOps}
enable-command-block=${!result.enableCommandBlock}
enable-rcon=${!result.enableRcon}
rcon.port=${result.rconPort}
rcon.password=${result.rconPassword}
entity-broadcast-range-percentage=${result.entityBroadcastRangePercentage}
force-gamemode=${!!result.forceGamemode}
generate-structures=${!result.generateStructures}
hardcore=${!!result.hardcore}
max-build-height=${result.maxBuildHeight}
player-idle-timeout=${result.playerIdleTimeout}
query.port=${result.queryPort}
enable-query=true
`);
    spinner.stop();
    console.log(success, 'Successfully generated.');
}(argv);
