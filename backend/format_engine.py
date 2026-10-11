import os
import sys

import uvicorn


def main() -> None:
    port = int(os.environ.get("FORMAT_PORT", "8490"))
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--port" and i + 2 <= len(sys.argv[1:]):
            port = int(sys.argv[i + 2])
    from app.main import app
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
