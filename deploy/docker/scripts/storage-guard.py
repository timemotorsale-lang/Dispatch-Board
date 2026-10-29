#!/usr/bin/env python3
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request


REPOSITORIES = {"dispatch-board-app", "dispatch-board-tooling", "dispatch-board-website-review"}
REVISION = re.compile(r"[a-f0-9]{40}")
GIB = 1024 ** 3


def run(command):
    return subprocess.check_output(command, text=True).strip()


def docker_prefix():
    for prefix in (["docker"], ["sudo", "-n", "docker"]):
        if subprocess.run(prefix + ["info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
            return prefix
    raise RuntimeError("Docker access unavailable; no cleanup performed.")


def check_paths(paths, minimum_free_gib, max_used_percent):
    mounts = [line.split()[4].replace("\\040", " ") for line in Path("/proc/self/mountinfo").read_text().splitlines()]
    devices = set()
    failed = False
    for path in paths:
        absolute = os.path.abspath(path)
        path = max((mount for mount in mounts if mount == "/" or absolute == mount or absolute.startswith(mount.rstrip("/") + "/")), key=len)
        device = os.stat(path).st_dev
        if device in devices:
            continue
        devices.add(device)
        stats = os.statvfs(path)
        available = stats.f_bavail * stats.f_frsize
        used = stats.f_blocks - stats.f_bfree
        denominator = used + stats.f_bavail
        percent = 100 * used / denominator if denominator else 100
        print(f"Storage {path}: {available / GIB:.1f} GiB available, {percent:.1f}% used")
        if percent >= 75:
            print(f"WARNING: storage usage is {percent:.1f}% at {path}", file=sys.stderr)
        if available < minimum_free_gib * GIB or percent >= max_used_percent:
            failed = True
    if failed:
        raise RuntimeError("Insufficient deployment headroom. No automatic data or image deletion attempted.")


def read_releases(path):
    if not path.exists():
        return []
    releases = json.loads(path.read_text())
    if not isinstance(releases, list) or any(not isinstance(value, str) or not REVISION.fullmatch(value) for value in releases):
        raise RuntimeError("Invalid release ledger; refusing cleanup.")
    return list(dict.fromkeys(releases))


def record_releases(path, releases, previous, current):
    for revision in (previous, current):
        if revision in releases:
            releases.remove(revision)
        releases.append(revision)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(releases) + "\n")
    os.chmod(temporary, 0o600)
    temporary.replace(path)


def cleanup_candidates(images, container_images, releases, current, now):
    protected_releases = set(releases[-3:]) | {current}
    protected_images = set(container_images)
    for image in images:
        for tag in image.get("RepoTags") or []:
            repository, separator, revision = tag.rpartition(":")
            if separator and repository in REPOSITORIES and revision in protected_releases:
                protected_images.add(image["Id"])
    candidates = []
    for image in images:
        if image["Id"] in protected_images:
            continue
        created = datetime.datetime.fromisoformat(image["Created"].replace("Z", "+00:00"))
        if now - created < datetime.timedelta(days=7):
            continue
        for tag in image.get("RepoTags") or []:
            repository, separator, revision = tag.rpartition(":")
            if separator and repository in REPOSITORIES and REVISION.fullmatch(revision) and revision in releases and revision not in protected_releases:
                candidates.append(tag)
    return sorted(set(candidates))


def verify_health(current):
    with urllib.request.urlopen("http://127.0.0.1:3000/api/health", timeout=15) as response:
        health = json.load(response)
    if health.get("status") != "ok" or health.get("revision") != current:
        raise RuntimeError("Current release is not healthy; refusing retention changes.")


def main():
    parser = argparse.ArgumentParser(description="Deployment capacity and conservative release retention")
    parser.add_argument("mode", choices=["check", "plan", "maintain"])
    parser.add_argument("--revision")
    parser.add_argument("--previous-revision")
    parser.add_argument("--minimum-free-gib", type=int, default=30)
    parser.add_argument("--max-used-percent", type=int, default=85)
    parser.add_argument("--state", type=Path, default=Path.home() / ".local/state/dispatch-board-storage/releases.json")
    args = parser.parse_args()
    if args.minimum_free_gib < 1 or not 1 <= args.max_used_percent <= 100:
        parser.error("Storage thresholds must be positive and percentages at most 100.")
    prefix = docker_prefix()
    docker_root = run(prefix + ["info", "--format", "{{.DockerRootDir}}"])
    paths = ["/", ".", docker_root]
    if Path("/var/lib/containerd").exists():
        paths.append("/var/lib/containerd")
    volume_ids = run(prefix + ["volume", "ls", "--filter", "label=com.docker.compose.project=dispatch-board", "-q"]).splitlines()
    if volume_ids:
        volumes = json.loads(run(prefix + ["volume", "inspect", *volume_ids]))
        paths.extend(volume["Mountpoint"] for volume in volumes)
    check_paths(paths, args.minimum_free_gib, args.max_used_percent)
    if args.mode == "check":
        return
    if not args.revision or not REVISION.fullmatch(args.revision):
        parser.error("A full current release SHA is required.")
    if args.mode == "maintain" and (not args.previous_revision or not REVISION.fullmatch(args.previous_revision)):
        parser.error("A full previously healthy release SHA is required for maintenance.")
    import fcntl
    args.state.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with args.state.with_suffix(".lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        releases = read_releases(args.state)
        if args.mode == "maintain":
            verify_health(args.revision)
            record_releases(args.state, releases, args.previous_revision, args.revision)
        image_ids = run(prefix + ["image", "ls", "--quiet", "--no-trunc"]).splitlines()
        images = json.loads(run(prefix + ["image", "inspect", *sorted(set(image_ids))])) if image_ids else []
        container_ids = run(prefix + ["ps", "--all", "--quiet"]).splitlines()
        containers = json.loads(run(prefix + ["container", "inspect", *container_ids])) if container_ids else []
        candidates = cleanup_candidates(images, {container["Image"] for container in containers}, releases, args.revision, datetime.datetime.now(datetime.timezone.utc))
        print("Legacy releases absent from the verified ledger are preserved for manual review.")
        for tag in candidates:
            print(f"{'Removing' if args.mode == 'maintain' else 'Would remove'} verified expired release tag: {tag}")
            if args.mode == "maintain":
                run(prefix + ["image", "rm", tag])
        if args.mode == "maintain":
            print(run(prefix + ["builder", "prune", "--all", "--force", "--keep-storage", "6GB"]))
            check_paths(paths, args.minimum_free_gib, args.max_used_percent)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Storage guard failed: {error}", file=sys.stderr)
        sys.exit(1)
