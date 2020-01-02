import * as Bunyan from 'bunyan';
import * as Config from 'config';
import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as moment from 'moment';
import * as commandLineArgs from 'command-line-args';
import * as commandLineUsage from 'command-line-usage';

const optionDefinitions = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Display this usage guide.'
    },
    {
        name: 'ual',
        alias: 'u',
        type: Boolean,
        description: 'Move up level.'
    },
    {
        name: 'path',
        alias: 'p',
        type: String,
        description: 'Use "--path" to define the path of the folder containing the subfolders to rename.'
    }
];

const sections = [
    {
        header: 'My Tools',
        content: 'Various.'
    },
    {
        header: 'Options',
        optionList: optionDefinitions
    },
    {
        header: 'Synopsis',
        content: [
            '$ node ./index.js {bold -h}',
            '$ node ./index.js {bold --path //kptnas002/media/pictures}'
        ]
    }
];

// Ensure the user's command-line arguments are present and correct.
const inputOptions = commandLineArgs(optionDefinitions);
if (inputOptions.help) {
    /* tslint:disable no-console*/
    console.log(commandLineUsage(sections));
    /* tslint:enable no-console*/
    process.exit(0);
}

const log = Bunyan.createLogger({
    name: Config.get<string>('log.name'),
    level: Config.get<Bunyan.LogLevel>('log.level'),
    serializers: Bunyan.stdSerializers,
    src: true
});

(async () => {
    try {
        log.debug('Starting...');
        log.debug({ path: inputOptions.path }, 'Path');
        const contents = fs.readdirSync(inputOptions.path);
        for (const folder of contents) {
            const stats = fs.statSync(`${inputOptions.path}/${folder}`);
            if (stats.isDirectory()) {
                let flr = folder;
                if (folder.indexOf(',') >= 0) {
                    flr = folder.split(',').pop();
                }
                const nameMoment = moment(flr);
                const newName = nameMoment.format('YYYY MM DD');
                if (newName !== flr) {
                    const oldPath = `${inputOptions.path}/${folder}`;
                    const newPath = `${inputOptions.path}/${newName}`;
                    // Does the new path already exist?
                    const exists: boolean = fse.pathExistsSync(newPath);
                    if (exists) {
                        // Move over contents
                        const files = fs.readdirSync(oldPath);
                        for (const file of files) {
                            await fse.move(
                                `${oldPath}/${file}`,
                                `${newPath}/${file}`
                            );
                        }
                        await fse.remove(oldPath);
                        log.debug({ oldPath, newPath }, 'Moved');
                    } else {
                        fs.renameSync(oldPath, newPath);
                        log.debug({ oldPath, newPath }, 'Renamed');
                    }
                }
            }
        }

        if (inputOptions.ual) {
            log.debug('Moving up a level...');
            const upLevel = path.dirname(inputOptions.path);
            log.debug({ upLevel }, 'Up level');
            const contents = fs.readdirSync(inputOptions.path);
            for (const folder of contents) {
                const stats = fs.statSync(`${inputOptions.path}/${folder}`);
                if (stats.isDirectory()) {
                    const oldPath = `${inputOptions.path}/${folder}`;
                    const newPath = `${upLevel}/${folder}`;
                    // Does the new path already exist?
                    const exists: boolean = fse.pathExistsSync(newPath);
                    if (exists) {
                        // Move over contents
                        const files = fs.readdirSync(oldPath);
                        let remove: boolean = true;
                        for (const file of files) {
                            const newFile = `${newPath}/${file}`;
                            if (!fse.pathExistsSync(newFile)) {
                                await fse.move(
                                    `${oldPath}/${file}`,
                                    newFile
                                );
                            } else {
                                remove = false;
                                log.warn({ file: newFile }, 'Already exists!');
                            }
                        }
                        if (remove) {
                            await fse.remove(oldPath);
                            log.debug({ oldPath, newPath }, 'Moved');
                        } else {
                            log.debug({ oldPath }, 'Left alone');
                        }
                    } else {
                        fs.renameSync(oldPath, newPath);
                        log.debug({ oldPath, newPath }, 'Renamed');
                    }
                }
            }
        }
    } catch (err) {
        log.error({ error: err });
    }
})();
log.debug('Finished...');
