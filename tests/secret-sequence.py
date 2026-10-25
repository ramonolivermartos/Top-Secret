"""Validate indexed secret discovery without writing fictional stories to the project."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('translations', Path(__file__).resolve().parents[1] / 'scripts/build-translations.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SecretSequenceTests(unittest.TestCase):
    def test_authoritative_sequence(self):
        values = module.secret_sequence()
        self.assertEqual(len(values), 633)
        self.assertEqual(values[:4], [150, 600, 1205, 2410])
        self.assertEqual(values[-1], 9999550)

    def test_discovery_with_gaps_and_incomplete_secrets(self):
        sequence = module.secret_sequence()
        original_root, original_texts = module.ROOT, module.TEXTS
        try:
            with tempfile.TemporaryDirectory() as temp:
                module.ROOT = Path(temp)
                module.TEXTS = Path(temp) / 'Textos'
                for folder in module.LANGUAGES:
                    directory = module.TEXTS / folder / 'Secrets'
                    directory.mkdir(parents=True)
                    for name in ['secreto_004.md', 'secreto_112.md']:
                        (directory / name).write_text('Fixture', encoding='utf-8')
                entries, incomplete = module.discover_secrets(sequence)
                self.assertEqual([e['index'] for e in entries], [4, 112])
                self.assertEqual([e['threshold'] for e in entries], [sequence[3], sequence[111]])
                self.assertTrue(all(len(e['files']) == 5 for e in entries))
                self.assertEqual(incomplete, {})
                # A secret missing in one language is reported, never published half done.
                (module.TEXTS / 'RU' / 'Secrets' / 'secreto_112.md').unlink()
                entries, incomplete = module.discover_secrets(sequence)
                self.assertEqual([e['index'] for e in entries], [4])
                self.assertEqual(incomplete, {112: ['ru']})
                # Names outside the convention and indices outside the sequence are errors.
                (directory / 'Secreto_7.md').write_text('Fixture')
                with self.assertRaises(ValueError):
                    module.discover_secrets(sequence)
                (directory / 'Secreto_7.md').unlink()
                (directory / 'secreto_634.md').write_text('Fixture')
                with self.assertRaises(ValueError):
                    module.discover_secrets(sequence)
        finally:
            module.ROOT, module.TEXTS = original_root, original_texts


if __name__ == '__main__':
    unittest.main()
