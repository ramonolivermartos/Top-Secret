"""Drive <-> project synchronisation rules of scripts/textos.py, on temporary folders."""
import importlib.util
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest import mock

spec = importlib.util.spec_from_file_location('textos', Path(__file__).resolve().parents[1] / 'scripts/textos.py')
textos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(textos)
build = textos.build
LANGS = list(build.LANGUAGES)


def put(base, folder, name, content):
    path = base / folder / 'Secrets' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


class PullSecretsTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.drive, self.repo = Path(temp.name) / 'drive', Path(temp.name) / 'repo'
        self.drive.mkdir()
        self.repo.mkdir()
        patch = mock.patch.object(textos, 'TEXTS', self.repo)
        patch.start()
        self.addCleanup(patch.stop)
        run = mock.patch.object(textos.subprocess, 'run')
        self.run = run.start()
        self.addCleanup(run.stop)

    def pull(self, apply=True, overwrite=(), accept=range(1, 634)):
        # The tiny fixtures are far below the length range, so by default every index is accepted.
        return textos.pull_secrets(Namespace(drive=str(self.drive), apply=apply, overwrite=list(overwrite), accept=list(accept)))

    def test_length_outside_the_tolerance_is_not_imported_until_accepted(self):
        for folder in LANGS:
            put(self.drive, folder, 'secreto_002.md', 'too short')
        self.pull(accept=())
        self.assertFalse(any(self.repo.rglob('secreto_002.md')))
        self.run.assert_not_called()
        self.pull(accept=[2])
        self.assertTrue((self.repo / 'ES' / 'Secrets' / 'secreto_002.md').exists())

    def test_complete_secret_is_imported_and_catalogue_rebuilt(self):
        for folder in LANGS:
            put(self.drive, folder, 'secreto_002.md', f'Story {folder}')
        self.pull(apply=False)
        self.assertFalse((self.repo / 'ES' / 'Secrets' / 'secreto_002.md').exists())
        self.pull()
        for folder in LANGS:
            self.assertEqual((self.repo / folder / 'Secrets' / 'secreto_002.md').read_text(encoding='utf-8'), f'Story {folder}')
        self.run.assert_called_once()

    def test_incomplete_secret_is_not_imported(self):
        for folder in LANGS[:-1]:
            put(self.drive, folder, 'secreto_003.md', 'Story')
        self.pull()
        self.assertFalse(any(self.repo.rglob('secreto_003.md')))
        self.run.assert_not_called()

    def test_existing_secret_is_never_overwritten_without_confirmation(self):
        for folder in LANGS:
            put(self.drive, folder, 'secreto_001.md', 'New version')
            put(self.repo, folder, 'secreto_001.md', 'Integrated version')
        self.pull()
        self.assertEqual((self.repo / 'ES' / 'Secrets' / 'secreto_001.md').read_text(encoding='utf-8'), 'Integrated version')
        self.pull(overwrite=[1])
        self.assertEqual((self.repo / 'ES' / 'Secrets' / 'secreto_001.md').read_text(encoding='utf-8'), 'New version')

    def test_invalid_names_and_indices_are_rejected(self):
        put(self.drive, 'ES', 'Secreto_2.md', 'Story')
        with self.assertRaises(SystemExit):
            self.pull()
        (self.drive / 'ES' / 'Secrets' / 'Secreto_2.md').unlink()
        put(self.drive, 'ES', 'secreto_634.md', 'Story')
        with self.assertRaises(SystemExit):
            self.pull()


class StyleTests(unittest.TestCase):
    def test_range_and_lists(self):
        ok = ' '.join(['palabra'] * 500)
        self.assertEqual(textos.style_warnings(ok, 'ES'), [])
        self.assertTrue(textos.style_warnings(' '.join(['palabra'] * 300), 'EN')[0].startswith('ASK'))
        # Generous tolerance: up to 20 words outside the range pass silently.
        self.assertEqual(textos.style_warnings(' '.join(['palabra'] * 552), 'FR'), [])
        self.assertEqual(textos.style_warnings(' '.join(['palabra'] * 430), 'EN'), [])
        self.assertTrue(textos.style_warnings(' '.join(['palabra'] * 571), 'ES'))
        self.assertTrue(textos.style_warnings(ok + '\n- uno\n- dos', 'FR'))
        self.assertTrue(textos.style_warnings(ok + '\n## Subtítulo', 'RU'))
        # RU and ZH are exempt from the word count, but not from the no-lists rule.
        self.assertEqual(textos.style_warnings('字' * 400, 'ZH'), [])
        self.assertEqual(textos.style_warnings(' '.join(['слово'] * 432), 'RU'), [])
        self.assertTrue(textos.style_warnings('字' * 400 + '\n- uno', 'ZH'))


class PushTests(unittest.TestCase):
    def test_push_copies_new_and_changed_files_and_never_deletes(self):
        with tempfile.TemporaryDirectory() as temp:
            repo, drive = Path(temp) / 'repo', Path(temp) / 'drive'
            put(repo, 'ES', 'secreto_001.md', 'A')
            put(drive, 'ES', 'secreto_001.md', 'old')
            put(drive, 'ES', 'only_in_drive.md', 'keep')
            with mock.patch.object(textos, 'TEXTS', repo):
                # Never synced: the Drive copy might hold someone else's work, so it is not overwritten.
                self.assertEqual(textos.push(Namespace(drive=str(drive), apply=True)), 1)
                self.assertEqual((drive / 'ES' / 'Secrets' / 'secreto_001.md').read_text(encoding='utf-8'), 'old')
                textos.push(Namespace(drive=str(drive), apply=True, force=True))
            self.assertEqual((drive / 'ES' / 'Secrets' / 'secreto_001.md').read_text(encoding='utf-8'), 'A')
            self.assertTrue((drive / 'ES' / 'Secrets' / 'only_in_drive.md').exists())

    def test_push_never_overwrites_a_change_made_only_in_drive(self):
        with tempfile.TemporaryDirectory() as temp:
            repo, drive = Path(temp) / 'repo', Path(temp) / 'drive'
            drive.mkdir()
            put(repo, 'ES', 'secreto_001.md', 'v1')
            with mock.patch.object(textos, 'TEXTS', repo):
                textos.push(Namespace(drive=str(drive), apply=True))  # new file: copied, baseline recorded
                put(repo, 'ES', 'secreto_001.md', 'v2 from the project')
                textos.push(Namespace(drive=str(drive), apply=True))  # Drive unchanged since the sync: updated
                self.assertEqual((drive / 'ES' / 'Secrets' / 'secreto_001.md').read_text(encoding='utf-8'), 'v2 from the project')
                put(drive, 'ES', 'secreto_001.md', 'v3 edited in Drive')
                put(repo, 'ES', 'secreto_001.md', 'v4 from the project')
                self.assertEqual(textos.push(Namespace(drive=str(drive), apply=True)), 1)
            self.assertEqual((drive / 'ES' / 'Secrets' / 'secreto_001.md').read_text(encoding='utf-8'), 'v3 edited in Drive')

    def test_pull_guide_copies_the_drive_version(self):
        with tempfile.TemporaryDirectory() as temp:
            root, drive = Path(temp) / 'project', Path(temp) / 'drive'
            guide = 'Directives/Conspiracy_Secrets_Master_Guide_and_Tracker.md'
            (root / 'Directives').mkdir(parents=True)
            (drive / 'Directives').mkdir(parents=True)
            (root / guide).write_text('project', encoding='utf-8')
            (drive / guide).write_text('written by Claude web', encoding='utf-8')
            with mock.patch.object(textos, 'ROOT', root), mock.patch.object(textos, 'TEXTS', root / 'Textos'):
                (root / 'Textos').mkdir()
                textos.pull_guide(Namespace(drive=str(drive), apply=False))
                self.assertEqual((root / guide).read_text(encoding='utf-8'), 'project')
                textos.pull_guide(Namespace(drive=str(drive), apply=True))
            self.assertEqual((root / guide).read_text(encoding='utf-8'), 'written by Claude web')


if __name__ == '__main__':
    unittest.main()
