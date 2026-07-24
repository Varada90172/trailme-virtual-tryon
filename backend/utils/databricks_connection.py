import os
from dotenv import load_dotenv
from databricks import sql

load_dotenv()

connection = None

def get_connection():
    global connection

    if connection is None:
        host = os.getenv("DATABRICKS_SERVER_HOSTNAME") or os.getenv("DATABRICKS_HOST")
        http_path = os.getenv("DATABRICKS_HTTP_PATH")
        token = os.getenv("DATABRICKS_ACCESS_TOKEN") or os.getenv("DATABRICKS_TOKEN")

        if not host:
            raise RuntimeError("Missing Databricks hostname")

        if not http_path:
            raise RuntimeError("Missing DATABRICKS_HTTP_PATH")

        if not token:
            raise RuntimeError("Missing DATABRICKS_ACCESS_TOKEN")

        connection = sql.connect(
            server_hostname=host,
            http_path=http_path,
            access_token=token,
        )

    return connection