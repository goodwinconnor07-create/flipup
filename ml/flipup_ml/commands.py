"""Run a shell command with an append-only command log and preserved exit status."""
import datetime
import subprocess
import sys
from . import ROOT

def main():
    command = sys.argv[1]
    log = ROOT / 'ml/out/commands.log'
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open('a') as f:
        f.write(f'\n# {datetime.datetime.now(datetime.timezone.utc).isoformat()} cwd={ROOT}\n{command}\n')
    result = subprocess.run(['bash', '-c', command], cwd=ROOT)
    # Final Git commit/push commands log before staging; writing their exit
    # afterwards would create a new tracked log change after the final commit.
    if '--no-result' not in sys.argv[2:]:
        with log.open('a') as f:
            f.write(f'# exit={result.returncode}\n')
    raise SystemExit(result.returncode)

if __name__ == '__main__':
    main()
