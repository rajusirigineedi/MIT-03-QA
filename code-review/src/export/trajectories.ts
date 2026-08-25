import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locate } from '../package/load.ts';
import { indexTrials } from '../package/trials.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface TrialResult {
    agent_result?: unknown;
    verifier_result?: unknown;
}

export async function collectTrajectories(inputPath: string): Promise<number> {
    const paths = await locate(resolve(inputPath));
    if (!paths.trajectoriesDir) {
        console.error(`No trajectories directory found for ${inputPath}.`);
        return 1;
    }

    const trials = await indexTrials(paths.trajectoriesDir);
    const selectedTrials = [...trials.byModel.values()].flatMap((modelTrials) => {
        const firstPassing = modelTrials.find((trial) => trial.solved);
        return modelTrials.filter(
            (trial) => !trial.solved || trial === firstPassing,
        );
    });
    const outRoot = join(projectRoot, 'out', paths.slug, 'trajectories');
    let copiedFiles = 0;
    await rm(outRoot, { recursive: true, force: true });

    for (const trial of selectedTrials) {
        const status = trial.solved ? 'pass' : 'fail';
        const attemptOut = join(
            outRoot,
            trial.model,
            `${trial.attempt}-${status}`,
        );
        const verifierOut = join(attemptOut, 'verifier');
        await mkdir(verifierOut, { recursive: true });

        if (trial.paths.testStdout) {
            await copyFile(
                trial.paths.testStdout,
                join(verifierOut, 'test-stdout.txt'),
            );
            copiedFiles++;
        }

        const rewardPath = join(trial.dir, 'verifier', 'reward.txt');
        try {
            await copyFile(rewardPath, join(verifierOut, 'reward.txt'));
            copiedFiles++;
        } catch { }

        if (trial.paths.result) {
            const result = JSON.parse(
                await readFile(trial.paths.result, 'utf8'),
            ) as TrialResult;
            const selected = {
                agent_result: result.agent_result ?? null,
                verifier_result: result.verifier_result ?? null,
            };
            await writeFile(
                join(attemptOut, 'result.json'),
                `${JSON.stringify(selected, null, 2)}\n`,
                'utf8',
            );
            copiedFiles++;
        }
    }

    console.log(`task:         ${paths.slug}`);
    console.log(`attempts:     ${selectedTrials.length}/${trials.total} selected`);
    console.log(`files copied: ${copiedFiles}`);
    console.log(`trajectories: ${relativeToProject(outRoot)}`);
    return 0;
}

function relativeToProject(path: string): string {
    return path.startsWith(projectRoot)
        ? path.slice(projectRoot.length + 1)
        : path;
}