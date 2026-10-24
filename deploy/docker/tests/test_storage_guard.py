import datetime
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("storage_guard", Path(__file__).parents[1] / "scripts/storage-guard.py")
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
NOW = datetime.datetime(2026, 10, 24, tzinfo=datetime.timezone.utc)
RELEASES = [str(number) * 40 for number in range(1, 6)]


def image(revision, repository="dispatch-board-app", age=10, identity=None):
    return {"Id": identity or revision, "RepoTags": [f"{repository}:{revision}"], "Created": (NOW - datetime.timedelta(days=age)).isoformat()}


class RetentionTests(unittest.TestCase):
    def candidates(self, images, containers=(), current=RELEASES[-1]):
        return guard.cleanup_candidates(images, set(containers), RELEASES, current, NOW)

    def test_preserves_current_and_two_verified_rollbacks(self):
        self.assertEqual(self.candidates([image(revision) for revision in RELEASES]), [f"dispatch-board-app:{revision}" for revision in RELEASES[:2]])

    def test_preserves_running_and_stopped_container_images(self):
        self.assertEqual(self.candidates([image(RELEASES[0])], [RELEASES[0]]), [])

    def test_preserves_unknown_legacy_releases_and_other_repositories(self):
        self.assertEqual(self.candidates([image("a" * 40), image(RELEASES[0], "postgres"), image("latest")]), [])

    def test_preserves_images_younger_than_seven_days(self):
        self.assertEqual(self.candidates([image(RELEASES[0], age=1)]), [])

    def test_protects_shared_image_id_of_rollback_release(self):
        self.assertEqual(self.candidates([image(RELEASES[0], identity="shared"), image(RELEASES[-1], identity="shared")]), [])

    def test_protects_current_revision_even_if_ledger_is_old(self):
        self.assertEqual(self.candidates([image(RELEASES[0])], current=RELEASES[0]), [])

    def test_handles_untagged_images_without_pruning_them(self):
        candidate = image(RELEASES[0])
        candidate["RepoTags"] = None
        self.assertEqual(self.candidates([candidate]), [])

    def test_scopes_expiration_to_three_application_repositories(self):
        for repository in guard.REPOSITORIES:
            self.assertEqual(self.candidates([image(RELEASES[0], repository)]), [f"{repository}:{RELEASES[0]}"])

    def test_ledger_records_verified_pair_atomically(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "releases.json"
            guard.record_releases(path, RELEASES[:2], RELEASES[1], RELEASES[2])
            self.assertEqual(guard.read_releases(path), RELEASES[:3])
            self.assertFalse(path.with_suffix(".tmp").exists())

    def test_invalid_ledger_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "releases.json"
            path.write_text(json.dumps(["latest"]))
            with self.assertRaises(RuntimeError):
                guard.read_releases(path)

    def test_health_revision_mismatch_refuses_cleanup(self):
        with patch.object(guard.urllib.request, "urlopen") as request:
            request.return_value.__enter__.return_value.read.return_value = b'{"status":"ok","revision":"unexpected"}'
            with self.assertRaises(RuntimeError):
                guard.verify_health(RELEASES[-1])


class CapacityTests(unittest.TestCase):
    def check(self, available, used, threshold=30, maximum=85):
        stats = SimpleNamespace(f_bavail=available, f_bfree=available, f_blocks=used + available, f_frsize=guard.GIB)
        with patch.object(guard.Path, "read_text", return_value="1 0 8:0 / / rw - ext4 disk rw\n"), patch.object(guard.os, "stat", return_value=SimpleNamespace(st_dev=1)), patch.object(guard.os, "statvfs", return_value=stats):
            guard.check_paths(["/", "/var/lib/docker/volumes/db/_data"], threshold, maximum)

    def test_rejects_low_free_space(self):
        with self.assertRaises(RuntimeError):
            self.check(5, 20)

    def test_rejects_high_usage_even_with_absolute_headroom(self):
        with self.assertRaises(RuntimeError):
            self.check(40, 360)

    def test_accepts_expanded_server_capacity(self):
        self.check(95, 93)

    def test_deduplicates_volume_paths_on_same_filesystem(self):
        stats = SimpleNamespace(f_bavail=95, f_bfree=95, f_blocks=188, f_frsize=guard.GIB)
        with patch.object(guard.Path, "read_text", return_value="1 0 8:0 / / rw - ext4 disk rw\n"), patch.object(guard.os, "stat", return_value=SimpleNamespace(st_dev=1)), patch.object(guard.os, "statvfs", return_value=stats) as filesystem:
            guard.check_paths(["/", "/var/lib/docker/volumes/db/_data"], 30, 85)
            self.assertEqual(filesystem.call_count, 1)

    def test_checks_separate_docker_mount(self):
        safe = SimpleNamespace(f_bavail=95, f_bfree=95, f_blocks=188, f_frsize=guard.GIB)
        full = SimpleNamespace(f_bavail=1, f_bfree=1, f_blocks=100, f_frsize=guard.GIB)
        with patch.object(guard.Path, "read_text", return_value="1 0 8:0 / / rw - ext4 disk rw\n2 1 8:1 / /var/lib/docker rw - ext4 disk rw\n"), patch.object(guard.os, "stat", side_effect=lambda path: SimpleNamespace(st_dev=2 if path == "/var/lib/docker" else 1)), patch.object(guard.os, "statvfs", side_effect=lambda path: full if path == "/var/lib/docker" else safe):
            with self.assertRaises(RuntimeError):
                guard.check_paths(["/", "/var/lib/docker/volumes/db/_data"], 30, 85)


class DeploymentWiringTests(unittest.TestCase):
    def test_snapshot_cleanup_follows_successful_restore_verification(self):
        script = (Path(__file__).parents[1] / "scripts/verify-postgres-restore.sh").read_text()
        self.assertLess(script.index('"restorePassed":true'), script.index("-name 'import-pre-release-*.dump'"))
        self.assertIn("-mtime +14 -delete", script)

    def test_dependency_caches_removed_in_same_install_layer(self):
        dockerfile = (Path(__file__).parents[1] / "Dockerfile").read_text()
        for line in dockerfile.splitlines():
            if line.startswith("RUN npm ci"):
                self.assertIn("&& npm cache clean --force", line)
        for stage in ("website-review-runner", "runner"):
            content = dockerfile.split(f"AS {stage}\n", 1)[1].split("\nFROM ", 1)[0]
            self.assertLess(content.index("RUN npm ci"), content.index("ARG RELEASE_SHA"))


if __name__ == "__main__":
    unittest.main()
