/*
 * Copyright (C) 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');

const ANDROID_BUILD_TOP = path.resolve(__dirname, '../../../../');
const WINSCOPE_TOP = path.resolve(__dirname, '..');
const PERFETTO_TOP = path.join(ANDROID_BUILD_TOP, 'external', 'perfetto');
const OUT_TOP = path.resolve(__dirname, '..', 'deps_build', 'protos');

build();

async function build() {
    if (fs.existsSync(OUT_TOP)) {
        fs.rmSync(OUT_TOP, { recursive: true, force: true });
    }

    const promises = [
        // IME
        buildProtos([
            '../../../../frameworks/base/core/proto/android/view/inputmethod/inputmethodeditortrace.proto'
        ], 'ime/udc'),
        buildProtos([
            'ime/latest/wrapper.proto',
        ], 'ime/latest'),

        // ProtoLog
        buildProtos([
            'protolog/udc/protolog.proto'
        ], 'protolog/udc'),
        buildProtos([
            '../../../../external/perfetto/protos/perfetto/trace/android/protolog.proto'
        ], 'protolog/latest'),

        // SurfaceFlinger
        buildProtos([
            'surfaceflinger/udc/layerstrace.proto',
        ], 'surfaceflinger/udc'),
        buildProtos([
            '../../../../external/perfetto/protos/perfetto/trace/android/surfaceflinger_layers.proto',
        ], 'surfaceflinger/latest'),

        // Transactions
        buildProtos([
            'surfaceflinger/udc/transactions.proto',
        ], 'transactions/udc'),
        buildProtos([
            '../../../../external/perfetto/protos/perfetto/trace/android/surfaceflinger_transactions.proto',
        ], 'transactions/latest'),

        // Transitions
        buildProtos([
            'transitions/udc/windowmanagertransitiontrace.proto',
            'transitions/udc/wm_shell_transition_trace.proto'
        ], 'transitions/udc'),
        buildProtos([
            '../../../../external/perfetto/protos/perfetto/trace/android/shell_transition.proto',
        ], 'transitions/latest'),

        // ViewCapture
        buildProtos([
            '../../../../frameworks/libs/systemui/viewcapturelib/src/com/android/app/viewcapture/proto/view_capture.proto'
        ], 'viewcapture/udc'),
        buildProtos([
            'viewcapture/latest/wrapper.proto',
        ], 'viewcapture/latest'),

        // WindowManager
        buildProtos([
            '../../../../frameworks/base/core/proto/android/server/windowmanagertrace.proto',
        ], 'windowmanager/udc'),
        buildProtos([
            'windowmanager/latest/wrapper.proto',
        ], 'windowmanager/latest'),

        // Input
        buildProtos([
            '../../../../external/perfetto/protos/perfetto/trace/android/android_input_event.proto',
            'input/latest/input_event_wrapper.proto',
        ], 'input/latest'),

        // Test proto fields
        buildProtos([
            'test/fake_proto_test.proto',
        ], 'test/fake_proto'),

        // Test intdef translation
        buildProtos([
            'test/intdef_translation_test.proto',
        ], 'test/intdef_translation'),
    ];

    await Promise.all(promises);
}

async function buildProtos(protoPaths, outSubdir) {
    const outDir = path.join(OUT_TOP, ...outSubdir.split('/'));
    const protoFullPaths = protoPaths.map((p) => path.resolve(__dirname, p));
    const rootName = outSubdir.replaceAll('/', '_');

    const commandBuildJson = [
        'npx',
        'pbjs',
        '--force-long',
        '--target json-module',
        '--wrap es6',
        `--out "${path.join(outDir, 'json.js')}"`,
        `--root ${rootName}`,
        `--path "${PERFETTO_TOP}"`,
        `--path "${WINSCOPE_TOP}"`,
        `--path "${ANDROID_BUILD_TOP}"`,
        protoFullPaths.map(p => `"${p}"`).join(' ')
    ].join(' ');

    const commandBuildJs = [
        'npx',
        'pbjs',
        '--force-long',
        '--target static-module',
        `--root ${outSubdir.replace('/', '')}`,
        `--out "${path.join(outDir, 'static.js')}"`,
        `--path "${PERFETTO_TOP}"`,
        `--path "${WINSCOPE_TOP}"`,
        `--path "${ANDROID_BUILD_TOP}"`,
        protoFullPaths.map(p => `"${p}"`).join(' '),
    ].join(' ');

    const commandBuildTs = [
        'npx',
        'pbts',
        `--out "${path.join(outDir, 'static.d.ts')}"`,
        `"${path.join(outDir, 'static.js')}"`
    ].join(' ');

    fs.mkdirSync(outDir, { recursive: true });
    try {
        await runCommand(commandBuildJson);
        await runCommand(commandBuildJs);
        await runCommand(commandBuildTs);
        console.log(`  [OK] ${outSubdir}`);
    } catch (e) {
        console.warn(`  [SKIP] ${outSubdir} - creating stubs`);
        const stubJson = `import * as $protobuf from "protobufjs/minimal";\nconst $root = $protobuf.roots["${rootName}"] || ($protobuf.roots["${rootName}"] = {});\nexport { $root as default };\n`;
        const stubJs = `import * as $protobuf from "protobufjs/minimal";\nconst $root = $protobuf.roots["${rootName}"] || ($protobuf.roots["${rootName}"] = {});\nexport { $root as default };\n`;
        const stubTs = `import * as $protobuf from "protobufjs";\n`;
        fs.writeFileSync(path.join(outDir, 'json.js'), stubJson);
        fs.writeFileSync(path.join(outDir, 'static.js'), stubJs);
        fs.writeFileSync(path.join(outDir, 'static.d.ts'), stubTs);
    }
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                const errorMessage =
                    "Failed to execute command" +
                    `\n\ncommand: ${command}` +
                    `\n\nstdout: ${stdout}` +
                    `\n\nstderr: ${stderr}`;
                reject(errorMessage);
            }
            resolve();
        });
    });
}
