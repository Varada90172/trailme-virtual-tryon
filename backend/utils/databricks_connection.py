import os
from dotenv import load_dotenv
from databricks import sql
from databricks.sdk.core import Config, oauth_service_principal

load_dotenv()

connection = None


def get_connection():
    global connection

    if connection is not None:
        return connection

    host = os.getenv("DATABRICKS_SERVER_HOSTNAME") or os.getenv("DATABRICKS_HOST")
    http_path = os.getenv("DATABRICKS_HTTP_PATH")

    if not host:
        raise RuntimeError("Missing Databricks hostname")

    if not http_path:
        raise RuntimeError("Missing DATABRICKS_HTTP_PATH")

    # Option 1: OAuth (Databricks Apps)
    client_id = os.getenv("DATABRICKS_CLIENT_ID")
    client_secret = os.getenv("DATABRICKS_CLIENT_SECRET")

    if client_id and client_secret:
        config = Config(
            host=f"https://{host}",
            client_id=client_id,
            client_secret=client_secret,
        )

        connection = sql.connect(
            server_hostname=host,
            http_path=http_path,
            credentials_provider=lambda: oauth_service_principal(config),
        )

        return connection

    # Option 2: Personal Access Token (fallback)
    token = os.getenv("DATABRICKS_ACCESS_TOKEN") or os.getenv("DATABRICKS_TOKEN")

    if token:
        connection = sql.connect(
            server_hostname=host,
            http_path=http_path,
            access_token=token,
        )
        return connection

    raise RuntimeError(
        "Missing authentication. Configure either "
        "DATABRICKS_CLIENT_ID + DATABRICKS_CLIENT_SECRET "
        "or DATABRICKS_ACCESS_TOKEN."
    )