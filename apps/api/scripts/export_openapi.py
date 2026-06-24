from __future__ import annotations

import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ["HAN_NOTE_SKIP_DB_ENGINE"] = "1"

from app.main import app


def main() -> None:
    output_path = (
        Path(__file__).resolve().parents[3]
        / "packages"
        / "shared"
        / "openapi"
        / "han-note.openapi.json"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(output_path)


if __name__ == "__main__":
    main()
