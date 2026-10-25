"""Validate the Markdown sources in Textos/ and build the browser catalogue.

python scripts/build-translations.py

Conventions live in Textos/CONVENTIONS.md. Spanish (ES) is the source language:
every other language must define exactly the same interface keys with the same
{{variables}}. Drive synchronisation is a separate tool: scripts/textos.py.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXTS = ROOT / 'Textos'
LANGUAGES = {'ES': 'es', 'EN': 'en', 'FR': 'fr', 'RU': 'ru', 'ZH': 'zh-Hans'}
SOURCE = 'ES'
INTERFACE_DIRS = ('Common', 'Games')
MESSAGE_FILES = {'victory': 'Messages/victory.md', 'defeat': 'Messages/defeat.md'}
PLAYER_DESCRIPTIONS = 'Player/descriptions.md'
SECRETS_DIR = 'Secrets'
SECRET_NAME = re.compile(r'secreto_(\d{3})\.md')
SEQUENCE = ROOT / 'Directives/sequence_to_9999550.txt'
# Latin-alphabet languages keep the "at most three words" format; ru/zh adapt freely.
LATIN_DESCRIPTION = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœ'’-]+(?: [A-Za-zÀ-ÖØ-öø-ÿŒœ'’-]+){0,2}")
PLACEHOLDER = re.compile(r'{{\w+}}')


def numbered_list(path, expected=None):
    matches = re.findall(r'^\s*(\d+)[.)]\s+(.+)$', path.read_text(encoding='utf-8-sig'), re.M)
    numbers = [int(n) for n, _ in matches]
    if not matches or numbers != list(range(1, len(matches) + 1)) or (expected and len(matches) != expected):
        raise ValueError(f'{path}: expected a list numbered from 1 without gaps' + (f' up to {expected}' if expected else ''))
    return [value.strip() for _, value in matches]


def player_descriptions(directory, lang):
    path = directory / PLAYER_DESCRIPTIONS
    if not path.is_file():
        raise ValueError(f'{directory.name}: missing {PLAYER_DESCRIPTIONS}')
    values = numbered_list(path)
    if lang in ('es', 'en', 'fr'):
        for value in values:
            if not LATIN_DESCRIPTION.fullmatch(value):
                raise ValueError(f'{path}: "{value}" must be at most three Latin-alphabet words')
    return values


def secret_sequence():
    rows = re.findall(r'^(\d+)\s+(\d+)\s+(?:Original|Generated)\s*$', SEQUENCE.read_text(), re.M)
    if [int(index) for index, _ in rows] != list(range(1, 634)):
        raise ValueError(f'{SEQUENCE}: expected 633 consecutive indices')
    values = [int(value) for _, value in rows]
    if any(a >= b for a, b in zip(values, values[1:])) or values[-1] != 9999550:
        raise ValueError(f'{SEQUENCE}: invalid threshold ordering or final value')
    return values


def discover_secrets(sequence):
    """Secrets are Secrets/secreto_NNN.md in every language folder. Only indices
    present in all five languages are published; the rest are reported."""
    found = {}
    for folder, lang in LANGUAGES.items():
        directory = TEXTS / folder / SECRETS_DIR
        if not directory.is_dir():
            continue
        for path in sorted(directory.iterdir()):
            if not path.is_file():
                continue
            match = SECRET_NAME.fullmatch(path.name)
            if not match:
                raise ValueError(f'{path}: secrets must be named secreto_NNN.md (three digits)')
            index = int(match[1])
            if not 1 <= index <= len(sequence):
                raise ValueError(f'{path}: secret index outside the sequence')
            found.setdefault(index, {})[lang] = path.relative_to(ROOT).as_posix()
    complete = [dict(id=f'secreto-{index}', index=index, threshold=sequence[index - 1], files=files)
                for index, files in sorted(found.items()) if len(files) == len(LANGUAGES)]
    incomplete = {index: sorted(set(LANGUAGES.values()) - set(files))
                  for index, files in sorted(found.items()) if len(files) != len(LANGUAGES)}
    return complete, incomplete


def update_guide_registry(sequence):
    path = ROOT / 'Directives/Conspiracy_Secrets_Master_Guide_and_Tracker.md'
    if path.exists():
        text = path.read_text(encoding='utf-8')
        # Only the generated score column changes; narrative and QA status stay intact.
        text = re.sub(r'^(\| (\d{3}) \| )[^|]+(\|)',
                      lambda m: m[1] + str(sequence[int(m[2]) - 1]) + ' ' + m[3], text, flags=re.M)
        path.write_text(text, encoding='utf-8')


def interface_files(directory):
    return sorted(path for name in INTERFACE_DIRS if (directory / name).is_dir()
                  for path in (directory / name).rglob('*.md'))


def interface_table(directory):
    table = {}
    for path in interface_files(directory):
        for block in re.findall(r'```json\s*\n(.*?)\n```', path.read_text(encoding='utf-8-sig'), re.S):
            data = json.loads(block)
            if not isinstance(data, dict) or any(not isinstance(v, str) for v in data.values()):
                raise ValueError(f'{path}: expected a JSON object of string translations')
            for key in data:
                if key in table:
                    raise ValueError(f'{path}: duplicate key {key}')
            table.update(data)
    return table


def check_parity(translations):
    """ES is the reference: same keys and same {{variables}} in every language."""
    reference = translations['es']
    errors = []
    for lang, table in translations.items():
        if lang == 'es':
            continue
        missing = sorted(set(reference) - set(table))
        extra = sorted(set(table) - set(reference))
        if missing:
            errors.append(f'{lang}: {len(missing)} keys missing, e.g. {", ".join(missing[:5])}')
        if extra:
            errors.append(f'{lang}: {len(extra)} keys not in ES, e.g. {", ".join(extra[:5])}')
        for key in sorted(set(reference) & set(table)):
            if sorted(PLACEHOLDER.findall(reference[key])) != sorted(PLACEHOLDER.findall(table[key])):
                errors.append(f'{lang}: incorrect placeholders for {key}')
    if errors:
        raise ValueError('Translations out of sync with ES:\n  ' + '\n  '.join(errors))


def catalogue():
    result = {'translations': {}, 'messages': {}, 'playerDescriptions': {}, 'secrets': {}}
    for folder, lang in LANGUAGES.items():
        directory = TEXTS / folder
        result['translations'][lang] = interface_table(directory)
        result['messages'][lang] = {kind: numbered_list(directory / name, 50) for kind, name in MESSAGE_FILES.items()}
        result['playerDescriptions'][lang] = player_descriptions(directory, lang)
    check_parity(result['translations'])

    # Entry N is the same character in every language, so all lists must match.
    counts = {lang: len(values) for lang, values in result['playerDescriptions'].items()}
    if len(set(counts.values())) != 1:
        raise ValueError(f'Player descriptions must have the same length in every language: {counts}')

    entries, incomplete = discover_secrets(secret_sequence())
    result['secretEntries'] = entries
    result['incompleteSecrets'] = incomplete
    result['secretFiles'] = {entry['id']: entry['files'] for entry in entries}
    for paths in result['secretFiles'].values():
        for path in paths.values():
            result['secrets'][path] = (ROOT / path).read_bytes().decode('utf-8-sig')
    return result


MESSAGES_TEMPLATE = '''// Generated from Textos/{ES,EN}/Messages/*.md by scripts/build-translations.py. Do not edit.
(function () {
  window.NSG_MESSAGES = %s;

  if (window.NSG_TEXTS) Object.assign(window.NSG_MESSAGES, window.NSG_TEXTS.messages);

  window.NSG_MESSAGES.random = function (lang, kind) {
    const pool = (window.NSG_MESSAGES[lang] && window.NSG_MESSAGES[lang][kind])
      || window.NSG_MESSAGES.en[kind];
    return pool[Math.floor(Math.random() * pool.length)];
  };
})();
'''


def messages_fallback(messages):
    """Offline fallback (es/en) for pages that do not load the catalogue, for example during development of a new page."""
    pools = {lang: messages[lang] for lang in ('es', 'en')}
    body = json.dumps(pools, ensure_ascii=False, indent=2).replace('\n', '\n  ')
    return MESSAGES_TEMPLATE % body


def main():
    data = catalogue()
    incomplete = data.pop('incompleteSecrets')
    output = '// Generated from Textos/**/*.md by scripts/build-translations.py. Do not edit.\n'
    output += 'window.NSG_TEXTS = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'scripts/localization-data.js').write_text(output, encoding='utf-8')
    entries = '// Generated from Directives/sequence_to_9999550.txt and Textos/*/Secrets/secreto_NNN.md.\n'
    entries += 'window.NSG_SECRETS_DATA = ' + json.dumps(data['secretEntries'], ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'scripts/secrets-data.js').write_text(entries, encoding='utf-8')
    (ROOT / 'scripts/messages-data.js').write_text(messages_fallback(data['messages']), encoding='utf-8')
    update_guide_registry(secret_sequence())
    keys = len(data['translations']['es'])
    print(f'{keys} interface keys x {len(LANGUAGES)} languages, 50 victory + 50 defeat messages, '
          f'{len(data["playerDescriptions"]["es"])} player descriptions, {len(data["secretEntries"])} secrets published')
    for index, missing in incomplete.items():
        print(f'WARNING: secreto_{index:03d} not published: missing {", ".join(missing)}')


if __name__ == '__main__':
    try:
        main()
    except ValueError as error:
        raise SystemExit(f'ERROR: {error}')
