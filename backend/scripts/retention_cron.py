import argparse
import os
import sys
import urllib.request
import urllib.error
import json

def main():
    parser = argparse.ArgumentParser(description="Run the GDPR retention cron job.")
    parser.add_argument(
        "--execute", 
        action="store_true", 
        help="Run in execute mode. If omitted, defaults to dry-run mode."
    )
    args = parser.parse_args()

    token = os.environ.get("RETENTION_CRON_SECRET")
    if not token:
        print("ERROR: RETENTION_CRON_SECRET environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    base_url = os.environ.get("BACKEND_INTERNAL_URL", "http://localhost:8000")
    # Clean trailing slash if present
    base_url = base_url.rstrip("/")
    
    dry_run = "false" if args.execute else "true"
    url = f"{base_url}/api/v1/maintenance/retention?dry_run={dry_run}"

    print(f"Triggering retention job: {url} (mode: {'EXECUTE' if args.execute else 'DRY_RUN'})")

    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            
            print(f"Status Code: {status_code}")
            try:
                # Pretty print JSON if possible
                parsed = json.loads(body)
                print("Response Body:")
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print(f"Response Body: {body}")
                
            if status_code >= 400:
                print("ERROR: Request failed.", file=sys.stderr)
                sys.exit(1)
                
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"HTTPError Status Code: {e.code}", file=sys.stderr)
        print(f"HTTPError Body: {body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"URLError: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
