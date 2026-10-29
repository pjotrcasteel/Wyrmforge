"""Fail before publish if deployable files still contain Git LFS pointers."""
from pathlib import Path


def unresolved_pointers(root):
    return [path for path in root.rglob("*") if path.is_file()
            and path.stat().st_size < 1024
            and path.read_bytes().startswith(b"version https://git-lfs.github.com/spec/v1")]


if __name__ == "__main__":
    root = Path("src/Wyrmforge.Presentation.Web/wwwroot")
    unresolved = unresolved_pointers(root)
    if unresolved:
        raise SystemExit("Unresolved runtime Git LFS assets:\n" + "\n".join(map(str, unresolved)))
    print("Runtime assets contain no unresolved Git LFS pointers.")
