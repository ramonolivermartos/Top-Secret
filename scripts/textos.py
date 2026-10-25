"""Keep Textos/ in sync with the shared Drive folder. Conventions: Textos/CONVENTIONS.md.

python scripts/textos.py status           parity, stale translations, secrets and repo/Drive differences
python scripts/textos.py stamp            record that every language matches the current ES text
python scripts/textos.py push [--apply] [--force]   repo -> Drive; never overwrites what changed only in Drive
python scripts/textos.py pull-guide [--apply]   Drive -> repo for the narrative guide (kept by Claude web)
python scripts/textos.py pull-secrets [--apply] [--overwrite N ...] [--accept N ...]   Drive -> repo, Secrets/ only

Writing commands are a dry run unless --apply is given. Nothing is ever deleted.
The Drive folder defaults to ~/My Drive/Ramon Oliver/Top Secret/Textos and can be
changed with --drive or the NSG_DRIVE_TEXTOS environment variable.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXTS = ROOT / 'Textos'
STATE = TEXTS / 'translation-state.json'
DEFAULT_DRIVE = Path.home() / 'My Drive' / 'Ramon Oliver' / 'Top Secret' / 'Textos'
# Narrative directives travel with the texts so Claude web works from the same files.
DIRECTIVES = ('sequence_to_9999550.txt', 'Conspiracy_Secrets_Master_Guide_and_Tracker.md')

_spec = importlib.util.spec_from_file_location('build_translations', ROOT / 'scripts/build-translations.py')
build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build)


def digest(data):
    return hashlib.sha256(data.replace(b'\r\n', b'\n')).hexdigest()


def short(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]


WORD_RANGE = (450, 550)
# Generous: up to 20 words outside the range pass silently; beyond that the user decides.
TOLERANCE = 20
# RU and ZH are exempt from the word count: they are the translation, in their own alphabet,
# of a text that already has the expected number of words.
LENGTH_EXEMPT = ('RU', 'ZH')
LIST_MARKER = re.compile(r'^\s*([-*+•]|\d+[.)])\s+', re.M)


def style_warnings(text, folder):
    """Checks of the secret format standard (see the narrative guide).
    A length more than TOLERANCE words outside the range is reported as ASK: the user decides."""
    warnings = []
    size, (low, high) = len(text.split()), WORD_RANGE
    if folder not in LENGTH_EXEMPT and not low - TOLERANCE <= size <= high + TOLERANCE:
        warnings.append(f'ASK: {size} words, expected {low}-{high} (tolerance {TOLERANCE})')
    if LIST_MARKER.search(text) or re.search(r'^#{2,}\s', text, re.M):
        warnings.append('contains list markers or sub-headings; use continuous prose')
    return warnings


def drive_root(args):
    path = Path(args.drive or os.environ.get('NSG_DRIVE_TEXTOS') or DEFAULT_DRIVE)
    if not path.is_dir():
        raise SystemExit(f'ERROR: Drive folder not found: {path}\nUse --drive or NSG_DRIVE_TEXTOS.')
    return path


def tree(base, texts_side):
    """Relative path -> file for everything that is mirrored between repo and Drive."""
    files = {}
    for folder in build.LANGUAGES:
        for path in (base / folder).rglob('*') if (base / folder).is_dir() else []:
            if path.is_file() and path.suffix == '.md':
                files[path.relative_to(base).as_posix()] = path
    for name in ('README.md', 'CONVENTIONS.md', 'translation-state.json'):
        if (base / name).is_file():
            files[name] = base / name
    for name in DIRECTIVES:
        source = (ROOT / 'Directives' / name) if texts_side else (base / 'Directives' / name)
        if source.is_file():
            files[f'Directives/{name}'] = source
    return files


def compare(drive):
    repo, remote = tree(TEXTS, True), tree(drive, False)
    only_repo = sorted(set(repo) - set(remote))
    only_drive = sorted(set(remote) - set(repo))
    differ = sorted(p for p in set(repo) & set(remote) if digest(repo[p].read_bytes()) != digest(remote[p].read_bytes()))
    return repo, remote, only_repo, only_drive, differ


def stale_translations():
    translations = {lang: build.interface_table(build.TEXTS / folder) for folder, lang in build.LANGUAGES.items()}
    state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.is_file() else {}
    source = translations['es']
    changed = sorted(k for k, v in source.items() if k in state and state[k] != short(v))
    unstamped = sorted(k for k in source if k not in state)
    return translations, changed, unstamped


def status(args):
    problems = 0
    translations, changed, unstamped = stale_translations()
    try:
        build.check_parity(translations)
        print(f'Interface: {len(translations["es"])} keys, all {len(build.LANGUAGES)} languages in parity with ES.')
    except ValueError as error:
        problems += 1
        print(error)
    if changed:
        problems += 1
        print(f'STALE: ES changed after these {len(changed)} keys were translated (review fr/ru/zh/en, then run stamp):')
        for key in changed[:20]:
            print(f'  {key}')
    if unstamped:
        print(f'{len(unstamped)} keys are not stamped yet (run stamp after translating them).')
    entries, incomplete = build.discover_secrets(build.secret_sequence())
    for index, missing in incomplete.items():
        problems += 1
        print(f'Secret {index:03d} is incomplete in the repo: missing {", ".join(missing)}')
    for entry in entries:
        for lang, path in entry['files'].items():
            folder = Path(path).parts[1]
            for warning in style_warnings((ROOT / path).read_text(encoding='utf-8-sig'), folder):
                print(f'STYLE secreto_{entry["index"]:03d} {folder}: {warning}')
    drive = Path(args.drive or os.environ.get('NSG_DRIVE_TEXTOS') or DEFAULT_DRIVE)
    if drive.is_dir():
        _, _, only_repo, only_drive, differ = compare(drive)
        for label, items in (('only in repo (push)', only_repo), ('only in Drive', only_drive), ('differs', differ)):
            if items:
                print(f'Drive {label}: {len(items)}')
                for item in items[:30]:
                    print(f'  {item}')
        if not (only_repo or only_drive or differ):
            print('Drive and repo are identical.')
    else:
        print(f'Drive folder not found ({drive}); skipped the comparison.')
    return 1 if problems else 0


def stamp(args):
    translations, _, _ = stale_translations()
    build.check_parity(translations)
    STATE.write_text(json.dumps({k: short(v) for k, v in translations['es'].items()}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Stamped {len(translations["es"])} keys.')
    return 0


def baseline_path():
    return TEXTS / '.sync-baseline.json'


def load_baseline():
    path = baseline_path()
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else {}


def save_baseline(baseline):
    baseline_path().write_text(json.dumps(baseline, indent=2, sort_keys=True) + '\n', encoding='utf-8')


def record_identical(drive):
    """Remember the content both sides share, so a later change made only in Drive is noticed."""
    repo, remote = tree(TEXTS, True), tree(drive, False)
    baseline = load_baseline()
    for path in set(repo) & set(remote):
        value = digest(repo[path].read_bytes())
        if value == digest(remote[path].read_bytes()):
            baseline[path] = value
    save_baseline(baseline)


def push(args):
    """Repo -> Drive. A file that someone changed in Drive since the last sync is never overwritten."""
    drive = drive_root(args)
    repo, remote, only_repo, only_drive, differ = compare(drive)
    baseline = load_baseline()
    todo, conflicts = list(only_repo), []
    for path in differ:
        if baseline.get(path) == digest(remote[path].read_bytes()) or getattr(args, 'force', False):
            todo.append(path)
        else:
            conflicts.append(path)
    for path in todo:
        print(('NEW    ' if path in only_repo else 'UPDATE ') + path)
    for path in conflicts:
        print(f'CONFLICT {path}: changed in Drive since the last sync (or never synced); not overwritten. '
              f'Review it (pull-guide for the narrative guide) or use --force to overwrite Drive.')
    for path in only_drive:
        print('KEPT (only in Drive, not touched): ' + path)
    if not todo and not conflicts:
        print('Nothing to push.')
        if args.apply:
            record_identical(drive)
    elif args.apply:
        for path in todo:
            destination = drive / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repo[path], destination)
        print(f'Pushed {len(todo)} files.')
        record_identical(drive)
    else:
        print('Dry run: add --apply to write to Drive.')
    return 1 if conflicts else 0


def pull_guide(args):
    """Drive -> repo for the narrative guide, which Claude web keeps up to date."""
    drive = drive_root(args)
    name = 'Directives/Conspiracy_Secrets_Master_Guide_and_Tracker.md'
    repo, remote = tree(TEXTS, True), tree(drive, False)
    if name not in remote:
        raise SystemExit(f'ERROR: {name} not found in Drive')
    if name in repo and digest(repo[name].read_bytes()) == digest(remote[name].read_bytes()):
        print('The narrative guide is identical in the project and in Drive.')
        return 0
    print(f'The narrative guide differs ({len(remote[name].read_bytes())} bytes in Drive, '
          f'{len(repo[name].read_bytes()) if name in repo else 0} in the project).')
    if args.apply:
        shutil.copy2(remote[name], ROOT / name)
        record_identical(drive)
        print('Copied the Drive version into Directives/.')
    else:
        print('Dry run: add --apply to replace the project copy with the Drive version.')
    return 0


def pull_secrets(args):
    drive = drive_root(args)
    sequence = build.secret_sequence()
    found = {}
    for folder, lang in build.LANGUAGES.items():
        directory = drive / folder / build.SECRETS_DIR
        if not directory.is_dir():
            continue
        for path in sorted(directory.iterdir()):
            if not path.is_file():
                continue
            match = build.SECRET_NAME.fullmatch(path.name)
            if not match or not 1 <= int(match[1]) <= len(sequence):
                hint = ''
                if re.fullmatch(r'secreto_\d{3} \(\d+\)\.md', path.name):
                    hint = (' Google Drive makes this copy when a file is uploaded over an existing one: '
                            'delete the old secreto_NNN.md in that folder and rename this one to secreto_NNN.md.')
                raise SystemExit(f'ERROR: {path}: not a valid secreto_NNN.md for the sequence.{hint}')
            if not path.read_text(encoding='utf-8-sig').strip():
                raise SystemExit(f'ERROR: {path} is empty')
            found.setdefault(int(match[1]), {})[folder] = path
    copies = []
    for index, files in sorted(found.items()):
        missing = [folder for folder in build.LANGUAGES if folder not in files]
        if missing:
            print(f'SKIP secreto_{index:03d}: missing {", ".join(missing)} in Drive')
            continue
        name = f'secreto_{index:03d}.md'
        asks = False
        for folder, path in files.items():
            for warning in style_warnings(path.read_text(encoding='utf-8-sig'), folder):
                print(f'STYLE  secreto_{index:03d} {folder}: {warning}')
                asks = asks or warning.startswith('ASK')
        if asks and index not in args.accept:
            print(f'ASK    secreto_{index:03d} not imported: the length is outside the tolerance. '
                  f'Ask the user; if it stays, use --accept {index}.')
            continue
        existing = [folder for folder in files if (TEXTS / folder / build.SECRETS_DIR / name).is_file()]
        differing = [folder for folder in existing
                     if digest((TEXTS / folder / build.SECRETS_DIR / name).read_bytes()) != digest(files[folder].read_bytes())]
        if differing and index not in args.overwrite:
            print(f'CONFLICT secreto_{index:03d}: already in the repo and different in {", ".join(differing)}. '
                  f'Nothing copied; use --overwrite {index} if the new version should replace it.')
            continue
        if existing and not differing:
            print(f'OK   secreto_{index:03d}: already in the repo, identical')
            continue
        print(f'{"REPLACE" if differing else "NEW    "} secreto_{index:03d} (threshold {sequence[index - 1]}) in 5 languages')
        copies.extend((path, TEXTS / folder / build.SECRETS_DIR / name) for folder, path in files.items())
    if not copies:
        print('No secrets to import.')
    elif args.apply:
        for source, destination in copies:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        subprocess.run([sys.executable, str(ROOT / 'scripts/build-translations.py')], check=True)
        record_identical(drive)
        print('Imported and catalogue rebuilt. Run: node --test tests/*.cjs')
    else:
        print('Dry run: add --apply to copy them into the project and rebuild the catalogue.')
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--drive', help='Drive Textos folder')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('status').set_defaults(run=status)
    commands.add_parser('stamp').set_defaults(run=stamp)
    for name, run in (('push', push), ('pull-secrets', pull_secrets), ('pull-guide', pull_guide)):
        sub = commands.add_parser(name)
        sub.add_argument('--apply', action='store_true')
        if name == 'push':
            sub.add_argument('--force', action='store_true')
        if name == 'pull-secrets':
            sub.add_argument('--overwrite', type=int, nargs='*', default=[])
            sub.add_argument('--accept', type=int, nargs='*', default=[])
        sub.set_defaults(run=run)
    args = parser.parse_args(argv)
    try:
        return args.run(args)
    except ValueError as error:
        raise SystemExit(f'ERROR: {error}')


if __name__ == '__main__':
    sys.exit(main())
