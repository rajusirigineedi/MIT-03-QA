import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDir, locate } from '../package/load.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function copyWorkingCopy(inputPath: string): Promise<number> {
    const paths = await locate(resolve(inputPath));
    if (!paths.packageDir) {
        console.error(`No task package found for ${inputPath}.`);
        return 1;
    }

    const source = join(paths.packageDir, 'reviewer-working-copy');
    if (!(await isDir(source))) {
        console.error(`No reviewer-working-copy directory found for ${inputPath}.`);
        return 1;
    }

    const destination = join(
        projectRoot,
        'out',
        paths.slug,
        'reviewer-working-copy',
    );
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    await cp(source, destination, {
        recursive: true,
        force: true,
        filter: (path) => !path.endsWith('.DS_Store'),
    });

    console.log(`task:         ${paths.slug}`);
    console.log(`working copy: ${relativeToProject(destination)}`);
    return 0;
}

function relativeToProject(path: string): string {
    return path.startsWith(projectRoot)
        ? path.slice(projectRoot.length + 1)
        : path;
}