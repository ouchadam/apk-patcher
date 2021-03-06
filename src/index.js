#!/usr/bin/env node

const program = require('commander');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const glob = require("glob")
const fetch = require("node-fetch")
const fs = require("fs")

const workingDir = `${__dirname}/..`
const assets = `${workingDir}/assets`
const tmpDir = `${workingDir}/tmp-build`
const libDir = `${workingDir}/lib`
const apktool = `${libDir}/apktool.sh`
let zipalign;

if (process.platform === "darwin") {
    zipalign = `${libDir}/darwin/zipalign`
} else {
    zipalign = `${libDir}/linux/zipalign`
}

const apksigner = `${libDir}/apksigner`

program
    .command('diff <file-a> <file-b>')
    .action((fileA, fileB) => {
        diff(fileA, fileB).catch(error => console.log(error))
    })

const diff = async (fileA, fileB) => {
    await execute(`${apktool} d -f ${fileA} -o ${tmpDir}/a`)
    await execute(`${apktool} d -f ${fileB} -o ${tmpDir}/b`)
    await execute(`diff --new-file -ruNB -x 'apktool.yml' ${tmpDir}/a ${tmpDir}/b > ${tmpDir}/diff.patch`, true)

    await execute(`sed -i '' -e "s|${tmpDir}/a/||g" ${tmpDir}/diff.patch`)
    await execute(`sed -i '' -e "s|${tmpDir}/b/||g" ${tmpDir}/diff.patch`)

    await execute(`cp ${tmpDir}/diff.patch .`)
    await execute(`rm -r ${tmpDir}`)
}

program
    .command('patch <input> [patches]')
    .action((input, patches) => {
        main(input, patches)
            .catch(err => {
                console.log("")
                console.log("Encountered error:")
                console.error(err.cmd)
                console.error(err.message)
                return execute(`rm -r ${tmpDir}`)
            })
    })

program.parse(process.argv);

async function main(apkInput, patches) {
    const inputName = apkInput.replace(".apk", "")

    const unalignedOutputName = `${tmpDir}/${inputName}.unaligned`
    const unsignedOutputName = `${inputName}-patched-unsigned.apk`
    const signedOutput = `${inputName}-patched-signed.apk`

    await execute(`${apktool} d -f ${apkInput} -o ${tmpDir}`)

    const patchFiles = await findPatches(patches)
    await Promise.all(patchFiles.map(patchFile => {
        return execute(`patch -f -u -d ${tmpDir} -p0 < ${patchFile}`)
            .catch((error) => {
                console.log(error)
            })
    }))
    await execute(`${apktool} empty-framework-dir`)
    await execute(`${apktool} b -f ${tmpDir} -o ${unalignedOutputName}`)
    await execute(`${zipalign} -v 4 ${unalignedOutputName} ${unsignedOutputName}`)
    await execute(`cp ${unsignedOutputName} ${tmpDir}/${signedOutput}`)
    await execute(`${apksigner} sign --ks ${assets}/key.keystore --ks-key-alias android --ks-pass pass:android ${tmpDir}/${signedOutput}`)
    await execute(`cp ${tmpDir}/${signedOutput} ${signedOutput}`)
    await execute(`rm -r ${tmpDir}`)

    console.log(`Finished, generated: \n${signedOutput} \n${unsignedOutputName}`)
}

async function execute(command, ignoreExitCode) {
    try {
        const { stdout } = await exec(command);
        if (stdout.length != 0) {
            console.log(stdout.trim());
        }
    } catch (err) {
        if (!ignoreExitCode) {
            throw { cmd: err.cmd, message: err.stderr }
        }
    }
}

async function findPatches(path) {
    if (path.includes("http://") || path.includes("https://")) {
        console.log(`Pulling patch ${path}`)
        const result = await fetch(path)
        const outputFile = `${tmpDir}/import.patch`
        const fileStream = fs.createWriteStream(outputFile)
        await new Promise((resolve, reject) => {
            result.body.pipe(fileStream)
            result.body.on("error", reject)
            fileStream.on("finish", resolve)
        });
        return [outputFile]
    } else if (path.includes(",")) {
        return path.split(",").map((each => findPatches(each))).flat()
    } else if (path.includes(".patch")) {
        return [path]
    } else {
        return glob.sync(`${path}/*.patch`)
    }
}