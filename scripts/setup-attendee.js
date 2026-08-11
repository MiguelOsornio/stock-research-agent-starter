/**
 * =============================================================================
 * setup-attendee.js  (for absolute beginners)
 * =============================================================================
 *
 * WHAT THIS FILE DOES (in plain English)
 * --------------------------------------
 * When many people deploy the same starter app to Render, they can accidentally
 * create services with the SAME names and collide with each other.
 *
 * This script rewrites `render.yaml` so YOUR copy is unique:
 *
 *   Project name  →  yourusername-renderatl-workshop
 *   Web service   →  yourusername-stock-research-agent-starter
 *
 * HOW TO RUN IT
 * -------------
 * Locally (replace with your GitHub username):
 *
 *   npm install
 *   npm run setup -- your-github-username
 *
 * Or on GitHub: Actions → "Setup attendee Blueprint names" → Run workflow
 *
 * AFTER THIS SCRIPT
 * -----------------
 * Deploy from the Render Dashboard (New → Blueprint) or the Render CLI.
 * The Action / this script does NOT deploy for you.
 * =============================================================================
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// "yaml" lets us edit render.yaml without breaking its formatting.
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'

// ---------------------------------------------------------------------------
// Constants (easy knobs)
// ---------------------------------------------------------------------------

/** The Blueprint file we edit. Lives at the repo root. */
const DEFAULT_BLUEPRINTS = ['render.yaml']

/**
 * Every attendee project ends with this suffix.
 * Example: username "Ada.Lovelace" → project "ada-lovelace-renderatl-workshop"
 */
const PROJECT_SUFFIX = 'renderatl-workshop'

/**
 * Known resource names in this starter.
 * We look these up so re-running the script does not double-prefix names
 * (we do not want "user-user-stock-research-agent-starter").
 */
const BASE_RESOURCE_NAMES = [
  'stock-research-agent-starter',
  'renderatl-workshop',
]

// Path helpers: find this file, then its parent folder (the repo root).
const currentFile = fileURLToPath(import.meta.url)
const defaultRoot = resolve(dirname(currentFile), '..')

// ---------------------------------------------------------------------------
// Tiny YAML helpers
// ---------------------------------------------------------------------------

/** Read a string field like `name: foo` from a YAML map node. */
function getStringAt(map, key) {
  const value = map.get(key, true)
  return isScalar(value) && typeof value.value === 'string' ? value.value : null
}

/** Write a string field on a YAML map node (keeps comments when possible). */
function setStringAt(map, key, value) {
  const node = map.get(key, true)
  if (isScalar(node)) {
    node.value = value
    return
  }
  map.set(key, value)
}

/** Get a YAML list (sequence) under a key, or null if missing. */
function getSeqAt(map, key) {
  const value = map.get(key, true)
  return isSeq(value) ? value : null
}

// ---------------------------------------------------------------------------
// Naming rules
// ---------------------------------------------------------------------------

/**
 * Turn a GitHub username into a safe Render name.
 * "Ada.Lovelace" → "ada-lovelace"
 */
function normalizeNamespace(value) {
  const namespace = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!namespace) {
    throw new Error('Namespace must contain at least one letter or number.')
  }

  return namespace
}

/** Build the Render project name: `{username}-renderatl-workshop`. */
function projectNameFor(namespace) {
  return `${namespace}-${PROJECT_SUFFIX}`
}

/**
 * Prefix a service (or other resource) with the username.
 * If it already has this username prefix, leave it alone (idempotent).
 */
function namespaceName(name, namespace) {
  if (name.startsWith(`${namespace}-`)) {
    return name
  }

  // Prefer a known base name so old prefixes can be replaced cleanly.
  const baseName = BASE_RESOURCE_NAMES.find(
    (candidate) => name === candidate || name.endsWith(`-${candidate}`),
  )

  return `${namespace}-${baseName ?? name}`
}

// ---------------------------------------------------------------------------
// Walk the Blueprint and rename things
// ---------------------------------------------------------------------------

/** Rename one resource map that has a `name:` field (services, databases, …). */
function collectNameChange(map, namespace, nameChanges, changedNames) {
  const currentName = getStringAt(map, 'name')
  if (!currentName) {
    return
  }

  const nextName = namespaceName(currentName, namespace)
  if (nextName === currentName) {
    return
  }

  nameChanges.set(currentName, nextName)
  changedNames.push({ from: currentName, to: nextName })

  for (const baseName of BASE_RESOURCE_NAMES) {
    if (currentName === baseName || currentName.endsWith(`-${baseName}`)) {
      nameChanges.set(baseName, nextName)
      break
    }
  }

  setStringAt(map, 'name', nextName)
}

/**
 * Rename the Render *project*.
 * Always becomes `{username}-renderatl-workshop` (workshop requirement).
 */
function collectProjectNameChange(map, namespace, changedNames) {
  const currentName = getStringAt(map, 'name')
  if (!currentName) {
    return
  }

  const nextName = projectNameFor(namespace)
  if (nextName === currentName) {
    return
  }

  changedNames.push({ from: currentName, to: nextName })
  setStringAt(map, 'name', nextName)
}

/** Rename every item in a YAML list of resources. */
function collectNamesFromSeq(seq, namespace, nameChanges, changedNames) {
  for (const item of seq.items) {
    if (isMap(item)) {
      collectNameChange(item, namespace, nameChanges, changedNames)
    }
  }
}

/**
 * Parse one Blueprint file as text, rename project + services, return new text.
 */
function namespaceBlueprint(source, namespace) {
  const doc = parseDocument(source)
  const nameChanges = new Map()
  const changedNames = []

  if (!isMap(doc.contents)) {
    return { contents: doc.toString(), changedNames }
  }

  // Older Blueprints sometimes put services at the root (no `projects:` block).
  const rootDatabases = getSeqAt(doc.contents, 'databases')
  const rootServices = getSeqAt(doc.contents, 'services')
  if (rootDatabases) {
    collectNamesFromSeq(rootDatabases, namespace, nameChanges, changedNames)
  }
  if (rootServices) {
    collectNamesFromSeq(rootServices, namespace, nameChanges, changedNames)
  }

  // Current starter shape: projects → environments → services
  const projects = getSeqAt(doc.contents, 'projects')
  if (projects) {
    for (const project of projects.items) {
      if (!isMap(project)) {
        continue
      }

      collectProjectNameChange(project, namespace, changedNames)

      const environments = getSeqAt(project, 'environments')
      if (!environments) {
        continue
      }

      for (const environment of environments.items) {
        if (!isMap(environment)) {
          continue
        }

        const databases = getSeqAt(environment, 'databases')
        const services = getSeqAt(environment, 'services')

        if (databases) {
          collectNamesFromSeq(databases, namespace, nameChanges, changedNames)
        }
        if (services) {
          collectNamesFromSeq(services, namespace, nameChanges, changedNames)
        }
      }
    }
  }

  return {
    contents: doc.toString(),
    changedNames,
  }
}

// ---------------------------------------------------------------------------
// CLI: read username from args or from GitHub Actions
// ---------------------------------------------------------------------------

/**
 * Supported ways to pass your username:
 *   npm run setup -- ada-lovelace
 *   npm run setup -- --namespace ada-lovelace
 *   GITHUB_ACTOR=ada-lovelace npm run setup   (used by the GitHub Action)
 */
function parseArgs(argv) {
  const args = {
    blueprints: DEFAULT_BLUEPRINTS,
    namespace: process.env.GITHUB_ACTOR,
    root: defaultRoot,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]

    if (arg.startsWith('--namespace=')) {
      args.namespace = arg.slice('--namespace='.length)
      continue
    }

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--namespace':
          if (!value) {
            throw new Error('Missing value for --namespace.')
          }
          args.namespace = value
          index += 1
          break
        case '--root':
          // Mostly for tests: point at a temporary copy of the repo.
          if (!value) {
            throw new Error('Missing value for --root.')
          }
          args.root = resolve(value)
          index += 1
          break
        default:
          throw new Error(`Unknown argument: ${arg}`)
      }
      continue
    }

    // Positional username: `npm run setup -- myuser`
    if (args.namespace && args.namespace !== process.env.GITHUB_ACTOR) {
      throw new Error(`Unexpected extra argument: ${arg}`)
    }
    args.namespace = arg
  }

  if (!args.namespace) {
    throw new Error(
      'Missing namespace. Run `npm run setup -- your-github-username`.',
    )
  }

  return {
    blueprints: args.blueprints,
    namespace: normalizeNamespace(args.namespace),
    root: args.root,
  }
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

/** Edit each Blueprint file on disk and return a summary of renames. */
async function setupAttendee({ blueprints, namespace, root }) {
  const changes = []

  for (const relativePath of blueprints) {
    const path = resolve(root, relativePath)
    const source = await readFile(path, 'utf8')
    const result = namespaceBlueprint(source, namespace)

    await writeFile(path, result.contents)
    changes.push({ path: relativePath, changedNames: result.changedNames })
  }

  return changes
}

/** Print a simple before → after list so you can see what changed. */
function printSummary(changes) {
  for (const change of changes) {
    console.log(change.path)

    if (change.changedNames.length === 0) {
      console.log('  no changes (already namespaced)')
      continue
    }

    for (const { from, to } of change.changedNames) {
      console.log(`  ${from} -> ${to}`)
    }
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2))
    const changes = await setupAttendee(args)
    printSummary(changes)
    console.log('')
    console.log('Next: deploy from the Render Dashboard (New → Blueprint) or CLI.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  }
}

// Only run main() when you execute this file directly (`node scripts/...`).
// When tests import helpers, they skip this block.
if (process.argv[1] === currentFile) {
  await main()
}

export {
  PROJECT_SUFFIX,
  namespaceBlueprint,
  namespaceName,
  normalizeNamespace,
  parseArgs,
  projectNameFor,
  setupAttendee,
}
